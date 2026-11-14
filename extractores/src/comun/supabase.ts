import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
// Secret key (sb_secret_...): salta RLS. Solo en extractores / CI, nunca en web/.
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !secretKey) {
  throw new Error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno')
}

export const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
