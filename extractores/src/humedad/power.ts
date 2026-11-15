// Tema 2 · Índice de humedad del suelo de NASA POWER → tabla `humedad_suelo`, fuente 'nasa-power'. SEMANAL.
// GWETTOP (superficie), GWETROOT (raíz), GWETPROF (perfil): fracción 0–1 → columna humedad_relativa.
import type { Distrito, HumedadSuelo } from '../../../packages/compartido/src/esquemas/datos.ts'
import { esperar, haceDias, pedir, promedio, puntosDelDistrito } from './utilidades.ts'

export const TABLA = 'humedad_suelo'
export const FUENTE = 'nasa-power'

const URL_BASE = 'https://power.larc.nasa.gov/api/temporal/daily/point'
const PARAMETROS = { GWETTOP: 'superficie', GWETROOT: 'raiz', GWETPROF: 'perfil' } as const
const PAUSA_MS = 1_000

type Serie = Record<keyof typeof PARAMETROS, Record<string, number>>

/**
 * POWER entrega un valor por celda de 0,5° × 0,625°: todos los puntos de un distrito que caen en la
 * misma celda dan el mismo número. Se consulta cada celda una vez (≈ 30 para todo el país) y
 * n_puntos = celdas distintas promediadas (regla POW-01).
 */
export function celda(lat: number, lng: number) {
  return { lat: Math.round(lat / 0.5) * 0.5, lng: Math.round(lng / 0.625) * 0.625 }
}
const clave = (c: { lat: number; lng: number }) => `${c.lat},${c.lng}`

/** Filas de un distrito a partir de las series de sus celdas. Puro; -999 se ignora; días sin dato se omiten. */
export function aFilas(codigo: string, series: Serie[]): HumedadSuelo[] {
  const fechas = [...new Set(series.flatMap((s) => Object.keys(s.GWETTOP ?? {})))].sort()
  const filas: HumedadSuelo[] = []
  for (const f of fechas)
    for (const [param, profundidad] of Object.entries(PARAMETROS) as [keyof Serie, string][]) {
      const p = promedio(series.map((s) => s[param]?.[f]))
      if (p.valor === null) continue
      filas.push({
        codigo_distrito: codigo,
        fecha: `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`,
        fuente: FUENTE, profundidad,
        humedad_m3_m3: null,
        humedad_relativa: p.valor,
        percentil_sequia: null,
        temp_suelo_c: null,
        n_puntos: p.n,
      })
    }
  return filas
}

/** Últimos `dias` días de todos los distritos. POWER publica con ≈ 3 días de atraso; los días sin dato se omiten. */
export async function extraerHumedadPower(distritos: Distrito[], { dias = 14, hoy = new Date() } = {}) {
  const celdasPorDistrito = new Map(
    distritos.map((d) => [d.codigo_distrito, [...new Set(puntosDelDistrito(d).map((p) => clave(celda(p.lat, p.lng))))]]),
  )
  const series = new Map<string, Serie>()
  for (const c of new Set([...celdasPorDistrito.values()].flat())) {
    if (series.size) await esperar(PAUSA_MS)
    const [lat, lng] = c.split(',')
    const url =
      `${URL_BASE}?parameters=${Object.keys(PARAMETROS).join(',')}&community=AG&latitude=${lat}&longitude=${lng}` +
      `&start=${haceDias(dias, hoy).replaceAll('-', '')}&end=${haceDias(1, hoy).replaceAll('-', '')}&format=JSON`
    series.set(c, (await (await pedir(url)).json()).properties.parameter)
  }
  return [...celdasPorDistrito].flatMap(([codigo, cs]) => aFilas(codigo, cs.map((c) => series.get(c)!)))
}
