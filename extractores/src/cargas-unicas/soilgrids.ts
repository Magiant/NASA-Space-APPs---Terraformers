// Tema 10 · Suelo por distrito desde SoilGrids 2.0 → tabla `suelos_zona`. UNA VEZ.
// Baja el mapa de todo el país una vez por propiedad (WCS, 7 descargas) y lee el valor en los
// 5–20 puntos de cada distrito, sin consultar la API punto por punto (regla SG-01).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fromArrayBuffer } from 'geotiff'
import type { Distrito, SueloZona } from '../../../packages/compartido/src/esquemas/datos.ts'
import { esperar, pedir, promedio, puntosDelDistrito, valorEn, type Rejilla } from '../humedad/utilidades.ts'

export const TABLA = 'suelos_zona'
export const FUENTE = 'soilgrids'

/** Propiedad de SoilGrids → divisor para pasar a la unidad de la columna. */
const PROPIEDADES = { phh2o: 10, clay: 10, sand: 10, soc: 10, nitrogen: 100, cec: 10, bdod: 100 } as const
type Propiedad = keyof typeof PROPIEDADES
const DIR_CACHE = fileURLToPath(new URL('../../.cache/soilgrids/', import.meta.url))
const PAUSA_MS = 12_000

const urlWcs = (p: Propiedad) =>
  `https://maps.isric.org/mapserv?map=/map/${p}.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage` +
  `&COVERAGEID=${p}_0-5cm_mean&FORMAT=image/tiff&SUBSET=long(-86.0,-82.5)&SUBSET=lat(8.0,11.3)` +
  `&SUBSETTINGCRS=http://www.opengis.net/def/crs/EPSG/0/4326&OUTPUTCRS=http://www.opengis.net/def/crs/EPSG/0/4326` +
  `&RESOLUTION=long(0.0025)&RESOLUTION=lat(0.0025)`

/** Valor de una propiedad en el punto, ya en la unidad de la columna. En SoilGrids 0 = sin dato → null. */
export function valorSuelo(r: Rejilla, p: { lng: number; lat: number }, divisor: number): number | null {
  const v = valorEn(r, p)
  return v === null ? null : v / divisor
}

/** Clase de textura USDA (nombres en español) con arena, limo y arcilla en %. Regla TEX-01. */
export function texturaUsda(arena: number, limo: number, arcilla: number): string {
  if (limo + 1.5 * arcilla < 15) return 'arenosa'
  if (limo + 1.5 * arcilla >= 15 && limo + 2 * arcilla < 30) return 'arenosa franca'
  if ((arcilla >= 7 && arcilla < 20 && arena > 52 && limo + 2 * arcilla >= 30) || (arcilla < 7 && limo < 50 && limo + 2 * arcilla >= 30))
    return 'franco arenosa'
  if (arcilla >= 7 && arcilla < 27 && limo >= 28 && limo < 50 && arena <= 52) return 'franca'
  if ((limo >= 50 && arcilla >= 12 && arcilla < 27) || (limo >= 50 && limo < 80 && arcilla < 12)) return 'franco limosa'
  if (limo >= 80 && arcilla < 12) return 'limosa'
  if (arcilla >= 20 && arcilla < 35 && limo < 28 && arena > 45) return 'franco arcillo arenosa'
  if (arcilla >= 27 && arcilla < 40 && arena > 20 && arena <= 45) return 'franco arcillosa'
  if (arcilla >= 27 && arcilla < 40 && arena <= 20) return 'franco arcillo limosa'
  if (arcilla >= 35 && arena > 45) return 'arcillo arenosa'
  if (arcilla >= 40 && limo >= 40) return 'arcillo limosa'
  return 'arcillosa'
}

const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10)

/** Fila de un distrito a partir de los rásters ya cargados. Puro. */
export function aFila(d: Distrito, rasters: Record<Propiedad, Rejilla>): SueloZona {
  const puntos = puntosDelDistrito(d)
  const prom = (p: Propiedad, dec = 2) => promedio(puntos.map((x) => valorSuelo(rasters[p], x, PROPIEDADES[p])), dec)
  const ph = prom('phh2o')
  const arcilla = r1(prom('clay').valor)
  const arena = r1(prom('sand').valor)
  const limo = arcilla !== null && arena !== null ? r1(Math.max(0, 100 - arcilla - arena)) : null
  return {
    codigo_distrito: d.codigo_distrito,
    ph: ph.valor,
    arcilla_pct: arcilla,
    arena_pct: arena,
    limo_pct: limo,
    carbono_organico_g_kg: r1(prom('soc').valor),
    nitrogeno_g_kg: prom('nitrogen').valor,
    cic_cmol_kg: r1(prom('cec').valor),
    densidad_g_cm3: prom('bdod').valor,
    textura: arcilla !== null && arena !== null && limo !== null ? texturaUsda(arena, limo, arcilla) : null,
    n_puntos: ph.n,
    fuente: FUENTE,
  }
}

async function cargarRaster(p: Propiedad, descargar: boolean): Promise<Rejilla> {
  const archivo = `${DIR_CACHE}${p}.tif`
  // La carpeta extractores/.cache (la misma del tema 1) se oculta sola de git (también si ya existía): los mapas descargados nunca se versionan.
  mkdirSync(DIR_CACHE, { recursive: true })
  writeFileSync(fileURLToPath(new URL('../../.cache/.gitignore', import.meta.url)), '*\n')
  if (!existsSync(archivo)) {
    if (descargar) await esperar(PAUSA_MS)
    writeFileSync(archivo, Buffer.from(await (await pedir(urlWcs(p))).arrayBuffer()))
  }
  const b = readFileSync(archivo)
  const img = await (await fromArrayBuffer(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))).getImage()
  const [x0, y0] = img.getOrigin() as [number, number]
  const [dx, dy] = img.getResolution() as [number, number]
  const [datos] = (await img.readRasters()) as unknown as [ArrayLike<number>]
  return { datos, ancho: img.getWidth(), c0: 0, f0: 0, x0, y0, dx, dy, nodata: 0 }
}

/** Suelo de todos los distritos. Los mapas quedan en extractores/.cache/soilgrids/ (no se versionan): volver a correr no descarga. */
export async function extraerSuelos(distritos: Distrito[]): Promise<SueloZona[]> {
  const rasters = {} as Record<Propiedad, Rejilla>
  let i = 0
  for (const p of Object.keys(PROPIEDADES) as Propiedad[]) rasters[p] = await cargarRaster(p, i++ > 0)
  return distritos.map((d) => aFila(d, rasters))
}
