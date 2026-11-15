// Mapas livianos para el selector de ubicación de la web (web/public/mapas/). Se corre a mano cuando
// cambian los límites oficiales:   npm run mapas-web -w extractores
//
// Misma fuente que la tabla `distritos` (tema 0): límites HDX/INEC, códigos CR + 5 dígitos.
// Salida (GeoJSON con coordenadas de 4 decimales, ~11 m):
//   provincias.json        7 provincias           (simplificadas a ~400 m)
//   cantones.json          84 cantones            (~200 m)
//   distritos-CRx.json     distritos de una provincia (~80 m), se bajan solo al elegir esa provincia
//   ubicaciones.json       los 492 distritos sin polígono: respaldo si Supabase no responde
// En total 10 archivos. Cada forma lleva { c: código, n: nombre, l: [lng, lat] punto para la etiqueta };
// los cantones y distritos llevan además p: código del nivel de arriba (provincia o cantón).
// La Isla del Coco se quita del dibujo (a 500 km de la costa, achicaría todo el mapa); el distrito
// sigue en la lista.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { booleanPointInPolygon, centerOfMass, pointOnFeature, simplify } from '@turf/turf'
import { armarDistritos, leerDelZip, type FeaturePoligono, type FeaturePunto } from '../src/cargas-unicas/distritos.ts'

const SALIDA = fileURLToPath(new URL('../../web/public/mapas/', import.meta.url))
const LATITUD_COCO = 7.5 // todo lo que queda al sur de esto es la Isla del Coco

type Anillo = number[][]
type Geo = { type: 'Polygon'; coordinates: Anillo[] } | { type: 'MultiPolygon'; coordinates: Anillo[][] }

const r4 = (n: number) => Math.round(n * 1e4) / 1e4

/** Quita la Isla del Coco, simplifica y redondea. */
function preparar(g: Geo, tolerancia: number): Geo {
  let partes = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  const tierraFirme = partes.filter((p) => p[0].some((c) => c[1] > LATITUD_COCO))
  if (tierraFirme.length) partes = tierraFirme
  const f = simplify({ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: partes } } as never, { tolerance: tolerancia, highQuality: true }) as unknown as { geometry: { coordinates: Anillo[][] } }
  const limpias = f.geometry.coordinates
    .map((p) => p.map((a) => a.map(([x, y]) => [r4(x), r4(y)])).filter((a) => a.length >= 4))
    .filter((p) => p.length > 0)
  return limpias.length === 1 ? { type: 'Polygon', coordinates: limpias[0] } : { type: 'MultiPolygon', coordinates: limpias }
}

/** Punto para la etiqueta: el centro de masa si cae dentro; si no, un punto interior. */
function puntoEtiqueta(g: Geo): [number, number] {
  const f = { type: 'Feature', properties: {}, geometry: g } as never
  let p = centerOfMass(f).geometry.coordinates as [number, number]
  if (!booleanPointInPolygon(p, f)) p = pointOnFeature(f).geometry.coordinates as [number, number]
  return [r4(p[0]), r4(p[1])]
}

function coleccion(features: FeaturePoligono[], codigo: string, nombre: string, tolerancia: number, extra?: (p: Record<string, unknown>) => Record<string, unknown>) {
  return {
    type: 'FeatureCollection',
    features: features
      .filter((f) => f.properties[codigo])
      .sort((a, b) => String(a.properties[codigo]).localeCompare(String(b.properties[codigo])))
      .map((f) => {
        const geometry = preparar(f.geometry as Geo, tolerancia)
        return { type: 'Feature', properties: { c: f.properties[codigo], n: f.properties[nombre], ...extra?.(f.properties), l: puntoEtiqueta(geometry) }, geometry }
      }),
  }
}

function guardar(nombre: string, datos: unknown) {
  const texto = JSON.stringify(datos)
  writeFileSync(SALIDA + nombre, texto)
  return texto.length
}

const admin1 = leerDelZip('cri_admin1.geojson').features as FeaturePoligono[]
const admin2 = leerDelZip('cri_admin2.geojson').features as FeaturePoligono[]
const admin3 = leerDelZip('cri_admin3.geojson').features as FeaturePoligono[]
const puntos = leerDelZip('cri_adminpoints.geojson').features as FeaturePunto[]

rmSync(SALIDA, { recursive: true, force: true })
mkdirSync(SALIDA, { recursive: true })

const kb = (n: number) => `${Math.round(n / 1024)} KB`
console.log('provincias.json', kb(guardar('provincias.json', coleccion(admin1, 'adm1_pcode', 'adm1_name', 0.004))))
console.log('cantones.json  ', kb(guardar('cantones.json', coleccion(admin2, 'adm2_pcode', 'adm2_name', 0.002, (p) => ({ p: p.adm1_pcode })))))

const porProvincia = new Map<string, FeaturePoligono[]>()
for (const f of admin3) {
  const p = String(f.properties.adm1_pcode ?? '')
  if (p) porProvincia.set(p, [...(porProvincia.get(p) ?? []), f])
}
for (const [provincia, lista] of [...porProvincia].sort()) {
  console.log(`distritos-${provincia}.json`, kb(guardar(`distritos-${provincia}.json`, coleccion(lista, 'adm3_pcode', 'adm3_name', 0.0008, (p) => ({ p: p.adm2_pcode })))))
}

// Mismas columnas y mismo punto representativo que la tabla `distritos` de Supabase.
const filas = armarDistritos(admin3, puntos).map((d) => [d.codigo_distrito, d.distrito, d.codigo_canton, d.canton, d.codigo_provincia, d.provincia, d.lat, d.lng])
console.log('ubicaciones.json', kb(guardar('ubicaciones.json', { columnas: ['codigo_distrito', 'distrito', 'codigo_canton', 'canton', 'codigo_provincia', 'provincia', 'lat', 'lng'], filas })), `(${filas.length} distritos)`)
