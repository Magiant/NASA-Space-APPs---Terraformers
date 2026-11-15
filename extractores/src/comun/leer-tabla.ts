// Lee una tabla completa de Supabase, en páginas de 1000 filas.
// La usan los extractores que dependen de lo que otro tema ya guardó
// (por ejemplo, ecocrop y gaez necesitan `cultivos`; capacidad-uso necesita `terreno_zona` y `suelos_zona`).
import type { NombreTabla } from '@terraformes/compartido'
import { obtenerSupabase } from './supabase.ts'

export async function leerTabla<T = Record<string, unknown>>(tabla: NombreTabla): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await obtenerSupabase().from(tabla).select('*').range(desde, desde + 999)
    if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`)
    filas.push(...(data as T[]))
    if (data.length < 1000) break
  }
  return filas
}
