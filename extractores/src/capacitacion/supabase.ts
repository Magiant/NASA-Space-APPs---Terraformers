import { createClient } from '@supabase/supabase-js';
import { setTimeout as esperar } from 'node:timers/promises';
import type { Destino } from './ina.ts';

/** Retries solo para lecturas y escrituras idempotentes. Respeta Retry-After. */
export function fetchConReintentos(
  fetchOriginal: typeof fetch = fetch,
  pausa: (ms: number) => Promise<unknown> = esperar,
): typeof fetch {
  return async (input, init) => {
    const metodo = (init?.method ?? 'GET').toUpperCase();
    const prefer = new Headers(init?.headers).get('prefer') ?? '';
    const idempotente = ['GET', 'HEAD', 'PATCH'].includes(metodo) ||
      (metodo === 'POST' && prefer.includes('resolution=merge-duplicates'));
    for (let intento = 0; ; intento++) {
      let respuesta: Response;
      try {
        const timeout = AbortSignal.timeout(30_000);
        const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
        respuesta = await fetchOriginal(input, { ...init, signal });
      } catch {
        if (!idempotente || intento >= 3 || init?.signal?.aborted)
          throw new Error('Fallo de conexión a Supabase; operación no confirmada');
        await pausa(1000 * 2 ** intento);
        continue;
      }
      if (!idempotente || intento >= 3 || ![408, 429, 500, 502, 503, 504].includes(respuesta.status))
        return respuesta;
      const retryAfter = respuesta.headers.get('retry-after');
      const indicado = retryAfter === null ? 0 : /^\d+(?:\.\d+)?$/.test(retryAfter)
        ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now());
      const ms = Math.max(1000 * 2 ** intento, Number.isFinite(indicado) ? indicado : 0);
      await respuesta.body?.cancel();
      // No adelantarse al servidor si exige una espera larga; fallar y reejecutar luego.
      if (ms > 60_000) throw new Error('Supabase exige esperar más de 60 segundos; reintentar la ejecución después');
      await pausa(ms);
    }
  };
}

/** `fuente` es el nombre de la corrida en `extracciones` ('ina-csv' para el CSV, 'ina-web' para la página). */
export function crearDestino(fuente = 'ina-csv'): Destino {
  // SUPABASE_URL es el nombre del PDF; VITE_SUPABASE_URL se acepta como en el resto de extractores.
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL (o VITE_SUPABASE_URL) o SUPABASE_SERVICE_ROLE_KEY');
  const cliente = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchConReintentos() },
  });
  const comprobar = (error: { code?: string } | null, operacion: string) => {
    if (error) throw new Error(`Supabase: ${operacion} falló (código ${error.code || 'red'})`);
  };
  return {
    async iniciar() {
      // No reintentar INSERT: si se pierde la respuesta podría duplicarse el registro.
      const { data, error } = await cliente.from('extracciones').insert({
        fuente, inicio: new Date().toISOString(), estado: 'en_curso', registros: 0,
      }).select('id').single();
      comprobar(error, 'iniciar extracciones');
      if (!data) throw new Error('Supabase no devolvió el id de extracciones');
      return data.id as number;
    },
    async cultivosExistentes(ids) {
      const encontrados: string[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        if (i > 0) await esperar(500);
        const { data, error } = await cliente.from('cultivos').select('id').in('id', ids.slice(i, i + 100));
        comprobar(error, 'consultar cultivos');
        encontrados.push(...(data ?? []).map(fila => fila.id as string));
      }
      return encontrados;
    },
    async upsert(filas, clave) {
      const { error } = await cliente.from('capacitaciones').upsert(filas, { onConflict: clave });
      comprobar(error, 'upsert capacitaciones');
    },
    async finalizar(id, resultado) {
      const { data, error } = await cliente.from('extracciones').update({
        ...resultado, fin: new Date().toISOString(),
      }).eq('id', id).select('id').single();
      comprobar(error, 'finalizar extracciones');
      if (!data) throw new Error('No se encontró el registro de extracciones para finalizar');
    },
  };
}
