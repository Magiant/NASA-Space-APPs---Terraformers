// Tema 4 · Sumas y promedios por semana y por mes (funciones puras, sin red ni base).
//   semana = lunes a domingo; `periodo` = fecha del lunes.
//   mes    = `periodo` = día 1 del mes.
import type { AguaZona } from '@terraformes/compartido'

export type TipoPeriodo = 'semana' | 'mes'

/** Lunes (AAAA-MM-DD) de la semana de una fecha. */
export function lunesDe(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  const dia = (d.getUTCDay() + 6) % 7 // lunes = 0 … domingo = 6
  d.setUTCDate(d.getUTCDate() - dia)
  return d.toISOString().slice(0, 10)
}

export const primerDiaMes = (fecha: string) => `${fecha.slice(0, 7)}-01`
export const periodoDe = (fecha: string, tipo: TipoPeriodo) => (tipo === 'semana' ? lunesDe(fecha) : primerDiaMes(fecha))

/**
 * Primer periodo que cabe ENTERO a partir de `desde`: si `desde` no es lunes (semana) o día 1 (mes),
 * el periodo siguiente. Sirve para no guardar sumas parciales del borde de la ventana leída, que
 * pisarían con el upsert un valor completo ya guardado.
 */
export function inicioPeriodoCompleto(desde: string, tipo: TipoPeriodo): string {
  const inicio = periodoDe(desde, tipo)
  if (inicio === desde) return desde
  const d = new Date(`${inicio}T12:00:00Z`)
  if (tipo === 'semana') d.setUTCDate(d.getUTCDate() + 7)
  else d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().slice(0, 10)
}

/** Días de un periodo (7 la semana; 28–31 el mes). */
export function diasDelPeriodo(periodo: string, tipo: TipoPeriodo): number {
  if (tipo === 'semana') return 7
  const [a, m] = periodo.split('-').map(Number)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

const redondear = (x: number | null, dec = 2) => (x === null ? null : Math.round(x * 10 ** dec) / 10 ** dec)
const sumar = (xs: Array<number | null | undefined>) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}
const promediar = (xs: Array<number | null | undefined>) => {
  const v = xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

/**
 * Balance (regla del PDF): lluvia − ET real si hay ET real; si no, lluvia − ET0.
 * Si falta la lluvia o las dos evapotranspiraciones → null.
 */
export function balance(lluvia: number | null, etReal: number | null, et0: number | null): number | null {
  if (lluvia === null) return null
  const et = etReal ?? et0
  return et === null ? null : redondear(lluvia - et)
}

export interface DiaClima { codigo_distrito: string; fecha: string; lluvia_mm: number | null; evapotranspiracion_ref_mm: number | null }

/** ET real y ESI ya agregados de ECOSTRESS, para usar en el balance (clave `codigo|periodo|tipo`). */
export type EtRealPorPeriodo = Map<string, number | null>
export const claveAgua = (codigo: string, periodo: string, tipo: TipoPeriodo) => `${codigo}|${periodo}|${tipo}`

/**
 * Suma lluvia y ET0 diarias por distrito y periodo → filas de agua_zona.
 * La ET real (ECOSTRESS) entra solo al balance; la fila guarda la ET real que sí le pertenece
 * únicamente en la fuente 'ecostress'.
 */
export function agregarClima(dias: DiaClima[], tipo: TipoPeriodo, fuente: string, etReal: EtRealPorPeriodo = new Map()): AguaZona[] {
  const grupos = new Map<string, DiaClima[]>()
  for (const d of dias) {
    const k = claveAgua(d.codigo_distrito, periodoDe(d.fecha, tipo), tipo)
    const g = grupos.get(k)
    if (g) g.push(d)
    else grupos.set(k, [d])
  }
  return [...grupos].map(([k, g]) => {
    const [codigo_distrito, periodo] = k.split('|')
    const lluvia = redondear(sumar(g.map((d) => d.lluvia_mm)), 1)
    const et0 = redondear(sumar(g.map((d) => d.evapotranspiracion_ref_mm)), 1)
    return {
      codigo_distrito, periodo, tipo_periodo: tipo, fuente,
      lluvia_mm: lluvia,
      evapotranspiracion_ref_mm: et0,
      evapotranspiracion_real_mm: null,
      balance_mm: balance(lluvia, etReal.get(k) ?? null, et0),
      estres_hidrico_esi: null,
    }
  })
}

export interface ObsEcostress { codigo_distrito: string; fecha: string; et_mm_dia: number | null; esi: number | null }

/**
 * ECOSTRESS → filas de agua_zona (fuente 'ecostress'). No hay dato todos los días: se promedian las
 * observaciones del periodo. ET del periodo = ET diaria media × días del periodo (para comparar con la
 * lluvia sumada). Sin observaciones → no hay fila (sin dato = null, nunca 0).
 */
export function agregarEcostress(obs: ObsEcostress[], tipo: TipoPeriodo): AguaZona[] {
  const grupos = new Map<string, ObsEcostress[]>()
  for (const o of obs) {
    const k = claveAgua(o.codigo_distrito, periodoDe(o.fecha, tipo), tipo)
    const g = grupos.get(k)
    if (g) g.push(o)
    else grupos.set(k, [o])
  }
  const filas: AguaZona[] = []
  for (const [k, g] of grupos) {
    const [codigo_distrito, periodo] = k.split('|')
    const etDia = promediar(g.map((o) => o.et_mm_dia))
    const esi = promediar(g.map((o) => o.esi))
    if (etDia === null && esi === null) continue
    filas.push({
      codigo_distrito, periodo, tipo_periodo: tipo, fuente: 'ecostress',
      lluvia_mm: null, evapotranspiracion_ref_mm: null,
      evapotranspiracion_real_mm: etDia === null ? null : redondear(etDia * diasDelPeriodo(periodo, tipo), 1),
      balance_mm: null,
      estres_hidrico_esi: redondear(esi, 3),
    })
  }
  return filas
}
