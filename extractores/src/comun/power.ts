// NASA POWER por celda (sin cuenta). POWER entrega un valor por celda de 0.5° × 0.625°: todos los
// puntos que caen en la misma celda reciben el mismo número, así que se consulta cada celda UNA vez
// (≈ 30 para todo el país; idea del tema 2, regla POW-01).
// Documentación: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
import { esperar, obtenerJson } from './http.ts'

export const URL_POWER_DIARIO = 'https://power.larc.nasa.gov/api/temporal/daily/point'
const PAUSA_MS = 1_000

export interface Celda { lat: number; lng: number }
export interface SerieCelda {
  /** Altitud que usa POWER para la celda (3.ª coordenada de la respuesta), en m. */
  elevacionM: number
  /** parametro → { AAAAMMDD → valor } (con -999 = sin dato). */
  parametros: Record<string, Record<string, number>>
}

/** Centro de la celda de POWER que contiene el punto. */
export function celda(lat: number, lng: number): Celda {
  return { lat: Math.round(lat / 0.5) * 0.5, lng: Math.round(lng / 0.625) * 0.625 }
}
export const claveCelda = (c: Celda) => `${c.lat},${c.lng}`

/** Pide la serie diaria de una celda (fechas AAAA-MM-DD, comunidad AG: radiación en MJ/m²/día). */
export async function serieCelda(c: Celda, parametros: string[], desde: string, hasta: string): Promise<SerieCelda> {
  const q = new URLSearchParams({
    parameters: parametros.join(','), community: 'AG', format: 'JSON',
    latitude: String(c.lat), longitude: String(c.lng),
    start: desde.replaceAll('-', ''), end: hasta.replaceAll('-', ''),
  })
  const js = await obtenerJson<{ geometry: { coordinates: number[] }; properties: { parameter: Record<string, Record<string, number>> } }>(
    `${URL_POWER_DIARIO}?${q}`, 5, 300_000,
  )
  return { elevacionM: Number(js.geometry.coordinates[2]), parametros: js.properties.parameter }
}

/** Series de varias celdas, una consulta por celda con pausa de 1 s entre consultas. */
export async function seriesCeldas(celdas: Celda[], parametros: string[], desde: string, hasta: string): Promise<Map<string, SerieCelda>> {
  const out = new Map<string, SerieCelda>()
  for (const c of celdas) {
    const k = claveCelda(c)
    if (out.has(k)) continue
    out.set(k, await serieCelda(c, parametros, desde, hasta))
    await esperar(PAUSA_MS)
  }
  return out
}

/** Valor de POWER a número o null (-999 y vacíos = sin dato). */
export const valorPower = (v: number | undefined | null) => (v === undefined || v === null || v === -999 || !Number.isFinite(v) ? null : v)
