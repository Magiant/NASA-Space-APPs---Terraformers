import { useEffect, useState } from 'react'
import { supabase, getMissions } from '../lib/supabase.js'

export default function SupabaseDemo() {
  const [missions, setMissions] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) return
    getMissions()
      .then(setMissions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="card">
      <h2>Supabase</h2>
      {!supabase && (
        <p className="muted">Sin configurar. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p>
      )}
      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="error">{error}</p>}
      <ul>
        {missions.map((m) => (
          <li key={m.id}>
            <strong>{m.name}</strong> ({m.year})
          </li>
        ))}
      </ul>
    </section>
  )
}
