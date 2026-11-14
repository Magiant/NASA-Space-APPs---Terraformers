// Comprueba que las credenciales de Supabase y Algolia funcionan, sin modificar nada.
// Uso local: node --env-file=.env extractores/src/comun/verificar-servicios.ts
import { supabase } from './supabase.ts'
import { algolia } from './algolia.ts'

let fallos = 0

try {
  const { error } = await supabase.auth.admin.listUsers({ perPage: 1 })
  if (error) throw error
  console.log('✔ Supabase: conectado')
} catch (e) {
  fallos++
  console.error('✘ Supabase:', (e as Error).message)
}

try {
  const { items } = await algolia.listIndices()
  console.log(`✔ Algolia: conectado (${items.length} índices)`)
} catch (e) {
  fallos++
  console.error('✘ Algolia:', (e as Error).message)
}

process.exit(fallos ? 1 : 0)
