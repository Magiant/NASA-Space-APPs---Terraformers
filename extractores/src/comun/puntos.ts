// "Promedio dentro del polígono, no de un solo punto": genera de 5 a 20 puntos DENTRO del distrito.
// Determinista (cuadrícula, no aleatorio): correr dos veces da los mismos puntos y los mismos valores.
import * as turf from '@turf/turf'

export type Coordenada = [number, number] // [lng, lat]

/**
 * Regla única de todo el proyecto (PTS-01, docs/temas-2-y-10.md): 5 puntos + 1 por cada 25 km²,
 * máximo 20. La usan todos los temas para que `n_puntos` y los promedios sean comparables.
 */
export function cantidadPuntos(areaKm2: number | null | undefined): number {
  if (!areaKm2 || areaKm2 <= 0) return 5
  return Math.min(20, 5 + Math.floor(areaKm2 / 25))
}

/**
 * Exactamente n puntos en una rejilla regular k×k dentro del polígono (GeoJSON Polygon/MultiPolygon
 * o Feature), redondeados a 5 decimales. Se agranda k hasta que caigan al menos n puntos dentro y se
 * toman n repartidos. Si el polígono es diminuto, un punto interior garantizado.
 */
export function puntosDentro(poligono: unknown, n: number): Coordenada[] {
  const feature = (poligono as { type?: string }).type === 'Feature'
    ? (poligono as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>)
    : turf.feature(poligono as GeoJSON.Polygon | GeoJSON.MultiPolygon)
  const [x0, y0, x1, y1] = turf.bbox(feature)
  for (let k = Math.ceil(Math.sqrt(n)); k <= 60; k++) {
    const dentro: Coordenada[] = []
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        const lng = x0 + ((i + 0.5) * (x1 - x0)) / k
        const lat = y0 + ((j + 0.5) * (y1 - y0)) / k
        if (turf.booleanPointInPolygon([lng, lat], feature)) dentro.push([+lng.toFixed(5), +lat.toFixed(5)])
      }
    }
    if (dentro.length >= n) return Array.from({ length: n }, (_, i) => dentro[Math.floor((i * dentro.length) / n)])
  }
  return [turf.pointOnFeature(feature).geometry.coordinates as Coordenada]
}
