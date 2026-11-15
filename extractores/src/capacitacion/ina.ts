import { readFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';
import { leerCsv } from './csv.ts';
import type { Argumentos } from '../comun/argumentos.ts';
import { Capacitacion, TABLAS } from '@terraformes/compartido';

export const COLUMNAS = [
  'institucion', 'titulo', 'tema', 'cultivo_id', 'modalidad',
  'duracion_horas', 'provincias', 'url',
] as const;
export const TAMANO_LOTE = 250;

// Lista explícita: nunca enviar id, extraido_en ni columnas de otros temas.
export const Esquema = Capacitacion.pick({
  institucion: true, titulo: true, tema: true, cultivo_id: true,
  modalidad: true, duracion_horas: true, provincias: true, url: true,
}).superRefine((fila, ctx) => {
  const error = (campo: string, mensaje: string) =>
    ctx.addIssue({ code: 'custom', path: [campo], message: mensaje });
  if (fila.institucion !== 'INA') error('institucion', 'Este cargador corresponde al INA');
  if (fila.duracion_horas !== null && fila.duracion_horas <= 0)
    error('duracion_horas', 'Debe ser positiva o null');
  if (fila.provincias?.some(codigo => !/^CR[1-7]$/.test(codigo)))
    error('provincias', 'Usar códigos de provincia CR1 a CR7 separados por |');
  try {
    const url = new URL(fila.url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
      error('url', 'Se requiere un enlace HTTP(S) público sin credenciales');
    // La página general sin ancla no identifica un curso (todas las filas tendrían la misma llave).
    // Con ancla (#subsector-tipo-curso) apunta a la página oficial donde aparece ese curso y es única:
    // es lo que genera el extractor web (ina-web.ts), porque el INA no publica un enlace por curso.
    if (url.hostname.endsWith('ina.ac.cr') && !url.hash &&
        url.pathname.toLowerCase() === '/sitepages/nucleos/agropecuario.aspx')
      error('url', 'La página general no identifica un curso; usar su enlace individual o la página con #ancla del curso');
  } catch { error('url', 'URL inválida'); }
});

export type Fila = Capacitacion;
export type Resultado = { estado: 'ok' | 'sin_cambios' | 'error'; registros: number; mensaje: string };
export interface Destino {
  iniciar(): Promise<number>;
  /** Devuelve cuáles de esos ids existen en `cultivos`. */
  cultivosExistentes(ids: string[]): Promise<string[]>;
  upsert(filas: Fila[], clave: string): Promise<void>;
  finalizar(id: number, resultado: Resultado): Promise<void>;
}

function texto(valor: string): string | null {
  const limpio = valor.trim().normalize('NFC');
  return ['', 'null', 'sin dato', '-999'].includes(limpio.toLowerCase()) ? null : limpio;
}

/** No se deduce modalidad, ubicación ni cultivo a partir de títulos ambiguos. */
export function normalizarCsv(contenido: string): Fila[] {
  const [cabecera, ...datos] = leerCsv(contenido);
  if (!cabecera) throw new Error('CSV vacío: falta la cabecera');
  if (cabecera.length !== COLUMNAS.length || new Set(cabecera).size !== COLUMNAS.length || COLUMNAS.some(c => !cabecera.includes(c)))
    throw new Error('Cabecera incorrecta. Columnas: ' + COLUMNAS.join(','));
  const registros = datos.map((fila, i) => {
    if (fila.length !== cabecera.length) throw new Error('CSV: número de columnas incorrecto en fila ' + (i + 2));
    return Object.fromEntries(cabecera.map((c, j) => [c, fila[j]])) as Record<(typeof COLUMNAS)[number], string>;
  });
  const normalizados = registros.map(registro => {
    const horas = texto(registro.duracion_horas);
    const provincias = texto(registro.provincias);
    return {
      institucion: texto(registro.institucion) ?? 'INA',
      titulo: texto(registro.titulo) ?? '',
      tema: texto(registro.tema),
      cultivo_id: texto(registro.cultivo_id)?.toLowerCase() ?? null,
      modalidad: texto(registro.modalidad)?.toLowerCase() ?? null,
      // Los textos mal escritos deben fallar, no convertirse silenciosamente a null.
      duracion_horas: horas === null ? null : /^\d+(?:[.,]\d+)?$/.test(horas)
        ? Number(horas.replace(',', '.')) : horas,
      provincias: provincias === null ? null : [...new Set(provincias.split('|').map(p => p.trim().toUpperCase()))],
      url: texto(registro.url) ?? '',
    };
  });
  // Validar el archivo completo ANTES del primer upsert, incluso si hay varios lotes.
  const filas = Esquema.array().parse(normalizados);
  const urls = new Set<string>();
  for (const fila of filas) {
    fila.url = new URL(fila.url).href;
    if (urls.has(fila.url)) throw new Error(`URL repetida en CSV: ${fila.url}`);
    urls.add(fila.url);
  }
  return filas;
}

export function validarEnlacesReales(filas: Fila[]): void {
  for (const fila of filas) {
    const host = new URL(fila.url).hostname;
    if (host === 'localhost' || /(^|\.)(invalid|test|example|localhost)$/.test(host) ||
        /(^|\.)example\.(com|org|net)$/.test(host))
      throw new Error('Los enlaces de ejemplo solo se permiten en --simulacion');
  }
}

/** Carga desde CSV revisado (uso manual). */
export async function cargarIna(
  leer: () => Promise<string>, destino: Destino,
  pausa: (ms: number) => Promise<unknown> = esperar,
): Promise<Resultado> {
  return cargarFilasIna(async () => normalizarCsv(await leer()), destino, pausa);
}

/**
 * Carga filas ya validadas (las usa el CSV y el extractor web).
 * Un `cultivo_id` que todavía no existe en `cultivos` (p. ej. si el tema 5 no se ha cargado) no
 * bloquea la carga: esa fila se guarda con cultivo_id = null y se avisa cuáles faltaron.
 */
export async function cargarFilasIna(
  obtener: () => Promise<Fila[]>, destino: Destino,
  pausa: (ms: number) => Promise<unknown> = esperar,
): Promise<Resultado> {
  // Si no se puede iniciar la auditoría, no se escriben capacitaciones.
  const id = await destino.iniciar();
  let registros = 0;
  try {
    const filas = await obtener();
    validarEnlacesReales(filas);
    const cultivos = [...new Set(filas.flatMap(fila => fila.cultivo_id ? [fila.cultivo_id] : []))];
    const existentes = new Set(cultivos.length ? await destino.cultivosExistentes(cultivos) : []);
    const faltantes = cultivos.filter(c => !existentes.has(c));
    if (faltantes.length) {
      console.warn(`⚠ cultivo_id sin fila en cultivos (se guardan como null): ${faltantes.join(', ')}`);
      for (const fila of filas) if (fila.cultivo_id && !existentes.has(fila.cultivo_id)) fila.cultivo_id = null;
    }
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      if (i > 0) await pausa(500);
      const lote = filas.slice(i, i + TAMANO_LOTE);
      await destino.upsert(lote, TABLAS.capacitaciones.claveUnica);
      registros += lote.length;
    }
    const resultado: Resultado = {
      estado: registros ? 'ok' : 'sin_cambios', registros,
      mensaje: (registros ? 'Filas validadas; upsert por url completado' : 'Sin registros para cargar') +
        (faltantes.length ? `. cultivo_id sin fila en cultivos (guardados como null): ${faltantes.join(', ')}` : ''),
    };
    await destino.finalizar(id, resultado);
    return resultado;
  } catch (error) {
    // No registrar respuestas crudas de red: podrían incluir datos de conexión.
    const mensaje = mensajeSeguro(error);
    try { await destino.finalizar(id, { estado: 'error', registros, mensaje }); }
    catch { throw new Error(`${mensaje}. Además, no fue posible cerrar extracciones (id ${id}); revisar en_curso.`); }
    throw new Error(mensaje);
  }
}

export function mensajeSeguro(error: unknown): string {
  let mensaje = error instanceof Error ? error.message : 'Error desconocido';
  for (const secreto of [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL])
    if (secreto) mensaje = mensaje.replaceAll(secreto, '[oculto]');
  return mensaje.slice(0, 2000);
}

export async function ejecutarIna(ruta: string, dryRun = true): Promise<void> {
  if (dryRun) {
    const filas = normalizarCsv(await readFile(ruta, 'utf8'));
    console.log(JSON.stringify({ modo: 'simulacion', registros: filas.length, filas }, null, 2));
    return;
  }
  const { crearDestino } = await import('./supabase.ts');
  console.log(await cargarIna(() => readFile(ruta, 'utf8'), crearDestino()));
}

/** Mismo CLI que los demás extractores; rutas relativas a extractores/. */
export async function extraerIna(args: Argumentos): Promise<void> {
  if (args.distritos?.length || args.distritosArchivo) throw new Error('Capacitaciones no tiene distritos: usar una muestra de cursos');
  await ejecutarIna(args.archivo ?? '../docs/capacitacion/plantilla.csv', args.simulacion);
}
