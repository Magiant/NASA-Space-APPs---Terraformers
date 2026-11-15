import { readFile } from 'node:fs/promises';
import { setTimeout as esperar } from 'node:timers/promises';
import { parse } from 'csv-parse/sync';
import { Capacitacion, TABLAS } from '@terraformes/compartido/esquemas/datos';

export const COLUMNAS = [
  'institucion', 'titulo', 'tema', 'cultivo_id', 'modalidad',
  'duracion_horas', 'provincias', 'url',
] as const;
export const TAMANO_LOTE = 250;

// Lista explícita: nunca enviar id, extraido_en ni columnas de otros temas.
const Esquema = Capacitacion.pick({
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
    if (url.hostname.endsWith('ina.ac.cr') &&
        url.pathname.toLowerCase() === '/sitepages/nucleos/agropecuario.aspx')
      error('url', 'La página general no identifica un curso; usar su enlace individual verificado');
  } catch { error('url', 'URL inválida'); }
});

export type Fila = Capacitacion;
export type Resultado = { estado: 'ok' | 'sin_cambios' | 'error'; registros: number; mensaje: string };
export interface Destino {
  iniciar(): Promise<number>;
  comprobarCultivos(ids: string[]): Promise<void>;
  upsert(filas: Fila[], clave: string): Promise<void>;
  finalizar(id: number, resultado: Resultado): Promise<void>;
}

function texto(valor: string): string | null {
  const limpio = valor.trim().normalize('NFC');
  return ['', 'null', 'sin dato', '-999'].includes(limpio.toLowerCase()) ? null : limpio;
}

/** No se deduce modalidad, ubicación ni cultivo a partir de títulos ambiguos. */
export function normalizarCsv(contenido: string): Fila[] {
  let cabeceraVista = false;
  const registros = parse(contenido, {
    bom: true, trim: true, skip_empty_lines: true,
    columns: (cabecera: string[]) => {
      cabeceraVista = true;
      if (cabecera.length !== COLUMNAS.length || new Set(cabecera).size !== COLUMNAS.length ||
          COLUMNAS.some(columna => !cabecera.includes(columna)))
        throw new Error(`Cabecera incorrecta. Columnas: ${COLUMNAS.join(',')}`);
      return cabecera;
    },
  }) as Record<(typeof COLUMNAS)[number], string>[];
  if (!cabeceraVista) throw new Error('CSV vacío: falta la cabecera');
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
      throw new Error('Los enlaces de ejemplo solo se permiten en --dry-run');
  }
}

export async function cargarIna(
  leer: () => Promise<string>, destino: Destino,
  pausa: (ms: number) => Promise<unknown> = esperar,
): Promise<Resultado> {
  // Si no se puede iniciar la auditoría, no se escriben capacitaciones.
  const id = await destino.iniciar();
  let registros = 0;
  try {
    const filas = normalizarCsv(await leer());
    validarEnlacesReales(filas);
    const cultivos = [...new Set(filas.flatMap(fila => fila.cultivo_id ? [fila.cultivo_id] : []))];
    await destino.comprobarCultivos(cultivos);
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      if (i > 0) await pausa(500);
      const lote = filas.slice(i, i + TAMANO_LOTE);
      await destino.upsert(lote, TABLAS.capacitaciones.claveUnica);
      registros += lote.length;
    }
    const resultado: Resultado = {
      estado: registros ? 'ok' : 'sin_cambios', registros,
      mensaje: registros ? 'CSV validado; upsert por url completado' : 'CSV con cabecera y sin registros',
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
  for (const secreto of [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_URL])
    if (secreto) mensaje = mensaje.replaceAll(secreto, '[oculto]');
  return mensaje.slice(0, 2000);
}

export async function ejecutarIna(ruta: string, dryRun = true): Promise<void> {
  if (dryRun) {
    const filas = normalizarCsv(await readFile(ruta, 'utf8'));
    console.log(JSON.stringify({ modo: 'dry-run', registros: filas.length, filas }, null, 2));
    return;
  }
  const { crearDestino } = await import('./supabase.js');
  console.log(await cargarIna(() => readFile(ruta, 'utf8'), crearDestino()));
}
