import { useEffect, useState } from 'react'
import { algolia, searchMissions } from '../lib/algolia.js'

export default function AlgoliaDemo() {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!algolia) return
    // Pequeño debounce para no lanzar una búsqueda por cada tecla.
    const t = setTimeout(() => {
      searchMissions(query)
        .then((h) => {
          setHits(h)
          setError(null)
        })
        .catch((e) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  return (
    <section className="card">
      <h2>Algolia</h2>
      {!algolia ? (
        <p className="muted">Sin configurar. Agrega VITE_ALGOLIA_APP_ID y VITE_ALGOLIA_SEARCH_KEY.</p>
      ) : (
        <input
          placeholder="Buscar misiones…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {error && <p className="error">{error}</p>}
      <ul>
        {hits.map((h) => (
          <li key={h.objectID}>
            <strong>{h.name}</strong> <span className="muted">{h.description}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
