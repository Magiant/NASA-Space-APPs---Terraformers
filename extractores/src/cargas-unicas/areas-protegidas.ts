// Tema 10 · % de cada distrito dentro de áreas protegidas (WDPA / Protected Planet) → tabla `terreno_zona`,
// solo `area_protegida_pct`. UNA VEZ. Requiere WDPA_API_TOKEN (token gratis de https://api.protectedplanet.net).
import { area, bbox, featureCollection, intersect, union } from '@turf/turf'
import type { Distrito, TerrenoZona } from '../../../packages/compartido/src/esquemas/datos.ts'
import { esperar, pedir } from '../humedad/utilidades.ts'

export const TABLA = 'terreno_zona'
export const FUENTE = 'wdpa'
/** terreno_zona es compartida con el tema 9: enviar solo estas columnas. */
export const COLUMNAS = ['codigo_distrito', 'area_protegida_pct'] as const

type Poligono = { type: 'Polygon' | 'MultiPolygon'; coordinates: any }
const feature = (g: Poligono) => ({ type: 'Feature' as const, properties: {}, geometry: g })
const seTocan = (a: number[], b: number[]) => a[0]! <= b[2]! && b[0]! <= a[2]! && a[1]! <= b[3]! && b[1]! <= a[3]!

/**
 * % del polígono del distrito cubierto por áreas protegidas. Las áreas que se traslapan se unen antes de medir,
 * para no contar dos veces el mismo terreno. Puro.
 */
export function porcentajeProtegido(distrito: Poligono, areas: Poligono[], omitidas = { n: 0 }): number {
  const d = feature(distrito)
  const caja = bbox(d)
  const piezas = areas
    .map((a) => {
      // Una geometría vacía o degenerada de WDPA hace fallar a turf: se omite esa área y se avisa al final.
      try { return seTocan(caja, bbox(feature(a))) ? intersect(featureCollection([d, feature(a)]) as any) : null } catch { omitidas.n++; return null }
    })
    .filter((p): p is NonNullable<typeof p> => !!p)
  if (!piezas.length) return 0
  const cubierto = piezas.length === 1 ? piezas[0]! : union(featureCollection(piezas as any))!
  return Math.min(100, Math.round((area(cubierto) / area(d)) * 1000) / 10)
}

/** Descarga los polígonos de las áreas protegidas de Costa Rica (API v3, por páginas de 50). */
async function descargarAreas(token: string): Promise<Poligono[]> {
  const areas: Poligono[] = []
  for (let pagina = 1; ; pagina++) {
    if (pagina > 1) await esperar(500)
    const url = `https://api.protectedplanet.net/v3/protected_areas/search?country=CRI&with_geometry=true&per_page=50&page=${pagina}&token=${encodeURIComponent(token)}`
    const lote: Array<{ geojson?: { geometry?: Poligono } }> = (await (await pedir(url)).json()).protected_areas ?? []
    for (const a of lote) {
      const g = a.geojson?.geometry
      if (g?.type === 'Polygon' || g?.type === 'MultiPolygon') areas.push(g)
    }
    if (lote.length < 50) return areas
  }
}

export async function extraerAreasProtegidas(distritos: Distrito[], token = process.env.WDPA_API_TOKEN): Promise<Array<Pick<TerrenoZona, 'codigo_distrito' | 'area_protegida_pct'>>> {
  if (!token) throw new Error('Falta WDPA_API_TOKEN (token gratis en https://api.protectedplanet.net/request)')
  const areas = await descargarAreas(token)
  const omitidas = { n: 0 }
  const filas = distritos.map((d) => ({
    codigo_distrito: d.codigo_distrito,
    area_protegida_pct: d.poligono ? porcentajeProtegido(d.poligono as Poligono, areas, omitidas) : null,
  }))
  if (omitidas.n) console.warn(`${omitidas.n} cruces distrito × área protegida omitidos por polígonos inválidos de WDPA`)
  return filas
}
