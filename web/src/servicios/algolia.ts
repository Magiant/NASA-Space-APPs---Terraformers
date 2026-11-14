import { liteClient } from 'algoliasearch/lite'

const appId = import.meta.env.VITE_ALGOLIA_APP_ID
// Search-Only API Key: segura en el navegador, solo permite buscar.
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY

if (!appId || !searchKey) {
  console.warn('Algolia sin configurar: faltan VITE_ALGOLIA_APP_ID / VITE_ALGOLIA_SEARCH_KEY')
}

export const algolia = liteClient(appId ?? '', searchKey ?? '')

/** Busca en un índice y devuelve los hits. */
export async function buscar<T = Record<string, unknown>>(indexName: string, query: string, hitsPerPage = 10) {
  const { results } = await algolia.search<T>({
    requests: [{ indexName, query, hitsPerPage }],
  })
  const [primero] = results
  return 'hits' in primero ? primero.hits : []
}
