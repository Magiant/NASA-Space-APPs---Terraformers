// Altitud real de puntos: primero `terreno_zona.altitud_m` (tema 9) si existe para el distrito;
// si no, la Elevation API de Open-Meteo (Copernicus GLO-90, 90 m, sin cuenta, hasta 100 puntos por consulta).
// Documentación: https://open-meteo.com/en/docs/elevation-api
import { esperar, obtenerJson } from './http.ts'
import { obtenerSupabase } from './supabase.ts'
import type { Coordenada } from './puntos.ts'

const URL_ELEVACION = 'https://api.open-meteo.com/v1/elevation'
const MAX_POR_CONSULTA = 100

/** Altitud (m) de cada coordenada [lng, lat], en el mismo orden. Sin dato → null. */
export async function elevacionDePuntos(coords: Coordenada[]): Promise<Array<number | null>> {
  const out: Array<number | null> = []
  for (let i = 0; i < coords.length; i += MAX_POR_CONSULTA) {
    const parte = coords.slice(i, i + MAX_POR_CONSULTA)
    const q = new URLSearchParams({
      latitude: parte.map(([, lat]) => lat.toFixed(5)).join(','),
      longitude: parte.map(([lng]) => lng.toFixed(5)).join(','),
    })
    const { elevation } = await obtenerJson<{ elevation: number[] }>(`${URL_ELEVACION}?${q}`)
    out.push(...elevation.map((e) => (Number.isFinite(e) ? e : null)))
    await esperar(200)
  }
  return out
}

/** Altitud media por distrito desde `terreno_zona` (tema 9). Vacío si la tabla aún no tiene datos. */
export async function altitudesTerreno(codigos: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  for (let i = 0; i < codigos.length; i += 200) {
    const { data, error } = await obtenerSupabase().from('terreno_zona').select('codigo_distrito,altitud_m')
      .in('codigo_distrito', codigos.slice(i, i + 200)).not('altitud_m', 'is', null)
    if (error) throw new Error(`No se pudo leer terreno_zona: ${error.message}`)
    for (const f of data) out.set(f.codigo_distrito, Number(f.altitud_m))
  }
  return out
}
