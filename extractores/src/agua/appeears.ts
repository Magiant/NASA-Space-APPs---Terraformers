// Tema 4 · ESTUDIO HÍDRICO — ECOSTRESS vía AppEEARS → agua_zona (fuente 'ecostress'). Corre SEMANAL.
//
// Qué hace:
//   1. Pone de 5 a 20 puntos dentro de cada distrito (regla común PTS-01).
//   2. Pide a AppEEARS una muestra por punto (no imágenes) de las últimas 8 semanas:
//        ECO_L3T_JET.002 · ETdaily       → evapotranspiración real diaria (mm/día)   (decisión D3-b)
//        ECO_L4T_ESI.002 · ESI           → índice de estrés evaporativo (0 = mucho estrés, 1 = nada)
//        cloud y water de cada producto  → para descartar nubes y agua
//   3. Espera a que la tarea termine, baja el CSV y descarta puntos con nube o agua (por producto).
//
// Sobre ETdaily (probado el 14-nov-2026 con 3 distritos):
//   * ECO_L3T_ET_ALEXI.002 (la opción D3-a) no tiene pasadas sobre Costa Rica: AppEEARS no devuelve
//     ni el archivo de resultados. Por eso se usa ECO_L3T_JET.002.
//   * Los metadatos de AppEEARS/LP DAAC dicen "W/m²", pero los valores reales en Costa Rica salen
//     entre 0.6 y 3.2 (mediana 1.7): magnitudes de mm/día. Si fueran W/m² de 24 h darían ~0.06 mm/día,
//     imposible. Se guardan tal cual como mm/día. Confirmar con la guía de usuario de ECOSTRESS L3 JET.
//   4. Promedia por distrito y semana/mes. ECOSTRESS no pasa todos los días y Costa Rica es muy nublada:
//      muchos periodos quedan sin dato (null), y eso es correcto.
// Capas confirmadas en https://appeears.earthdatacloud.nasa.gov/api/product (14-nov-2026).
// Credenciales: EARTHDATA_TOKEN o EARTHDATA_USERNAME + EARTHDATA_PASSWORD (ver comun/appeears.ts).
import type { Distrito } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { muestrearPuntos, type CapaAppeears, type MuestraAppeears, type PuntoAppeears } from '../comun/appeears.ts'
import { cargarDistritos } from '../comun/distritos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { cantidadPuntos, puntosDentro, type Coordenada } from '../comun/puntos.ts'
import { agregarEcostress, inicioPeriodoCompleto, type ObsEcostress, type TipoPeriodo } from './agregar.ts'

const JET = 'ECO_L3T_JET.002'
const ESI = 'ECO_L4T_ESI.002'
export const CAPA_ET: CapaAppeears = { product: JET, layer: 'ETdaily' }
export const CAPA_ET_NUBE: CapaAppeears = { product: JET, layer: 'cloud' }
export const CAPA_ET_AGUA: CapaAppeears = { product: JET, layer: 'water' }
export const CAPA_ESI: CapaAppeears = { product: ESI, layer: 'ESI' }
export const CAPA_ESI_NUBE: CapaAppeears = { product: ESI, layer: 'cloud' }
export const CAPA_ESI_AGUA: CapaAppeears = { product: ESI, layer: 'water' }
export const CAPAS = [CAPA_ET, CAPA_ET_NUBE, CAPA_ET_AGUA, CAPA_ESI, CAPA_ESI_NUBE, CAPA_ESI_AGUA]
const k = (c: CapaAppeears) => `${c.product}/${c.layer}`

/** Rango físico razonable: ET diaria 0–15 mm; ESI 0–1. Fuera de eso se trata como sin dato. */
const enRango = (v: number | null, min: number, max: number) => (v !== null && v >= min && v <= max ? v : null)

/** Puntos para AppEEARS: id = `<código>#<n>` para saber a qué distrito pertenece cada muestra. */
export function puntosAppeears(distritos: Distrito[]): PuntoAppeears[] {
  return distritos.flatMap((d) => {
    const coords: Coordenada[] = d.poligono ? puntosDentro(d.poligono, cantidadPuntos(d.area_km2)) : [[d.lng, d.lat]]
    return coords.map(([lng, lat], i) => ({ id: `${d.codigo_distrito}#${i + 1}`, latitude: lat, longitude: lng, category: d.codigo_distrito }))
  })
}

/**
 * Muestras → observaciones limpias por distrito y fecha. Cada producto trae su propia máscara de nube y
 * agua: la ET se descarta con la máscara de JET y el ESI con la de ESI. Fuera de rango → null.
 */
export function limpiarMuestras(muestras: MuestraAppeears[]): ObsEcostress[] {
  const out: ObsEcostress[] = []
  const tapado = (m: MuestraAppeears, nube: CapaAppeears, agua: CapaAppeears) => m.valores[k(nube)] === 1 || m.valores[k(agua)] === 1
  for (const m of muestras) {
    const et = tapado(m, CAPA_ET_NUBE, CAPA_ET_AGUA) ? null : enRango(m.valores[k(CAPA_ET)] ?? null, 0, 15)
    const esi = tapado(m, CAPA_ESI_NUBE, CAPA_ESI_AGUA) ? null : enRango(m.valores[k(CAPA_ESI)] ?? null, 0, 1)
    if (et === null && esi === null) continue
    out.push({ codigo_distrito: m.id.split('#')[0], fecha: m.fecha, et_mm_dia: et, esi })
  }
  return out
}

export async function extraerAguaEcostress(args: Argumentos): Promise<void> {
  const distritos = await cargarDistritos({ codigos: args.distritos, archivo: args.distritosArchivo })
  const hasta = args.hasta ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  const desde = args.desde ?? new Date(Date.parse(hasta) - 56 * 86_400_000).toISOString().slice(0, 10)
  const puntos = puntosAppeears(distritos)
  console.log(`Agua ECOSTRESS ${desde} → ${hasta}: ${distritos.length} distritos, ${puntos.length} puntos`)
  const obs = limpiarMuestras(await muestrearPuntos('terraformes-ecostress', desde, hasta, CAPAS, puntos))
  console.log(`  ${obs.length} observaciones útiles (sin nube ni agua)`)
  // Solo periodos enteros dentro de la ventana: el mes o la semana del borde inicial quedarían
  // calculados con pocas pasadas y pisarían un valor más completo.
  const lotes = (['semana', 'mes'] as TipoPeriodo[]).map((t) =>
    agregarEcostress(obs, t).filter((f) => f.periodo >= inicioPeriodoCompleto(desde, t)))
  await ejecutarExtractor({ fuente: 'agua-ecostress', tabla: 'agua_zona', lotes, simulacion: args.simulacion })
}
