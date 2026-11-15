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

/**
 * GET de una página (HTML o texto) con los mismos reintentos. Pocos intentos: se usa con sitios
 * públicos a los que se consulta una vez por corrida. 403/404/410 no se reintentan (no son temporales).
 */
export async function obtenerTexto(url: string, intentos = 3, timeoutMs = 60_000): Promise<string> {
  let ultimo: unknown
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'text/html,*/*' } })
      if (r.ok) return await r.text()
      if (r.status !== 429 && r.status < 500) throw Object.assign(new Error(`HTTP ${r.status} en ${url}`), { definitivo: true })
      ultimo = new Error(`HTTP ${r.status} en ${url}`)
      await esperar(r.status === 429 ? 61_000 : 3_000 * 2 ** i)
    } catch (e) {
      if ((e as { definitivo?: boolean }).definitivo) throw e
      ultimo = e
      await esperar(3_000 * 2 ** i)
    }
  }
  throw ultimo
}

/** Texto plano de un trozo de HTML: sin etiquetas, entidades decodificadas y espacios normalizados. */
export function textoDeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim()
}

export { esperar }
