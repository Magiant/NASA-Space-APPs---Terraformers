// Tema 0 · DISTRITOS — límites oficiales HDX (INEC) → tabla `distritos`. Se corre UNA VEZ (unica-vez.yml),
// antes que cualquier otro extractor: todos dependen de esta tabla.
//
// Fuente: "Costa Rica - Subnational Administrative Boundaries" en HDX (OCHA), datos del INEC/IGN,
// versión válida desde 2024-12-03. Un ZIP de 165 MB que se baja una sola vez a extractores/.cache/hdx/.
//   * cri_admin3.geojson    → polígono y área (km²) de cada uno de los 492 distritos.
//   * cri_adminpoints.geojson → punto oficial del distrito (lat, lng).
//
// Reglas:
//   DIS-01  Los códigos ya vienen en el formato común: CR + provincia + cantón + distrito ('CR30110').
//   DIS-02  Los polígonos traen 2,3 millones de vértices: se simplifican a ~50 m (0,0005°) y se redondean
//           a 5 decimales (~1 m). Alcanza para poner los puntos de muestreo dentro del distrito.
//   DIS-03  Si el punto oficial cae fuera del polígono, se reemplaza por un punto interior (comun/geometria.ts).
//   DIS-04  Deben llegar exactamente 492 distritos; si no, no se guarda nada.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { simplify } from '@turf/turf'
import type { Distrito } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { contienePunto, puntoRepresentativo } from '../comun/geometria.ts'

export const FUENTE = 'hdx-inec'
export const TOTAL_ESPERADO = 492
export const TOLERANCIA_GRADOS = 0.0005
const URL_ZIP =
  'https://data.humdata.org/dataset/7cf2b2c2-ad83-4f65-aa69-dae9c574df13/resource/03388032-7fd5-4cf5-8797-62b6d6866786/download/cri_admin_boundaries.geojson.zip'
const DIR_CACHE = fileURLToPath(new URL('../../.cache/hdx/', import.meta.url))
const ZIP = DIR_CACHE + 'cri_admin_boundaries.geojson.zip'

type Anillo = number[][]
type Geometria = { type: 'Polygon'; coordinates: Anillo[] } | { type: 'MultiPolygon'; coordinates: Anillo[][] }
export interface FeaturePoligono { properties: Record<string, unknown>; geometry: Geometria }
export interface FeaturePunto { properties: Record<string, unknown>; geometry: { type: 'Point'; coordinates: [number, number] } }

const redondear = (n: number, d = 5) => Math.round(n * 10 ** d) / 10 ** d

/** Simplifica y redondea un polígono (DIS-02). Devuelve una copia. */
export function aligerar(g: Geometria, tolerancia = TOLERANCIA_GRADOS): Geometria {
  const s = simplify({ type: 'Feature', properties: {}, geometry: structuredClone(g) } as never, { tolerance: tolerancia, highQuality: false }) as unknown as { geometry: Geometria }
  const r = (anillo: Anillo) => anillo.map(([x, y]) => [redondear(x), redondear(y)])
  return s.geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: s.geometry.coordinates.map(r) }
    : { type: 'MultiPolygon', coordinates: (s.geometry.coordinates as Anillo[][]).map((p) => p.map(r)) }
}

/** ¿El punto cae dentro de alguna parte del polígono? */
function dentro(punto: [number, number], g: Geometria): boolean {
  const partes = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  return partes.some((p) => contienePunto(punto, p))
}

/** Un distrito a partir de su polígono y su punto oficial (si existe). Función pura. */
export function aDistrito(f: FeaturePoligono, punto?: FeaturePunto): Distrito {
  const p = f.properties
  const poligono = aligerar(f.geometry)
  let coord: [number, number] | null = punto ? punto.geometry.coordinates : null
  if (!coord || !dentro(coord, poligono)) coord = puntoRepresentativo(poligono).punto // DIS-03
  return {
    codigo_distrito: String(p.adm3_pcode),
    distrito: String(p.adm3_name),
    codigo_canton: String(p.adm2_pcode),
    canton: String(p.adm2_name),
    codigo_provincia: String(p.adm1_pcode),
    provincia: String(p.adm1_name),
    lat: redondear(coord[1]),
    lng: redondear(coord[0]),
    area_km2: typeof p.area_sqkm === 'number' ? Math.round(p.area_sqkm * 1000) / 1000 : null,
    poligono: poligono as unknown as Record<string, unknown>,
  }
}

/** Une polígonos y puntos por código y comprueba que estén los 492 (DIS-04). */
export function armarDistritos(poligonos: FeaturePoligono[], puntos: FeaturePunto[]): Distrito[] {
  const porCodigo = new Map(puntos.filter((x) => x.properties.adm3_pcode).map((x) => [String(x.properties.adm3_pcode), x]))
  const lista = poligonos
    .filter((f) => typeof f.properties.adm3_pcode === 'string' && f.properties.adm3_pcode !== '')
    .map((f) => aDistrito(f, porCodigo.get(String(f.properties.adm3_pcode))))
    .sort((a, b) => a.codigo_distrito.localeCompare(b.codigo_distrito))
  if (new Set(lista.map((d) => d.codigo_distrito)).size !== lista.length) throw new Error('Hay códigos de distrito repetidos')
  if (lista.length !== TOTAL_ESPERADO) throw new Error(`Se esperaban ${TOTAL_ESPERADO} distritos y llegaron ${lista.length}`)
  return lista
}

function leerDelZip(nombre: string): { features: unknown[] } {
  return JSON.parse(execFileSync('unzip', ['-p', ZIP, nombre], { encoding: 'utf8', maxBuffer: 300e6 }))
}

export async function cargarDistritosHdx(args: Argumentos): Promise<void> {
  if (!existsSync(ZIP)) {
    mkdirSync(DIR_CACHE, { recursive: true })
    console.log('Descargando límites de HDX (165 MB, una sola vez)…')
    execFileSync('curl', ['-sSL', '--fail', '--max-time', '900', '-o', ZIP, URL_ZIP], { stdio: 'inherit' })
  }
  const distritos = armarDistritos(
    leerDelZip('cri_admin3.geojson').features as FeaturePoligono[],
    leerDelZip('cri_adminpoints.geojson').features as FeaturePunto[],
  )
  const elegidos = args.distritos?.length ? distritos.filter((d) => args.distritos!.includes(d.codigo_distrito)) : distritos
  const vertices = elegidos.reduce((n, d) => n + JSON.stringify(d.poligono).split('],[').length, 0)
  console.log(`Distritos HDX: ${elegidos.length} distritos, ~${vertices.toLocaleString('es-CR')} vértices tras simplificar`)
  // Lotes chicos: cada fila lleva su polígono.
  await ejecutarExtractor({ fuente: FUENTE, tabla: 'distritos', lotes: [elegidos], simulacion: args.simulacion, tamanoUpsert: 25 })
}
