// Sube data/missions.json al índice de Algolia.
// Uso: npm run algolia:seed  (requiere .env con VITE_ALGOLIA_APP_ID y ALGOLIA_ADMIN_KEY)
import { readFile } from 'node:fs/promises'
import { algoliasearch } from 'algoliasearch'

const { VITE_ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY, VITE_ALGOLIA_INDEX = 'missions' } = process.env
if (!VITE_ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error('Faltan VITE_ALGOLIA_APP_ID o ALGOLIA_ADMIN_KEY en .env')
  process.exit(1)
}

// La admin key permite escribir: NUNCA la expongas en el frontend.
const client = algoliasearch(VITE_ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY)

const objects = JSON.parse(await readFile(new URL('../data/missions.json', import.meta.url)))

await client.saveObjects({ indexName: VITE_ALGOLIA_INDEX, objects, waitForTasks: true })
await client.setSettings({
  indexName: VITE_ALGOLIA_INDEX,
  indexSettings: {
    searchableAttributes: ['name', 'description'],
    customRanking: ['desc(year)'],
  },
})
console.log(`✔ ${objects.length} objetos indexados en "${VITE_ALGOLIA_INDEX}"`)
