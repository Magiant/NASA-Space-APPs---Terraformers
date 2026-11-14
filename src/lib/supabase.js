import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// null si no hay credenciales: la app sigue funcionando sin Supabase.
export const supabase = url && anonKey ? createClient(url, anonKey) : null

/** Lee todas las misiones (requiere política RLS de lectura pública). */
export async function getMissions() {
  if (!supabase) throw new Error('Supabase no está configurado (.env)')
  const { data, error } = await supabase
    .from('missions')
    .select('id, name, description, year')
    .order('year', { ascending: true })
  if (error) throw error
  return data
}

/** Inserta una misión (requiere política RLS de inserción). */
export async function addMission(mission) {
  if (!supabase) throw new Error('Supabase no está configurado (.env)')
  const { data, error } = await supabase.from('missions').insert(mission).select().single()
  if (error) throw error
  return data
}
