// "Promedio dentro del polígono, no de un solo punto": genera de 5 a 20 puntos DENTRO del distrito.
// Determinista (cuadrícula, no aleatorio): correr dos veces da los mismos puntos y los mismos valores.
import * as turf from '@turf/turf'

export type Coordenada = [number, number] // [lng, lat]

/** Cuántos puntos según el tamaño: 5 en distritos pequeños, hasta 20 en los muy grandes. */
export function cantidadPuntos(areaKm2: number | null | undefined): number {
  if (!areaKm2 || areaKm2 <= 0) return 5
  return Math.min(20, Math.max(5, Math.round(5 + areaKm2 / 30)))
}

/**
 * Puntos repartidos en una cuadrícula dentro del polígono (GeoJSON Polygon/MultiPolygon o Feature).
 * Si el polígono es tan pequeño que la cuadrícula no cae dentro, usa un punto garantizado interior.
 */
export function puntosDentro(poligono: unknown, n: number): Coordenada[] {
  const feature = (poligono as { type?: string }).type === 'Feature'
    ? (poligono as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>)
    : turf.feature(poligono as GeoJSON.Polygon | GeoJSON.MultiPolygon)
  const caja = turf.bbox(feature)
  const areaKm2 = turf.area(feature) / 1e6
  let lado = Math.max(Math.sqrt(areaKm2 / n), 0.05) // km
  let puntos: Coordenada[] = []
  for (let intento = 0; intento < 8 && puntos.length < n; intento++) {
    const rejilla = turf.pointGrid(caja, lado, { units: 'kilometers', mask: feature })
    puntos = rejilla.features.map((f) => f.geometry.coordinates as Coordenada)
    lado *= 0.7
  }
  if (!puntos.length) return [turf.pointOnFeature(feature).geometry.coordinates as Coordenada]
  if (puntos.length <= n) return puntos
  // Más puntos de los necesarios: tomar n repartidos a lo largo de la cuadrícula.
  return Array.from({ length: n }, (_, i) => puntos[Math.floor((i * puntos.length) / n)])
}
