// Tema 7 · OLAS DE CALOR — clima_diario → olas_calor (013_olas_calor.sql). Corre SEMANAL, después de
// 'temperatura-power'. No consulta APIs: solo lee lo que ya guardaron los temas 1 y 7.
//
// Por cada distrito y fuente ('nasa-power' y 'open-meteo'):
//   1. Lee toda su serie diaria de clima_diario.
//   2. Calcula el umbral de cada mes: percentil 90 de las máximas de ese mes en el histórico
//      (necesita al menos 2 años con datos en ese mes; si no, ese mes no tiene olas).
//   3. Detecta rachas de 3+ días seguidos por encima del umbral y las guarda (upsert por inicio:
//      una ola abierta que sigue creciendo se actualiza en la corrida siguiente).
import type { OlaCalor } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { cargarDistritos } from '../comun/distritos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { obtenerSupabase } from '../comun/supabase.ts'
import { detectarOlas, umbralesOla, type Dia } from './termico.ts'

export const FUENTES = ['nasa-power', 'open-meteo'] as const
export const PERCENTIL = 90
export const DIAS_OLA = 3

/** Serie diaria de un distrito y una fuente, en orden, en páginas de 1000 filas. */
async function serieDistrito(codigo: string, fuente: string): Promise<Dia[]> {
  const filas: Dia[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await obtenerSupabase().from('clima_diario')
      .select('fecha,temp_media_c,temp_max_c,temp_min_c')
      .eq('codigo_distrito', codigo).eq('fuente', fuente)
      .order('fecha').range(desde, desde + 999)
    if (error) throw new Error(`No se pudo leer clima_diario de ${codigo}: ${error.message}`)
    filas.push(...(data as Dia[]))
    if (data.length < 1000) break
  }
  return filas
}

/** Filas de olas_calor para una serie (función pura, se prueba sin red). */
export function filasOlas(codigo: string, fuente: (typeof FUENTES)[number], serie: Dia[]): OlaCalor[] {
  const umbrales = umbralesOla(serie, { p: PERCENTIL, aniosMin: 2 })
  return detectarOlas(serie, umbrales, { diasOla: DIAS_OLA }).map((o) => ({
    codigo_distrito: codigo,
    fuente,
    inicio: o.inicio,
    fin: o.fin,
    dias: o.dias_totales,
    temp_max_media_c: o.temp_max_media_c,
    temp_max_pico_c: o.temp_max_pico_c,
    umbral_c: umbrales[Number(o.inicio.slice(5, 7)) - 1],
    abierta: o.abierta_al_cierre_serie,
  }))
}

export async function extraerOlasCalor(args: Argumentos): Promise<void> {
  const distritos = await cargarDistritos({ codigos: args.distritos, archivo: args.distritosArchivo })
  console.log(`Olas de calor: ${distritos.length} distritos × ${FUENTES.length} fuentes (sin llamadas a APIs)`)
  async function* lotes() {
    for (const d of distritos) {
      for (const fuente of FUENTES) {
        const serie = await serieDistrito(d.codigo_distrito, fuente)
        if (serie.length) yield filasOlas(d.codigo_distrito, fuente, serie)
      }
    }
  }
  await ejecutarExtractor({ fuente: 'olas-calor', tabla: 'olas_calor', lotes: lotes(), simulacion: args.simulacion })
}
