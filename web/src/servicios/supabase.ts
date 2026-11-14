import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Publishable key (sb_publishable_...): segura en el navegador, el acceso lo limita RLS.
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !publishableKey) {
  console.warn('Supabase sin configurar: faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url ?? '', publishableKey ?? '')
