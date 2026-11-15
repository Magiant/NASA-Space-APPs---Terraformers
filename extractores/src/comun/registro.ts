// Registro de cada corrida en la tabla `extracciones` (009_datos_extraidos.sql):
// fuente, inicio, fin, estado ('en_curso' | 'ok' | 'sin_cambios' | 'error'), registros, mensaje.
import { obtenerSupabase } from './supabase.ts'

export type EstadoExtraccion = 'en_curso' | 'ok' | 'sin_cambios' | 'error'

/** Abre la fila 'en_curso' y devuelve su id. En simulación no toca la base y devuelve null. */
export async function abrirExtraccion(fuente: string, simulacion: boolean): Promise<number | null> {
  if (simulacion) return null
  const { data, error } = await obtenerSupabase()
    .from('extracciones')
    .insert({ fuente, estado: 'en_curso' })
    .select('id')
    .single()
  if (error) throw new Error(`No se pudo registrar el inicio en extracciones: ${error.message}`)
  return data.id as number
}

export async function cerrarExtraccion(
  id: number | null, estado: EstadoExtraccion, registros: number, mensaje: string | null,
): Promise<void> {
  if (id === null) return
  const { error } = await obtenerSupabase()
    .from('extracciones')
    .update({ estado, registros, mensaje: mensaje?.slice(0, 4000) ?? null, fin: new Date().toISOString() })
    .eq('id', id)
  if (error) console.error(`✘ No se pudo cerrar la extracción ${id}: ${error.message}`)
}
