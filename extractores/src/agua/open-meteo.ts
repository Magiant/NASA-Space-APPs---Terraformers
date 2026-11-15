// Tema 4 · ESTUDIO HÍDRICO — lluvia y ET0 por semana y mes → agua_zona (fuente 'open-meteo'). Corre DIARIO.
//
// Decisión D1 (aprobada): NO se vuelve a pedir a Open-Meteo. La lluvia y la ET0 diarias ya las guarda
// el tema 1 en clima_diario (fuente 'open-meteo'); aquí solo se suman. Pedirlas otra vez gastaría
// ~4 000 llamadas diarias más del cupo gratis (10 000).
//
// Actualiza la semana y el mes en curso y los anteriores (por datos tardíos). El balance usa la ET real
// de ECOSTRESS si ya hay para ese periodo; si no, la ET0.
import type { Argumentos } from '../comun/argumentos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { obtenerSupabase } from '../comun/supabase.ts'
import { agregarClima, claveAgua, inicioPeriodoCompleto, lunesDe, primerDiaMes, type DiaClima, type EtRealPorPeriodo, type TipoPeriodo } from './agregar.ts'

const DIA_MS = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Lee clima_diario de una fuente entre dos fechas, paginando (la API devuelve de a 1000). */
export async function leerClimaDiario(fuente: string, desde: string, hasta: string, codigos?: string[]): Promise<DiaClima[]> {
  const filas: DiaClima[] = []
  for (let pag = 0; ; pag += 1000) {
    let q = obtenerSupabase().from('clima_diario').select('codigo_distrito,fecha,lluvia_mm,evapotranspiracion_ref_mm')
      .eq('fuente', fuente).gte('fecha', desde).lte('fecha', hasta)
      .order('codigo_distrito').order('fecha').range(pag, pag + 999)
    if (codigos?.length) q = q.in('codigo_distrito', codigos)
    const { data, error } = await q
    if (error) throw new Error(`No se pudo leer clima_diario: ${error.message}`)
    filas.push(...(data as DiaClima[]))
    if (data.length < 1000) break
  }
  return filas
}

/** ET real de ECOSTRESS ya guardada en agua_zona, para el balance. */
export async function leerEtReal(desde: string, hasta: string): Promise<EtRealPorPeriodo> {
  const out: EtRealPorPeriodo = new Map()
  for (let pag = 0; ; pag += 1000) {
    const { data, error } = await obtenerSupabase().from('agua_zona')
      .select('codigo_distrito,periodo,tipo_periodo,evapotranspiracion_real_mm')
      .eq('fuente', 'ecostress').gte('periodo', desde).lte('periodo', hasta).range(pag, pag + 999)
    if (error) throw new Error(`No se pudo leer agua_zona (ecostress): ${error.message}`)
    for (const f of data) out.set(claveAgua(f.codigo_distrito, f.periodo, f.tipo_periodo as TipoPeriodo), f.evapotranspiracion_real_mm)
    if (data.length < 1000) break
  }
  return out
}

/**
 * Agrega un rango completo de clima_diario en semanas y meses. Solo se guardan los periodos que
 * quedan completos dentro del rango leído (o el periodo en curso), para no pisar un mes entero con
 * una suma parcial.
 */
export async function agregarRango(fuenteClima: string, fuenteAgua: string, desde: string, hasta: string, args: Argumentos, nombre: string) {
  const dias = await leerClimaDiario(fuenteClima, desde, hasta, args.distritos)
  const etReal = await leerEtReal(lunesDe(desde), hasta)
  console.log(`Agua (${fuenteAgua}) ${desde} → ${hasta}: ${dias.length} días de clima_diario (${fuenteClima})`)
  const lotes = (['semana', 'mes'] as TipoPeriodo[]).map((tipo) =>
    agregarClima(dias, tipo, fuenteAgua, etReal).filter((f) => f.periodo >= inicioPeriodoCompleto(desde, tipo)))
  await ejecutarExtractor({ fuente: nombre, tabla: 'agua_zona', lotes, simulacion: args.simulacion })
}

/** Corrida diaria: desde el lunes de hace 2 semanas o el día 1 del mes anterior (lo que sea antes). */
export async function extraerAguaOpenMeteo(args: Argumentos): Promise<void> {
  const ayer = iso(Date.now() - DIA_MS)
  const semana = lunesDe(iso(Date.now() - 14 * DIA_MS))
  const mesAnterior = primerDiaMes(iso(Date.parse(primerDiaMes(ayer)) - DIA_MS))
  const desde = args.desde ?? (semana < mesAnterior ? semana : mesAnterior)
  await agregarRango('open-meteo', 'open-meteo', desde, args.hasta ?? ayer, args, 'agua-open-meteo')
}
