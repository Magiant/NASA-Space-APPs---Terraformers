// Inserta data/missions.json en la tabla "missions" de Supabase.
// Uso: npm run supabase:seed  (requiere .env con VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY)
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
if (!VITE_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

// La service role key salta RLS: úsala SOLO en scripts locales / backend.
const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const missions = JSON.parse(await readFile(new URL('../data/missions.json', import.meta.url)))
const rows = missions.map(({ objectID, ...rest }) => ({ slug: objectID, ...rest }))

const { data, error } = await supabase.from('missions').upsert(rows, { onConflict: 'slug' }).select()
if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}
console.log(`✔ ${data.length} misiones guardadas en Supabase`)
