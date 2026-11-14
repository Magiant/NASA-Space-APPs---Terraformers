// Lee la tabla "missions" de Supabase y la replica en Algolia (reemplaza el índice).
// Uso: npm run sync:supabase-algolia
import { createClient } from '@supabase/supabase-js'
import { algoliasearch } from 'algoliasearch'

const {
  VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  VITE_ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY,
  VITE_ALGOLIA_INDEX = 'missions',
} = process.env

const required = { VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY }
const missing = Object.keys(required).filter((k) => !required[k])
if (missing.length) {
  console.error('Faltan variables en .env:', missing.join(', '))
  process.exit(1)
}

const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const algolia = algoliasearch(VITE_ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)

const { data, error } = await supabase.from('missions').select('slug, name, description, year')
if (error) {
  console.error('Supabase:', error.message)
  process.exit(1)
}

// Algolia necesita un objectID estable: usamos el slug.
const objects = data.map(({ slug, ...rest }) => ({ objectID: slug, ...rest }))

// replaceAllObjects borra del índice lo que ya no existe en Supabase.
await algolia.replaceAllObjects({ indexName: VITE_ALGOLIA_INDEX, objects })
console.log(`✔ ${objects.length} registros sincronizados Supabase → Algolia`)
