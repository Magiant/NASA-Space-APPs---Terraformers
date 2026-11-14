import { useState } from 'react'
import SupabaseDemo from './components/SupabaseDemo.jsx'
import AlgoliaDemo from './components/AlgoliaDemo.jsx'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="container">
      <h1>🚀 Hola mundo, Terraformers</h1>
      <p>React + Vite desplegado en GitHub Pages.</p>

      <button onClick={() => setCount((c) => c + 1)}>Contador: {count}</button>

      <div className="grid">
        <SupabaseDemo />
        <AlgoliaDemo />
      </div>
    </main>
  )
}
