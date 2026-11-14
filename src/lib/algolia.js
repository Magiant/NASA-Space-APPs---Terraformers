import { liteClient } from 'algoliasearch/lite'

const appId = import.meta.env.VITE_ALGOLIA_APP_ID
const searchKey = import.meta.env.VITE_ALGOLIA_SEARCH_KEY
export const indexName = import.meta.env.VITE_ALGOLIA_INDEX || 'missions'

// Cliente "lite": solo búsqueda, usa la Search-Only API Key (segura en el navegador).
export const algolia = appId && searchKey ? liteClient(appId, searchKey) : null

/** Busca en el índice y devuelve los hits. */
export async function searchMissions(query, hitsPerPage = 5) {
  if (!algolia) throw new Error('Algolia no está configurado (.env)')
  const { results } = await algolia.search({
    requests: [{ indexName, query, hitsPerPage }],
  })
  return results[0].hits
}
