// Tema 10 · Aptitud FAO y calendario de siembra desde GAEZ v4 → tabla `gaez_zona`. UNA VEZ.
// Para cada cultivo de la tabla `cultivos` (tema 5) con pareja en GAEZ: aptitud (%), mes de siembra y duración del ciclo,
// promedio de los 5–20 puntos de cada distrito. Píxeles de ≈ 9 km: es una verificación cruzada, no verdad de campo.
import { fromUrl } from 'geotiff'
import type { Cultivo, Distrito, GaezZona } from '../../../packages/compartido/src/esquemas/datos.ts'
import { esperar, pedir, promedio, puntosDelDistrito, valorEn, type Punto, type Rejilla } from '../humedad/utilidades.ts'
import { especie } from './ecocrop-requisitos.ts'

export const TABLA = 'gaez_zona'
export const FUENTE = 'fao-gaez'
const SERVICIO = 'https://gaez-services.fao.org/server/rest/services'
const CAJA = { oeste: -86, este: -82.5, sur: 8, norte: 11.3 }

/** Cultivo GAEZ → especies (género + especie) para unirlo con `cultivos.nombre_cientifico`. Regla GZ-01. */
export const ESPECIES_GAEZ: Record<string, string[]> = {
  Alfalfa: ['medicago sativa'], Banana: ['musa acuminata', 'musa paradisiaca', 'musa balbisiana'], Barley: ['hordeum vulgare'],
  Buckwheat: ['fagopyrum esculentum'], Cabbage: ['brassica oleracea'], Carrot: ['daucus carota'], Cassava: ['manihot esculenta'],
  Chickpea: ['cicer arietinum'], Citrus: ['citrus sinensis', 'citrus limon', 'citrus reticulata', 'citrus aurantiifolia', 'citrus paradisi'],
  Cocoa: ['theobroma cacao'], Coconut: ['cocos nucifera'], Coffee: ['coffea arabica', 'coffea canephora'], Cotton: ['gossypium hirsutum'],
  Cowpea: ['vigna unguiculata'], 'Dry pea': ['pisum sativum'], 'Dryland rice': ['oryza sativa'], 'Wetland rice': ['oryza sativa'],
  Flax: ['linum usitatissimum'], 'Foxtail millet': ['setaria italica'], Gram: ['vigna radiata', 'vigna mungo'], Groundnut: ['arachis hypogaea'],
  Jatropha: ['jatropha curcas'], Maize: ['zea mays'], Oat: ['avena sativa'], 'Oil palm': ['elaeis guineensis'], Olive: ['olea europaea'],
  Onion: ['allium cepa'], 'Pearl millet': ['pennisetum glaucum'], 'Phaseolus bean': ['phaseolus vulgaris'], Pigeonpea: ['cajanus cajan'],
  Rapeseed: ['brassica napus'], Rye: ['secale cereale'], Sorghum: ['sorghum bicolor'], Soybean: ['glycine max'], Sugarbeet: ['beta vulgaris'],
  Sugarcane: ['saccharum officinarum'], Sunflower: ['helianthus annuus'], 'Sweet potato': ['ipomoea batatas'], Tea: ['camellia sinensis'],
  Tobacco: ['nicotiana tabacum'], Tomato: ['solanum lycopersicum', 'lycopersicon esculentum'], Wheat: ['triticum aestivum'],
  'White potato': ['solanum tuberosum'], Yam: ['dioscorea alata', 'dioscorea rotundata', 'dioscorea cayenensis'],
}

type Capas = { aptitud?: string; inicio?: string; duracion?: string }

async function consultar(servicio: 'res05' | 'res02', where: string) {
  const url = `${SERVICIO}/${servicio}/ImageServer/query?where=${encodeURIComponent(where)}&outFields=crop,variable,download_url&returnGeometry=false&f=json`
  const json = await (await pedir(url)).json()
  return (json.features as Array<{ attributes: { crop: string; variable: string; download_url: string } }>).map((f) => f.attributes)
}

/** Busca las capas por nombre con LIKE (sin objectids fijos; una variable trae doble espacio). */
async function capasPorCultivo(): Promise<Map<string, Capas>> {
  const capas = new Map<string, Capas>()
  const poner = (crop: string, k: keyof Capas, url: string) => capas.set(crop, { ...capas.get(crop), [k]: url })
  for (const a of await consultar('res05', "year='1981-2010' AND water_supply='Rainfed' AND input_level='Low' AND variable LIKE 'Suitability index%range%all land%'"))
    poner(a.crop, 'aptitud', a.download_url)
  for (const a of await consultar('res02', "year LIKE '1981%' AND water_supply LIKE '%rain-fed%' AND input_level='Low' AND (variable LIKE 'Beginning of crop growth cycle%' OR variable LIKE 'Length of crop growth cycle%')"))
    poner(a.crop, a.variable.startsWith('Beginning') ? 'inicio' : 'duracion', a.download_url)
  return capas
}

/** Lee solo la ventana de Costa Rica del GeoTIFF global (≈ 42 × 40 píxeles) con peticiones por rango. */
async function leerRejilla(url: string): Promise<Rejilla> {
  const img = await (await fromUrl(url)).getImage()
  const [x0, y0] = img.getOrigin() as [number, number]
  const [dx, dy] = img.getResolution() as [number, number]
  const c0 = Math.floor((CAJA.oeste - x0) / dx), f0 = Math.floor((CAJA.norte - y0) / dy)
  const c1 = Math.ceil((CAJA.este - x0) / dx), f1 = Math.ceil((CAJA.sur - y0) / dy)
  const [datos] = (await img.readRasters({ window: [c0, f0, c1, f1] })) as unknown as [ArrayLike<number>]
  return { datos, ancho: c1 - c0, c0, f0, x0, y0, dx, dy, nodata: img.getGDALNoData() }
}

/** Día del año (1–365) → mes (1–12), con un año no bisiesto. */
export const mesDelDia = (dia: number) => new Date(Date.UTC(2021, 0, Math.round(dia))).getUTCMonth() + 1

/** El valor que más se repite (para el día de inicio: promediar días del año cruzando diciembre no tiene sentido). */
function moda(valores: Array<number | null>) {
  const cuenta = new Map<number, number>()
  for (const v of valores) if (v !== null && v > 0) cuenta.set(v, (cuenta.get(v) ?? 0) + 1)
  return [...cuenta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/** Fila de un distrito × cultivo a partir de las capas GAEZ ya leídas. Puro. */
export function aFila(codigo: string, cultivoId: string, puntos: Punto[], capas: { aptitud?: Rejilla; inicio?: Rejilla; duracion?: Rejilla }): GaezZona {
  const apt = capas.aptitud ? promedio(puntos.map((p) => valorEn(capas.aptitud!, p)), 0).valor : null
  const inicio = capas.inicio ? moda(puntos.map((p) => valorEn(capas.inicio!, p))) : null
  const dur = capas.duracion ? promedio(puntos.map((p) => { const v = valorEn(capas.duracion!, p); return v && v > 0 ? v : null }), 0).valor : null
  return {
    codigo_distrito: codigo,
    cultivo_id: cultivoId,
    aptitud_pct: apt === null ? null : Math.round(apt) / 100, // índice 0–10000 → %
    mes_siembra: inicio === null ? null : mesDelDia(inicio),
    duracion_ciclo_dias: dur,
  }
}

export async function extraerGaez(distritos: Distrito[], cultivos: Cultivo[]): Promise<GaezZona[]> {
  // Cultivo del equipo → cultivo GAEZ. Si dos GAEZ caen en el mismo cultivo (arroz secano y de riego), se usan ambos y gana la mayor aptitud.
  const pares = Object.entries(ESPECIES_GAEZ).flatMap(([gaez, especies]) =>
    cultivos.filter((c) => especies.includes(especie(c.nombre_cientifico))).map((c) => ({ gaez, cultivoId: c.id })))
  const capas = await capasPorCultivo()
  const puntos = distritos.map((d) => ({ codigo: d.codigo_distrito, puntos: puntosDelDistrito(d) }))
  const mejor = new Map<string, GaezZona>()
  for (const { gaez, cultivoId } of pares) {
    const urls = capas.get(gaez)
    if (!urls?.aptitud) { console.warn(`GAEZ sin capa de aptitud para ${gaez}`); continue }
    const ventanas: Partial<Record<keyof Capas, Rejilla>> = {}
    for (const k of ['aptitud', 'inicio', 'duracion'] as const) if (urls[k]) { ventanas[k] = await leerRejilla(urls[k]!); await esperar(300) }
    for (const d of puntos) {
      const fila = aFila(d.codigo, cultivoId, d.puntos, ventanas)
      const clave = `${d.codigo}|${cultivoId}`
      const previa = mejor.get(clave)
      if (!previa || (fila.aptitud_pct ?? -1) > (previa.aptitud_pct ?? -1)) mejor.set(clave, fila)
    }
  }
  return [...mejor.values()]
}
