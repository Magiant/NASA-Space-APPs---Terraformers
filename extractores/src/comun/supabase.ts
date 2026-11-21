// Cliente de Supabase para extractores (llave service_role: salta RLS). Solo en extractores / CI,
// nunca en web/. Se crea al primer uso, así el modo simulación no exige credenciales.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cliente: SupabaseClient | null = null

// Correccion - Poll: si SUPABASE_URL llega vacia (GitHub entrega "" cuando el secreto no existe), usar VITE_SUPABASE_URL.
export function obtenerSupabase(): SupabaseClient {
  if (cliente) return cliente
  // SUPABASE_URL es el nombre que fija el equipo; VITE_SUPABASE_URL se acepta por compatibilidad.
  // `||` y no `??`: un texto vacío también cuenta como "no está".
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secretKey) {
    throw new Error('Faltan SUPABASE_URL (o VITE_SUPABASE_URL) o SUPABASE_SERVICE_ROLE_KEY en el entorno')
  }
  cliente = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return cliente
}

/** Compatibilidad con código que importaba `supabase` directamente (p. ej. verificar-servicios.ts). */
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_objetivo, propiedad) => Reflect.get(obtenerSupabase(), propiedad),
})
