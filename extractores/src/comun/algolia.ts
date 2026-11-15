import { algoliasearch } from 'algoliasearch'

const appId = process.env.VITE_ALGOLIA_APP_ID
// Write API key: permite escribir índices. Solo en extractores / CI, nunca en web/.
const writeKey = process.env.ALGOLIA_ADMIN_KEY

if (!appId || !writeKey) {
  throw new Error('Faltan VITE_ALGOLIA_APP_ID o ALGOLIA_ADMIN_KEY en el entorno')
}

export const algolia = algoliasearch(appId, writeKey)

/** Guarda (o actualiza) objetos en un índice. Cada objeto necesita un objectID estable. */
export async function guardarObjetos(indexName: string, objects: Array<Record<string, unknown> & { objectID: string }>) {
  return algolia.saveObjects({ indexName, objects, waitForTasks: true })
}

/** Reemplaza todo el contenido de un índice (borra lo que ya no venga en objects). */
export async function reemplazarIndice(indexName: string, objects: Array<Record<string, unknown> & { objectID: string }>) {
  return algolia.replaceAllObjects({ indexName, objects })
}
