// Ayudantes de los temas 2 y 10: puntos dentro del distrito, consultas con reintento y promedios.
import { bbox, booleanPointInPolygon } from '@turf/turf'
import type { Distrito } from '../../../packages/compartido/src/esquemas/datos.ts'

export type Punto = { codigo: string; lng: number; lat: number }

/**
 * Regla PTS-01 (docs/temas-2-y-10.md): 5 puntos + 1 por cada 25 km², máximo 20.
 * Rejilla regular dentro del polígono: el mismo distrito da siempre los mismos puntos,
 * así correr dos veces da los mismos valores. Sin polígono: el punto del distrito.
 */
export function puntosDelDistrito(d: Distrito): Punto[] {
  const n = Math.min(20, 5 + Math.floor((d.area_km2 ?? 0) / 25))
  const unico = [{ codigo: d.codigo_distrito, lng: d.lng, lat: d.lat }]
  const pol = d.poligono as any
  if (!pol?.type) return unico
  const [x0, y0, x1, y1] = bbox(pol)
  for (let k = Math.ceil(Math.sqrt(n)); k <= 60; k++) {
    const dentro: Punto[] = []
    for (let i = 0; i < k; i++)
      for (let j = 0; j < k; j++) {
        const lng = x0 + ((i + 0.5) * (x1 - x0)) / k
        const lat = y0 + ((j + 0.5) * (y1 - y0)) / k
        if (booleanPointInPolygon([lng, lat], pol)) dentro.push({ codigo: d.codigo_distrito, lng: +lng.toFixed(5), lat: +lat.toFixed(5) })
      }
    if (dentro.length >= n) return Array.from({ length: n }, (_, i) => dentro[Math.floor((i * dentro.length) / n)]!)
  }
  return unico
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

class ErrorPermanente extends Error {}

/** fetch con tiempo límite y reintentos (backoff 2, 4, 8 s) ante 429, 5xx o red caída. */
export async function pedir(url: string, { intentos = 4, timeoutMs = 120_000 } = {}): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (r.ok) return r
      const detalle = `${r.status} ${(await r.text()).slice(0, 200)}`
      if (r.status !== 429 && r.status < 500) throw new ErrorPermanente(detalle)
      throw new Error(detalle)
    } catch (e) {
      if (e instanceof ErrorPermanente || i >= intentos) throw e
      await esperar(2 ** i * 1000)
    }
  }
}

/** Promedio que ignora "sin dato" (null, undefined, -999, NaN). Sin ningún dato → null, nunca 0. */
export function promedio(valores: Array<number | null | undefined>, decimales = 3) {
  const ok = valores.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v !== -999)
  if (!ok.length) return { valor: null, n: 0 }
  const f = 10 ** decimales
  return { valor: Math.round((ok.reduce((a, b) => a + b, 0) / ok.length) * f) / f, n: ok.length }
}

/** Rejilla de píxeles leída de un GeoTIFF; (c0, f0) = columna y fila donde empieza la ventana leída. */
export type Rejilla = { datos: ArrayLike<number>; ancho: number; c0: number; f0: number; x0: number; y0: number; dx: number; dy: number; nodata: number | null }

/** Valor del píxel bajo el punto. "Sin dato" del archivo, negativo o fuera de la rejilla → null, nunca 0. */
export function valorEn(r: Rejilla, p: { lng: number; lat: number }): number | null {
  const c = Math.floor((p.lng - r.x0) / r.dx) - r.c0
  const f = Math.floor((p.lat - r.y0) / r.dy) - r.f0
  if (c < 0 || f < 0 || c >= r.ancho || f * r.ancho + c >= r.datos.length) return null
  const v = r.datos[f * r.ancho + c]!
  return v === r.nodata || v < 0 ? null : v
}

/** Fecha AAAA-MM-DD de hace `dias` días, en hora de Costa Rica. */
export function haceDias(dias: number, hoy = new Date()) {
  return new Date(hoy.getTime() - 6 * 3600_000 - dias * 86400_000).toISOString().slice(0, 10)
}
