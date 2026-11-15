// Punto representativo de un distrito: un punto que SIEMPRE cae dentro del polígono.
// El centroide no sirve en distritos con forma de "C", con huecos o con islas: puede caer fuera
// (en otro distrito o en el mar) y entonces el clima consultado sería de otro lugar.
// Adaptado del prototipo "clima NASA por distrito" (ver docs/temperatura-termica.md). Útil para el tema 0.
import { area, booleanPointInPolygon, centroid, polygon } from '@turf/turf'

type Anillo = number[][]
type Geometria = { type: 'Polygon'; coordinates: Anillo[] } | { type: 'MultiPolygon'; coordinates: Anillo[][] }

export interface PuntoRepresentativo {
  /** [lng, lat] en WGS84 */
  punto: [number, number]
  metodo: 'centroide' | 'punto_interior_parte_mayor'
}

/** ¿El punto [lng, lat] está dentro del polígono (anillos: exterior y huecos)? El borde no cuenta. */
export function contienePunto(punto: [number, number], anillos: Anillo[]): boolean {
  return booleanPointInPolygon(punto, polygon(anillos), { ignoreBoundary: true })
}

/**
 * Punto interior por línea horizontal: se traza una línea a media altura, se buscan los cruces con
 * todos los anillos (exterior y huecos) y se toma el centro del tramo interior más ancho.
 */
function puntoInterior(anillos: Anillo[]): [number, number] {
  const ys = anillos[0].map((p) => p[1])
  const [ymin, ymax] = [Math.min(...ys), Math.max(...ys)]
  // Se prueban varias alturas por si la línea pasa justo por un vértice o por un tramo muy angosto.
  let mejor: { x: number; y: number; ancho: number } | null = null
  for (const f of [0.5, 0.37, 0.63, 0.25, 0.75]) {
    const y = ymin + (ymax - ymin) * f
    const cruces: number[] = []
    for (const anillo of anillos) {
      for (let i = 0; i < anillo.length - 1; i++) {
        const [x1, y1] = anillo[i]
        const [x2, y2] = anillo[i + 1]
        if ((y1 > y) !== (y2 > y)) cruces.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
      }
    }
    cruces.sort((a, b) => a - b)
    for (let i = 0; i + 1 < cruces.length; i += 2) {
      const ancho = cruces[i + 1] - cruces[i]
      if (!mejor || ancho > mejor.ancho) mejor = { x: (cruces[i] + cruces[i + 1]) / 2, y, ancho }
    }
  }
  if (!mejor) throw new Error('No se encontró un punto interior: polígono vacío o inválido')
  return [mejor.x, mejor.y]
}

/** Centroide si cae dentro; si no, un punto interior de la parte más grande del polígono. */
export function puntoRepresentativo(g: Geometria): PuntoRepresentativo {
  const partes: Anillo[][] = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  const mayor = partes.reduce((a, b) => (area(polygon(b)) > area(polygon(a)) ? b : a))
  const c = centroid(polygon(mayor)).geometry.coordinates as [number, number]
  if (contienePunto(c, mayor)) return { punto: c, metodo: 'centroide' }
  return { punto: puntoInterior(mayor), metodo: 'punto_interior_parte_mayor' }
}
