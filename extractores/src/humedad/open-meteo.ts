// Tema 2 · Humedad del suelo desde Open-Meteo (ERA5-Land) → tabla `humedad_suelo`, fuente 'open-meteo'. DIARIO.
// Humedad volumétrica (m³/m³) y temperatura del suelo en 3 capas, promedio de 5–20 puntos dentro de cada distrito.
import type { Distrito, HumedadSuelo } from '../../../packages/compartido/src/esquemas/datos.ts'
import { esperar, haceDias, pedir, promedio, puntosDelDistrito, type Punto } from './utilidades.ts'

export const TABLA = 'humedad_suelo'
export const FUENTE = 'open-meteo'

const URL_BASE = 'https://archive-api.open-meteo.com/v1/archive'
const CAPAS = [
  { profundidad: '0-7cm', humedad: 'soil_moisture_0_to_7cm_mean', temp: 'soil_temperature_0_to_7cm_mean' },
  { profundidad: '7-28cm', humedad: 'soil_moisture_7_to_28cm_mean', temp: 'soil_temperature_7_to_28cm_mean' },
  { profundidad: '28-100cm', humedad: 'soil_moisture_28_to_100cm_mean', temp: 'soil_temperature_28_to_100cm_mean' },
] as const
/** Ubicaciones por consulta. Open-Meteo cuenta cada ubicación como una llamada: límite gratis 600/min. */
const POR_CONSULTA = 100
const PAUSA_MS = 11_000

type RespuestaPunto = { daily: Record<string, Array<number | null>> & { time: string[] } }
/** codigo|fecha|profundidad → valores de cada punto */
type Acumulado = Map<string, { humedad: Array<number | null>; temp: Array<number | null> }>

/** Suma la respuesta de un punto al acumulado de su distrito. Puro, para probarlo con respuestas reales. */
export function acumular(acum: Acumulado, punto: Punto, r: RespuestaPunto) {
  r.daily.time.forEach((fecha, i) => {
    for (const c of CAPAS) {
      const clave = `${punto.codigo}|${fecha}|${c.profundidad}`
      const a = acum.get(clave) ?? { humedad: [], temp: [] }
      a.humedad.push(r.daily[c.humedad]?.[i] ?? null)
      a.temp.push(r.daily[c.temp]?.[i] ?? null)
      acum.set(clave, a)
    }
  })
}

/** Convierte el acumulado en filas. Omite días sin ningún dato todavía (no se guardan vacíos). */
export function aFilas(acum: Acumulado): HumedadSuelo[] {
  const filas: HumedadSuelo[] = []
  for (const [clave, a] of acum) {
    const [codigo_distrito, fecha, profundidad] = clave.split('|') as [string, string, string]
    const h = promedio(a.humedad)
    if (h.valor === null) continue
    filas.push({
      codigo_distrito, fecha, fuente: FUENTE, profundidad,
      humedad_m3_m3: h.valor,
      humedad_relativa: null,
      percentil_sequia: null,
      temp_suelo_c: promedio(a.temp, 1).valor,
      n_puntos: h.n,
    })
  }
  return filas
}

/** Últimos `dias` días (para corregir datos tardíos) de todos los distritos, en pocas consultas. */
export async function extraerHumedadOpenMeteo(distritos: Distrito[], { dias = 7, hoy = new Date() } = {}) {
  const puntos = distritos.flatMap(puntosDelDistrito)
  const acum: Acumulado = new Map()
  const variables = CAPAS.flatMap((c) => [c.humedad, c.temp]).join(',')
  for (let i = 0; i < puntos.length; i += POR_CONSULTA) {
    if (i > 0) await esperar(PAUSA_MS)
    const lote = puntos.slice(i, i + POR_CONSULTA)
    const url =
      `${URL_BASE}?latitude=${lote.map((p) => p.lat).join(',')}&longitude=${lote.map((p) => p.lng).join(',')}` +
      `&start_date=${haceDias(dias, hoy)}&end_date=${haceDias(1, hoy)}&daily=${variables}&timezone=America%2FCosta_Rica`
    const json = await (await pedir(url)).json()
    const respuestas: RespuestaPunto[] = Array.isArray(json) ? json : [json]
    lote.forEach((p, j) => acumular(acum, p, respuestas[j]!))
  }
  return aFilas(acum)
}
