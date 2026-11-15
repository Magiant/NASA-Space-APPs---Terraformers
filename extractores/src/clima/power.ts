// Tema 7 · TEMPERATURA DEL SECTOR — NASA POWER → clima_diario (fuente 'nasa-power'). Corre SEMANAL.
//
// Qué hace, en simple:
//   1. Pone de 5 a 20 puntos dentro de cada distrito (regla común PTS-01).
//   2. Averigua la altitud real de cada punto: terreno_zona.altitud_m (tema 9) o, si no hay,
//      la Elevation API de Open-Meteo (90 m).
//   3. Consulta NASA POWER UNA vez por celda (≈ 30 celdas en todo el país).
//   4. Corrige la temperatura de cada punto por altitud (obligatorio, PDF tema 7):
//        T_corregida = T − 0.0065 × (altitud_real − altitud_POWER)
//      porque POWER usa la altitud promedio de una celda de ~50 km, muy distinta en las montañas.
//   5. Promedia los puntos por distrito y día, valida con Zod y guarda (upsert).
//
// Parámetros confirmados (power.larc.nasa.gov, comunidad AG, 14-nov-2026): T2M, T2M_MAX, T2M_MIN (°C),
// PRECTOTCORR (mm/día), RH2M (%), ALLSKY_SFC_SW_DWN (MJ/m²/día), WS2M (m/s).
// POWER no publica ET0 FAO (EVPTRNS es evapotranspiración real del modelo, en energía): queda null (D2).
import type { ClimaDiario, Distrito } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { cargarDistritos } from '../comun/distritos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { altitudesTerreno, elevacionDePuntos } from '../comun/elevacion.ts'
import { celda, claveCelda, seriesCeldas, valorPower, type SerieCelda } from '../comun/power.ts'
import { cantidadPuntos, puntosDentro, type Coordenada } from '../comun/puntos.ts'

export const FUENTE = 'nasa-power'
/** Gradiente térmico fijado por el PDF (6.5 °C por km). */
export const GRADIENTE_C_POR_M = 0.0065

/** Parámetro de POWER → columna de clima_diario. Las tres temperaturas se corrigen por altitud. */
export const PARAMETROS = {
  T2M: 'temp_media_c',
  T2M_MAX: 'temp_max_c',
  T2M_MIN: 'temp_min_c',
  PRECTOTCORR: 'lluvia_mm',
  RH2M: 'humedad_relativa_pct',
  ALLSKY_SFC_SW_DWN: 'radiacion_mj_m2',
  WS2M: 'viento_ms',
} as const
const TEMPERATURAS = new Set(['T2M', 'T2M_MAX', 'T2M_MIN'])

export interface PuntoAltitud { celda: string; altitudM: number | null }

/** Corrección por altitud. Sin temperatura o sin altitud real → null (no se guarda sin corregir). */
export function corregirTemperatura(t: number | null, altitudReal: number | null, altitudPower: number): number | null {
  if (t === null || altitudReal === null) return null
  return t - GRADIENTE_C_POR_M * (altitudReal - altitudPower)
}

const media = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null)

/**
 * Filas de un distrito: por cada día, promedio de sus puntos. Las temperaturas se corrigen punto por
 * punto con la altitud de su celda; los puntos sin altitud no entran al promedio de temperatura.
 * Días sin ningún dato (POWER aún no publica, -999) no se guardan.
 */
export function filasDistrito(codigo: string, puntos: PuntoAltitud[], series: Map<string, SerieCelda>): ClimaDiario[] {
  const fechas = new Set<string>()
  for (const p of puntos) for (const k of Object.keys(series.get(p.celda)?.parametros.T2M ?? {})) fechas.add(k)
  const filas: ClimaDiario[] = []
  for (const f of [...fechas].sort()) {
    const fila: Record<string, unknown> = {
      codigo_distrito: codigo, fecha: `${f.slice(0, 4)}-${f.slice(4, 6)}-${f.slice(6, 8)}`, fuente: FUENTE,
      temp_corregida_altitud: true, evapotranspiracion_ref_mm: null,
    }
    let algunDato = false
    for (const [param, columna] of Object.entries(PARAMETROS)) {
      const valores: number[] = []
      for (const p of puntos) {
        const s = series.get(p.celda)
        if (!s) continue
        const v = valorPower(s.parametros[param]?.[f])
        const final = TEMPERATURAS.has(param) ? corregirTemperatura(v, p.altitudM, s.elevacionM) : v
        if (final !== null) valores.push(final)
      }
      fila[columna] = media(valores)
      if (valores.length) algunDato = true
    }
    if (algunDato) filas.push(fila as ClimaDiario)
  }
  return filas
}

/** Puntos de cada distrito con su celda de POWER y su altitud real. */
export async function prepararPuntos(distritos: Distrito[], simulacion: boolean): Promise<Map<string, PuntoAltitud[]>> {
  const coords = new Map<string, Coordenada[]>(distritos.map((d) => [
    d.codigo_distrito,
    d.poligono ? puntosDentro(d.poligono, cantidadPuntos(d.area_km2)) : [[d.lng, d.lat] as Coordenada],
  ]))
  // 1) altitud media del distrito si el tema 9 ya la cargó (en simulación no se lee la base)
  let terreno = new Map<string, number>()
  if (!simulacion) terreno = await altitudesTerreno([...coords.keys()])
  // 2) para el resto, altitud de cada punto con la Elevation API de Open-Meteo
  const sinTerreno = [...coords].filter(([c]) => !terreno.has(c))
  const planos = sinTerreno.flatMap(([, cs]) => cs)
  const alturas = planos.length ? await elevacionDePuntos(planos) : []
  let i = 0
  const out = new Map<string, PuntoAltitud[]>()
  for (const [codigo, cs] of coords) {
    out.set(codigo, cs.map(([lng, lat]) => ({
      celda: claveCelda(celda(lat, lng)),
      altitudM: terreno.has(codigo) ? terreno.get(codigo)! : null,
    })))
  }
  for (const [codigo] of sinTerreno) for (const p of out.get(codigo)!) p.altitudM = alturas[i++] ?? null
  console.log(`  Altitud: ${terreno.size} distritos desde terreno_zona, ${sinTerreno.length} con la Elevation API (${planos.length} puntos)`)
  return out
}

const isoMenosDias = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10)

/** Corre POWER → clima_diario para un rango de fechas (lo usan la corrida semanal y la histórica). */
export async function cargarPower(args: Argumentos, desde: string, hasta: string, nombre: string): Promise<void> {
  const distritos = await cargarDistritos({ codigos: args.distritos, archivo: args.distritosArchivo })
  const puntos = await prepararPuntos(distritos, args.simulacion)
  const celdas = [...new Set([...puntos.values()].flat().map((p) => p.celda))].map((k) => {
    const [lat, lng] = k.split(',').map(Number)
    return { lat, lng }
  })
  console.log(`Temperatura NASA POWER ${desde} → ${hasta}: ${distritos.length} distritos, ${celdas.length} celdas de POWER`)
  const series = await seriesCeldas(celdas, Object.keys(PARAMETROS), desde, hasta)
  function* lotes() {
    for (const [codigo, ps] of puntos) yield filasDistrito(codigo, ps, series)
  }
  await ejecutarExtractor({ fuente: nombre, tabla: 'clima_diario', lotes: lotes(), simulacion: args.simulacion })
}

/** Corrida semanal: últimos 21 días (POWER publica con ~3 días de atraso; así se completan los tardíos). */
export async function extraerTemperaturaPower(args: Argumentos): Promise<void> {
  await cargarPower(args, args.desde ?? isoMenosDias(21), args.hasta ?? isoMenosDias(1), 'temperatura-nasa-power')
}
