// GET de JSON con reintentos (espera exponencial) ante errores temporales (429, 5xx, red).
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function obtenerJson<T = unknown>(url: string, intentos = 5, timeoutMs = 120_000): Promise<T> {
  let ultimo: unknown
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (r.ok) return (await r.json()) as T
      const cuerpo = await r.text()
      // 4xx que no sea 429 = error nuestro (parámetro mal escrito): no tiene sentido reintentar.
      if (r.status !== 429 && r.status < 500) throw Object.assign(new Error(`HTTP ${r.status}: ${cuerpo.slice(0, 300)}`), { definitivo: true })
      ultimo = new Error(`HTTP ${r.status}: ${cuerpo.slice(0, 200)}`)
      // 429 de Open-Meteo = límite por minuto: esperar al menos un minuto.
      await esperar(r.status === 429 ? 61_000 : 2_000 * 2 ** i)
    } catch (e) {
      if ((e as { definitivo?: boolean }).definitivo) throw e
      ultimo = e
      await esperar(2_000 * 2 ** i)
    }
  }
  throw ultimo
}

export { esperar }
