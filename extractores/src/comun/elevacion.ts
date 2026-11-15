// Altitud real de puntos: primero `terreno_zona.altitud_m` (tema 9) si existe para el distrito;
// si no, la Elevation API de Open-Meteo (Copernicus GLO-90, 90 m, sin cuenta, hasta 100 puntos por consulta).
// Documentación: https://open-meteo.com/en/docs/elevation-api
//
// ELE-01  Open-Meteo cuenta CADA PUNTO como una llamada (límite 5 000/hora y 10 000/día, compartido con
//         clima y humedad). Por eso las alturas ya consultadas se guardan en extractores/.cache/elevacion.json:
//         los puntos de cada distrito son siempre los mismos, así que desde la segunda corrida no se gasta cupo.
// ELE-02  Si Open-Meteo responde 429 (límite superado), el resto se pide a OpenTopoData (SRTM 90 m, gratis,
//         100 puntos por consulta, 1 consulta por segundo): https://www.opentopodata.org/api/
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { esperar, obtenerJson } from './http.ts'
import { obtenerSupabase } from './supabase.ts'
import type { Coordenada } from './puntos.ts'

const URL_ELEVACION = 'https://api.open-meteo.com/v1/elevation'
const URL_OPENTOPODATA = 'https://api.opentopodata.org/v1/srtm90m'
const MAX_POR_CONSULTA = 100
const DIR_CACHE = fileURLToPath(new URL('../../.cache/', import.meta.url))
const ARCHIVO_CACHE = DIR_CACHE + 'elevacion.json'

const clave = ([lng, lat]: Coordenada) => `${lat.toFixed(5)},${lng.toFixed(5)}`

function leerCache(): Record<string, number | null> {
  try {
    return existsSync(ARCHIVO_CACHE) ? JSON.parse(readFileSync(ARCHIVO_CACHE, 'utf8')) : {}
  } catch {
    return {}
  }
}

function guardarCache(cache: Record<string, number | null>) {
  mkdirSync(DIR_CACHE, { recursive: true })
  writeFileSync(ARCHIVO_CACHE, JSON.stringify(cache))
}

/** Open-Meteo: devuelve null (sin lanzar) si se superó el límite, para pasar a OpenTopoData. */
async function openMeteo(parte: Coordenada[]): Promise<Array<number | null> | null> {
  const q = new URLSearchParams({
    latitude: parte.map(([, lat]) => lat.toFixed(5)).join(','),
    longitude: parte.map(([lng]) => lng.toFixed(5)).join(','),
  })
  const r = await fetch(`${URL_ELEVACION}?${q}`, { signal: AbortSignal.timeout(60_000) })
  if (r.status === 429) return null
  if (!r.ok) throw new Error(`Elevation API: HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const { elevation } = (await r.json()) as { elevation: number[] }
  return elevation.map((e) => (Number.isFinite(e) ? e : null))
}

async function openTopoData(parte: Coordenada[]): Promise<Array<number | null>> {
  const locations = parte.map(([lng, lat]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join('|')
  const { results } = await obtenerJson<{ results: { elevation: number | null }[] }>(`${URL_OPENTOPODATA}?locations=${locations}`)
  return results.map((x) => (typeof x.elevation === 'number' ? x.elevation : null))
}

/** Altitud (m) de cada coordenada [lng, lat], en el mismo orden. Sin dato → null. */
export async function elevacionDePuntos(coords: Coordenada[]): Promise<Array<number | null>> {
  const cache = leerCache()
  const faltan = [...new Map(coords.filter((c) => !(clave(c) in cache)).map((c) => [clave(c), c])).values()]
  let fuente: 'open-meteo' | 'opentopodata' = 'open-meteo'
  let consultados = 0
  for (let i = 0; i < faltan.length; i += MAX_POR_CONSULTA) {
    const parte = faltan.slice(i, i + MAX_POR_CONSULTA)
    let alturas = fuente === 'open-meteo' ? await openMeteo(parte) : null
    if (!alturas) {
      if (fuente === 'open-meteo') console.log('  Open-Meteo llegó a su límite de llamadas: el resto de alturas sale de OpenTopoData (SRTM 90 m)')
      fuente = 'opentopodata'
      alturas = await openTopoData(parte)
      await esperar(1_100) // OpenTopoData: máximo una consulta por segundo
    } else {
      await esperar(200)
    }
    parte.forEach((c, k) => { cache[clave(c)] = alturas![k] ?? null })
    consultados += parte.length
    if (consultados % 1000 < MAX_POR_CONSULTA) guardarCache(cache) // guardar avance por si se corta
  }
  if (faltan.length) guardarCache(cache)
  console.log(`  Elevación: ${coords.length - faltan.length} puntos desde la caché, ${faltan.length} consultados`)
  return coords.map((c) => cache[clave(c)] ?? null)
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
