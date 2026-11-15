// Conexión de los extractores de los temas 2 (humedad del suelo) y 10 (compatibilidad del sector)
// con la base común: cada función carga lo que necesita, llama al extractor y entrega las filas a
// ejecutarExtractor() (validar con Zod → upsert por lotes → registrar en `extracciones`).
// Detalle de cada fuente y sus reglas: docs/temas-2-y-10.md
import type { Cultivo, NombreTabla, SueloZona, TerrenoZona } from '@terraformes/compartido'
import type { Argumentos } from './comun/argumentos.ts'
import { cargarDistritos } from './comun/distritos.ts'
import { ejecutarExtractor } from './comun/ejecutar.ts'
import { leerTabla } from './comun/leer-tabla.ts'

const distritosDe = (a: Argumentos) => cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo })

/** Corre un extractor que devuelve todas sus filas de una vez (un solo lote). */
async function correr(a: Argumentos, fuente: string, tabla: NombreTabla, filas: Promise<unknown[]>, columnas?: readonly string[]) {
  const lote = await filas
  console.log(`${fuente}: ${lote.length} filas para ${tabla}${a.simulacion ? ' (simulación)' : ''}`)
  await ejecutarExtractor({ fuente, tabla, columnas: columnas ? [...columnas] : undefined, lotes: [lote], simulacion: a.simulacion })
}

/** Lee `cultivos` (tema 5). Si está vacía avisa, porque EcoCrop, GAEZ y el censo se unen por esa tabla. */
async function cultivos(): Promise<Cultivo[]> {
  const lista = await leerTabla<Cultivo>('cultivos')
  if (!lista.length) console.warn('⚠ La tabla cultivos está vacía (tema 5): no se guardará nada.')
  return lista
}

// ------------------------------- Tema 2 · Humedad del suelo -------------------------------

/** Diario: Open-Meteo, 3 profundidades, últimos 7 días. */
export async function humedadOpenMeteo(a: Argumentos) {
  const { extraerHumedadOpenMeteo, FUENTE, TABLA } = await import('./humedad/open-meteo.ts')
  await correr(a, `humedad-${FUENTE}`, TABLA, extraerHumedadOpenMeteo(await distritosDe(a)))
}

/** Semanal: NASA POWER (superficie, raíz y perfil), últimos 14 días. */
export async function humedadPower(a: Argumentos) {
  const { extraerHumedadPower, FUENTE, TABLA } = await import('./humedad/power.ts')
  await correr(a, `humedad-${FUENTE}`, TABLA, extraerHumedadPower(await distritosDe(a)))
}

// --------------------------- Tema 10 · Compatibilidad del sector ---------------------------

/** Una vez: propiedades del suelo de SoilGrids. */
export async function soilgrids(a: Argumentos) {
  const { extraerSuelos, FUENTE, TABLA } = await import('./cargas-unicas/soilgrids.ts')
  await correr(a, FUENTE, TABLA, extraerSuelos(await distritosDe(a)))
}

/** Una vez: requisitos de cada cultivo según EcoCrop. Necesita `cultivos`. */
export async function ecocrop(a: Argumentos) {
  const { extraerRequisitos, FUENTE, TABLA } = await import('./cargas-unicas/ecocrop-requisitos.ts')
  await correr(a, FUENTE, TABLA, extraerRequisitos(await cultivos()))
}

/** Una vez: aptitud FAO-GAEZ por distrito y cultivo. Necesita `distritos` y `cultivos`. */
export async function gaez(a: Argumentos) {
  const { extraerGaez, FUENTE, TABLA } = await import('./cargas-unicas/gaez.ts')
  await correr(a, FUENTE, TABLA, extraerGaez(await distritosDe(a), await cultivos()))
}

/** Una vez: % de cada distrito en áreas protegidas (WDPA). Necesita WDPA_API_TOKEN. */
export async function areasProtegidas(a: Argumentos) {
  if (!process.env.WDPA_API_TOKEN) throw new Error('Falta WDPA_API_TOKEN (token gratis en https://api.protectedplanet.net/request)')
  const { extraerAreasProtegidas, FUENTE, TABLA, COLUMNAS } = await import('./cargas-unicas/areas-protegidas.ts')
  await correr(a, FUENTE, TABLA, extraerAreasProtegidas(await distritosDe(a)), COLUMNAS)
}

/** Una vez, en local: censo agropecuario 2014 desde el Excel del INEC bajado a mano (CENSO_EXCEL). */
export async function censo(a: Argumentos) {
  const ruta = process.env.CENSO_EXCEL
  if (!ruta) throw new Error('Falta CENSO_EXCEL con la ruta al Excel del INEC (ver docs/temas-2-y-10.md, CEN-01)')
  const { extraerCenso, FUENTE, TABLA } = await import('./cargas-unicas/censo.ts')
  await correr(a, FUENTE, TABLA, extraerCenso(ruta, await cargarDistritos({ archivo: a.distritosArchivo }), await cultivos()))
}

/** Una vez, al final: clase de capacidad de uso indicativa. Necesita pendiente (tema 9) y suelo (soilgrids). */
export async function capacidadUso(a: Argumentos) {
  const { calcularCapacidadUso, FUENTE, TABLA, COLUMNAS } = await import('./cargas-unicas/capacidad-uso.ts')
  const [terreno, suelos] = await Promise.all([leerTabla<TerrenoZona>('terreno_zona'), leerTabla<SueloZona>('suelos_zona')])
  if (!terreno.some((t) => t.pendiente_pct !== null)) console.warn('⚠ terreno_zona no tiene pendiente (tema 9): las clases quedarán en null.')
  await correr(a, FUENTE, TABLA, Promise.resolve(calcularCapacidadUso(terreno, suelos)), COLUMNAS)
}
