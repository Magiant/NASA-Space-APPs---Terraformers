// Tema 1 · CLIMA — Open-Meteo → clima_diario (fuente 'open-meteo'). Corre DIARIO (diario.yml).
//
// Qué hace, en simple:
//   1. Lee los 492 distritos de Supabase (tabla `distritos`, tema 0).
//   2. Pone de 5 a 20 puntos DENTRO de cada distrito (más puntos si el distrito es grande).
//   3. Pide a Open-Meteo los últimos 7 días de esos puntos, muchos puntos por consulta.
//   4. Promedia los puntos de cada distrito, día por día.
//   5. Valida con Zod (ClimaDiario) y guarda con upsert; correrlo dos veces no duplica.
//
// Variables confirmadas en https://open-meteo.com/en/docs (14-nov-2026, con prueba real):
//   temperature_2m_mean/max/min (°C), precipitation_sum (mm), relative_humidity_2m_mean (%),
//   shortwave_radiation_sum (MJ/m²), wind_speed_10m_mean (m/s con wind_speed_unit=ms),
//   et0_fao_evapotranspiration (mm, ET0 FAO-56).
// Open-Meteo ya ajusta la temperatura a la altitud real de cada punto (modelo de elevación de 90 m),
// por eso temp_corregida_altitud = true.
// Límites del plan gratis (open-meteo.com/en/terms): < 10 000 llamadas/día, 5 000/hora, 600/min.
// Cada punto cuenta como una llamada si pide ≤ 10 variables y ≤ 14 días (open-meteo.com/en/pricing).
import type { ClimaDiario, Distrito } from '@terraformes/compartido'
import { cargarDistritos } from '../comun/distritos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { esperar, obtenerJson } from '../comun/http.ts'
import { cantidadPuntos, puntosDentro, type Coordenada } from '../comun/puntos.ts'
import type { Argumentos } from '../comun/argumentos.ts'

export const URL_PRONOSTICO = 'https://api.open-meteo.com/v1/forecast'
export const URL_HISTORICO = 'https://archive-api.open-meteo.com/v1/archive'
export const ZONA_HORARIA = 'America/Costa_Rica'

/** Variable de Open-Meteo → columna de clima_diario. */
export const VARIABLES = {
  temperature_2m_mean: 'temp_media_c',
  temperature_2m_max: 'temp_max_c',
  temperature_2m_min: 'temp_min_c',
  precipitation_sum: 'lluvia_mm',
  relative_humidity_2m_mean: 'humedad_relativa_pct',
  shortwave_radiation_sum: 'radiacion_mj_m2',
  wind_speed_10m_mean: 'viento_ms',
  et0_fao_evapotranspiration: 'evapotranspiracion_ref_mm',
} as const satisfies Record<string, keyof ClimaDiario>

type Columna = (typeof VARIABLES)[keyof typeof VARIABLES]
/** Puntos por consulta: muchos a la vez, pero sin URLs enormes. */
const PUNTOS_POR_CONSULTA = 50
/** Ritmo propio, por debajo de los límites de Open-Meteo (600/min y 5 000/hora). */
const LLAMADAS_POR_MINUTO = 400
const LLAMADAS_POR_HORA = 4500
/** Contador compartido por toda la corrida (la carga histórica llama varias veces a consultarPorTandas). */
const ritmo = { inicio: 0, llamadas: 0 }

async function respetarRitmo(costo: number): Promise<void> {
  if (!ritmo.inicio) ritmo.inicio = Date.now()
  ritmo.llamadas += costo
  const porMinuto = (ritmo.llamadas / LLAMADAS_POR_MINUTO) * 60_000
  const porHora = ritmo.llamadas > LLAMADAS_POR_HORA ? (ritmo.llamadas / LLAMADAS_POR_HORA) * 3_600_000 : 0
  const espera = Math.max(porMinuto, porHora) - (Date.now() - ritmo.inicio)
  if (espera > 0) await esperar(espera)
}

export interface PuntoDistrito { codigo: string; coord: Coordenada }

/** Respuesta diaria de Open-Meteo para UN punto. */
export interface RespuestaPunto {
  daily?: { time: string[] } & Partial<Record<keyof typeof VARIABLES, Array<number | null>>>
}

/** Puntos de todos los distritos (5–20 por distrito, dentro del polígono; el punto del distrito si no hay polígono). */
export function puntosDeDistritos(distritos: Distrito[], puntosMax?: number): PuntoDistrito[] {
  return distritos.flatMap((d) => {
    const n = Math.min(cantidadPuntos(d.area_km2), puntosMax ?? 20)
    const coords = d.poligono ? puntosDentro(d.poligono, n) : [[d.lng, d.lat] as Coordenada]
    return coords.map((coord) => ({ codigo: d.codigo_distrito, coord }))
  })
}

/** Costo en "llamadas" de Open-Meteo de pedir `puntos` durante `dias` días con 8 variables. */
export function costoLlamadas(puntos: number, dias: number): number {
  return puntos * Math.max(1, dias / 14) * Math.max(1, Object.keys(VARIABLES).length / 10)
}

/** Promedia, por distrito y día, los valores de todos sus puntos. Sin ningún valor = null (nunca 0). */
export function promediarPorDistrito(puntos: PuntoDistrito[], respuestas: RespuestaPunto[]): ClimaDiario[] {
  const acumulado = new Map<string, Record<Columna, number[]>>()
  respuestas.forEach((resp, i) => {
    const d = resp.daily
    if (!d?.time) return
    d.time.forEach((fecha, t) => {
      const clave = `${puntos[i].codigo}|${fecha}`
      let acc = acumulado.get(clave)
      if (!acc) {
        acc = Object.fromEntries(Object.values(VARIABLES).map((c) => [c, [] as number[]])) as Record<Columna, number[]>
        acumulado.set(clave, acc)
      }
      for (const [variable, columna] of Object.entries(VARIABLES) as Array<[keyof typeof VARIABLES, Columna]>) {
        const v = d[variable]?.[t]
        if (typeof v === 'number' && Number.isFinite(v)) acc[columna].push(v)
      }
    })
  })
  const media = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null)
  return [...acumulado.entries()].map(([clave, acc]) => {
    const [codigo_distrito, fecha] = clave.split('|')
    return {
      codigo_distrito, fecha, fuente: 'open-meteo', temp_corregida_altitud: true,
      ...Object.fromEntries(Object.values(VARIABLES).map((c) => [c, media(acc[c])])),
    } as ClimaDiario
  })
}

export function urlConsulta(base: string, coords: Coordenada[], rango: { desde?: string; hasta?: string; diasPasados?: number }): string {
  const q = new URLSearchParams({
    latitude: coords.map(([, lat]) => lat.toFixed(4)).join(','),
    longitude: coords.map(([lng]) => lng.toFixed(4)).join(','),
    daily: Object.keys(VARIABLES).join(','),
    wind_speed_unit: 'ms',
    timezone: ZONA_HORARIA,
  })
  if (rango.diasPasados !== undefined) {
    q.set('past_days', String(rango.diasPasados))
    q.set('forecast_days', '1')
  } else {
    q.set('start_date', rango.desde!)
    q.set('end_date', rango.hasta!)
  }
  return `${base}?${q}`
}

/**
 * Consulta Open-Meteo para todos los puntos, en grupos, respetando el ritmo por minuto.
 * Devuelve las filas ya promediadas por distrito, una tanda por cada grupo de distritos.
 */
export async function* consultarPorTandas(
  puntos: PuntoDistrito[], base: string, rango: Parameters<typeof urlConsulta>[2], dias: number,
): AsyncGenerator<ClimaDiario[]> {
  // Agrupar sin partir un distrito entre dos consultas, para poder promediarlo completo.
  const porDistrito = new Map<string, PuntoDistrito[]>()
  for (const p of puntos) porDistrito.set(p.codigo, [...(porDistrito.get(p.codigo) ?? []), p])
  const tandas: PuntoDistrito[][] = [[]]
  for (const grupo of porDistrito.values()) {
    if (tandas.at(-1)!.length + grupo.length > PUNTOS_POR_CONSULTA) tandas.push([])
    tandas.at(-1)!.push(...grupo)
  }
  for (const tanda of tandas.filter((t) => t.length)) {
    const respuesta = await obtenerJson<RespuestaPunto | RespuestaPunto[]>(urlConsulta(base, tanda.map((p) => p.coord), rango))
    const lista = Array.isArray(respuesta) ? respuesta : [respuesta]
    if (lista.length !== tanda.length) throw new Error(`Open-Meteo devolvió ${lista.length} puntos de ${tanda.length}`)
    yield promediarPorDistrito(tanda, lista)
    await respetarRitmo(costoLlamadas(tanda.length, dias))
  }
}

/** Fecha de hoy en Costa Rica (AAAA-MM-DD). */
export function hoyCostaRica(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date())
}

/** Corrida diaria: últimos 7 días completos (corrige datos tardíos), sin el día de hoy (todavía incompleto). */
export async function extraerClimaOpenMeteo(args: Argumentos): Promise<void> {
  const distritos = await cargarDistritos({ codigos: args.distritos, archivo: args.distritosArchivo })
  const puntos = puntosDeDistritos(distritos, args.puntosMax)
  const hoy = hoyCostaRica()
  console.log(`Clima Open-Meteo (diario): ${distritos.length} distritos, ${puntos.length} puntos, ` +
    `≈ ${Math.round(costoLlamadas(puntos.length, 8))} llamadas de Open-Meteo`)
  async function* lotes() {
    for await (const filas of consultarPorTandas(puntos, URL_PRONOSTICO, { diasPasados: 7 }, 8)) {
      yield filas.filter((f) => f.fecha < hoy)
    }
  }
  await ejecutarExtractor({ fuente: 'clima-open-meteo', tabla: 'clima_diario', lotes: lotes(), simulacion: args.simulacion })
}
