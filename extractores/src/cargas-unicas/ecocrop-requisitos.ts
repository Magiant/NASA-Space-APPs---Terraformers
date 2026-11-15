// Tema 10 · Requisitos de cada cultivo desde EcoCrop (CSV de OpenCLIM) → tabla `requisitos_cultivo`. UNA VEZ.
// Solo para los cultivos que ya existen en la tabla `cultivos` (tema 5): se reciben como entrada.
import type { Cultivo, RequisitoCultivo } from '../../../packages/compartido/src/esquemas/datos.ts'
import { pedir } from '../humedad/utilidades.ts'

export const TABLA = 'requisitos_cultivo'
export const FUENTE = 'ecocrop'
const URL_CSV = 'https://raw.githubusercontent.com/OpenCLIM/ecocrop/main/EcoCrop_DB.csv'

/** CSV con comillas (RFC 4180): los nombres comunes traen comas. */
export function leerCsv(texto: string): Record<string, string>[] {
  const filas: string[][] = []
  let fila: string[] = [], campo = '', comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === ',') { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo); filas.push(fila); fila = []; campo = ''
    } else campo += c
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila) }
  const [encabezado, ...resto] = filas
  return resto.filter((f) => f.length > 1).map((f) => Object.fromEntries(encabezado!.map((h, i) => [h, f[i] ?? ''])))
}

/** "Solanum tuberosum L." → "solanum tuberosum": género + especie, para comparar nombres científicos. */
export const especie = (nombre: string | null | undefined) =>
  (nombre ?? '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).join(' ')

const numero = (v: string | undefined) => {
  const n = Number.parseFloat(v ?? '')
  return Number.isFinite(n) ? n : null
}
const lista = (v: string | undefined) => (v ?? '').split(',').map((s) => s.trim()).filter((s) => s && s !== 'NA')

const TEXTURAS: Record<string, string> = { heavy: 'pesada', medium: 'media', light: 'ligera', organic: 'organica', wide: 'amplia' }
const DRENAJE: Array<[RegExp, string]> = [[/poorly/, 'pobre'], [/well/, 'bueno'], [/excessive/, 'excesivo']]
const PROFUNDIDAD: Array<[RegExp, string]> = [[/^shallow/, 'poco profundo (20-50 cm)'], [/^medium/, 'medio (50-150 cm)'], [/^deep/, 'profundo (>150 cm)']]

/**
 * Fila de requisitos a partir de una fila de EcoCrop. Regla ECO-01: texturas, drenaje y profundidad
 * usan el rango ABSOLUTO (TEXTR, DRAR, DEPR), porque la tabla es el filtro de lo que se puede sembrar.
 */
export function aFila(cultivoId: string, e: Record<string, string>): RequisitoCultivo {
  const drenaje = DRENAJE.filter(([re]) => lista(e.DRAR).some((d) => re.test(d))).map(([, es]) => es)
  const prof = lista(e.DEPR)[0]
  return {
    cultivo_id: cultivoId,
    temp_opt_min_c: numero(e.TOPMN), temp_opt_max_c: numero(e.TOPMX),
    temp_abs_min_c: numero(e.TMIN), temp_abs_max_c: numero(e.TMAX),
    lluvia_opt_min_mm: numero(e.ROPMN), lluvia_opt_max_mm: numero(e.ROPMX),
    lluvia_abs_min_mm: numero(e.RMIN), lluvia_abs_max_mm: numero(e.RMAX),
    ph_opt_min: numero(e.PHOPMN), ph_opt_max: numero(e.PHOPMX),
    ph_abs_min: numero(e.PHMIN), ph_abs_max: numero(e.PHMAX),
    altitud_max_m: numero(e.ALTMX),
    texturas: lista(e.TEXTR).length ? lista(e.TEXTR).map((t) => TEXTURAS[t] ?? t) : null,
    drenaje: drenaje.length ? drenaje.join(', ') : null,
    profundidad_suelo: prof ? (PROFUNDIDAD.find(([re]) => re.test(prof))?.[1] ?? prof) : null,
    fuente: FUENTE,
  }
}

/**
 * Une cada cultivo con su fila de EcoCrop: por ecocrop_id, luego por nombre científico completo
 * (así "Zea mays ssp. saccharata" no recibe los datos de "Zea mays"), y por último por género + especie.
 */
export function unir(cultivos: Cultivo[], ecocrop: Record<string, string>[]) {
  const completo = (n: string | null | undefined) => (n ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
  const porCodigo = new Map(ecocrop.map((e) => [e.EcoPortCode, e]))
  const porNombre = new Map(ecocrop.map((e) => [completo(e.ScientificName), e]))
  const porEspecie = new Map<string, Record<string, string>>()
  for (const e of ecocrop) if (!porEspecie.has(especie(e.ScientificName))) porEspecie.set(especie(e.ScientificName), e)
  const filas: RequisitoCultivo[] = []
  const sinPareja: string[] = []
  for (const c of cultivos) {
    const e = (c.ecocrop_id && porCodigo.get(c.ecocrop_id)) || porNombre.get(completo(c.nombre_cientifico)) || porEspecie.get(especie(c.nombre_cientifico))
    if (e) filas.push(aFila(c.id, e))
    else sinPareja.push(c.id)
  }
  return { filas, sinPareja }
}

export async function extraerRequisitos(cultivos: Cultivo[]): Promise<RequisitoCultivo[]> {
  const { filas, sinPareja } = unir(cultivos, leerCsv(await (await pedir(URL_CSV)).text()))
  if (sinPareja.length) console.warn(`Sin pareja en EcoCrop (${sinPareja.length}):`, sinPareja.join(', '))
  return filas
}
