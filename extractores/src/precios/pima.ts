// Tema 3 · Precios mayoristas del PIMA-CENADA → tabla `precios_historico`. DIARIO (lunes a viernes).
//
// Fuente: "Boletín Diario de Precios sugeridos de Frutas y Hortalizas PIMA-CENADA" (SIMM), enlazado desde
// https://www.pima.go.cr/boletin/ → https://bpm.pima.go.cr/cm.aspx?id=4. El robots.txt del PIMA solo bloquea /wp-admin/.
//
// PRE-01  El portal (AuraPortal) arma la lista con JavaScript y los PDF solo se bajan desde una sesión del navegador,
//         así que se usa Chrome sin ventana (CHROME_PATH o google-chrome/chromium) por el protocolo DevTools.
//         Una sola sesión, consultas en serie con pausa de 3 s entre PDF. No se evade ningún bloqueo.
// PRE-02  El texto del PDF se saca con `pdftotext -layout` (poppler-utils; en Ubuntu: apt install poppler-utils).
// PRE-03  Cada fila: Producto · Unidad · Mínimo · Máximo · Moda · Promedio (₡ por unidad de comercialización).
//         La página 2 repite productos de la 1: se guarda una vez. `producto` = id del cultivo cuando es uno del
//         catálogo (papa, tomate…) y `variedad` el resto del nombre; si no, el nombre completo en minúscula.
// PRE-04  Se guardan los boletines que lista el portal (≈ las últimas 2 semanas). Correrlo cada día no duplica:
//         la llave es fuente + mercado + fecha + producto + variedad + unidad.
import { spawn, execFile } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { Precio } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { clasificarProducto } from '../comun/productos.ts'

const PORTAL = 'https://bpm.pima.go.cr/cm.aspx?id=4'
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

const numero = (s: string) => Number(s.replace(/,/g, ''))

/** Texto de `pdftotext -layout` de un boletín → filas de precios_historico (PRE-03). */
export function leerBoletin(texto: string): Precio[] {
  const f = texto.match(/Fecha de Plaza:\s*(\d{2})\/(\d{2})\/(\d{4})/)
  if (!f) throw new Error('Boletín PIMA sin "Fecha de Plaza"')
  const fecha_dato = `${f[3]}-${f[2]}-${f[1]}`
  const filas = new Map<string, Precio>()
  const linea = /^(\S.*?)\s{2,}(\S.*?)\s{2,}([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/
  for (const l of texto.split(/\r?\n/)) {
    const m = l.match(linea)
    if (!m) continue
    const [, original, unidad, min, max, moda, prom] = m
    const producto_original = original.trim()
    const { producto, variedad, cultivo_id } = clasificarProducto(producto_original)
    const fila: Precio = {
      fuente: 'pima', mercado: 'CENADA', fecha_dato, producto, variedad, producto_original, cultivo_id,
      unidad: unidad.trim(), moneda: 'CRC',
      precio_min: numero(min), precio_max: numero(max), precio_moda: numero(moda), precio_promedio: numero(prom),
      volumen_ton: null, procedencia_provincia: null,
    }
    filas.set(`${producto}|${variedad}|${fila.unidad}`, fila)
  }
  if (!filas.size) throw new Error(`Boletín PIMA del ${fecha_dato} sin filas de precios (¿cambió el formato?)`)
  return [...filas.values()]
}

function rutaChrome(): string {
  const candidatos = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean) as string[]
  const r = candidatos.find((c) => existsSync(c))
  if (!r) throw new Error('No se encontró Chrome: definir CHROME_PATH')
  return r
}

/** Baja con Chrome sin ventana los PDF que lista el portal (PRE-01). Devuelve las rutas descargadas. */
export async function descargarBoletines(dir: string, maximo = 15): Promise<string[]> {
  const perfil = mkdtempSync(join(tmpdir(), 'pima-chrome-'))
  const chrome = spawn(rutaChrome(), ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, 'about:blank'], { stdio: 'ignore' })
  try {
    let puerto = ''
    for (let i = 0; i < 100 && !puerto; i++) {
      await esperar(200)
      const f = join(perfil, 'DevToolsActivePort')
      if (existsSync(f)) puerto = readFileSync(f, 'utf8').split('\n')[0]
    }
    if (!puerto) throw new Error('Chrome no abrió el puerto de DevTools')
    const pestanas = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()) as { type: string; webSocketDebuggerUrl: string }[]
    const ws = new WebSocket(pestanas.find((t) => t.type === 'page')!.webSocketDebuggerUrl)
    let id = 0
    const pendientes = new Map<number, (v: any) => void>()
    ws.onmessage = (e) => { const m = JSON.parse(String(e.data)); pendientes.get(m.id)?.(m.result); pendientes.delete(m.id) }
    await new Promise((r, x) => { ws.onopen = r; ws.onerror = x })
    const enviar = (method: string, params = {}) => new Promise<any>((r) => { const i = ++id; pendientes.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

    await enviar('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dir })
    await enviar('Page.navigate', { url: PORTAL })
    let enlaces: string[] = []
    // El portal primero pasa por ScreenResolution.aspx; si a los 25 s no hay lista, se vuelve a abrir una vez.
    for (let i = 0; i < 60 && !enlaces.length; i++) {
      await esperar(1000)
      if (i === 25) await enviar('Page.navigate', { url: PORTAL })
      const r = await enviar('Runtime.evaluate', { expression: `JSON.stringify([...document.querySelectorAll('a[href*="AccessDoc"]')].map(a => a.href))` })
      enlaces = JSON.parse(r?.result?.value ?? '[]')
    }
    if (!enlaces.length) throw new Error('El portal del PIMA no mostró boletines')
    console.log(`  PIMA: ${enlaces.length} boletines en el portal; se bajan ${Math.min(maximo, enlaces.length)}`)
    for (const u of enlaces.slice(0, maximo)) {
      const antes = readdirSync(dir).length
      await enviar('Page.navigate', { url: u })
      for (let i = 0; i < 40 && readdirSync(dir).filter((f) => f.endsWith('.pdf')).length <= antes; i++) await esperar(500)
      await esperar(3000) // pausa entre consultas (política del proyecto)
    }
    ws.close()
    return readdirSync(dir).filter((f) => f.endsWith('.pdf')).map((f) => join(dir, f))
  } finally {
    // Esperar a que Chrome se cierre: si no, sigue escribiendo en el perfil mientras se borra.
    const cerrado = new Promise((r) => chrome.once('exit', r))
    chrome.kill()
    await Promise.race([cerrado, esperar(5000)])
    try { rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }) } catch { /* carpeta temporal: no importa */ }
  }
}

export async function extraerPima(a: Argumentos) {
  const dir = mkdtempSync(join(tmpdir(), 'pima-pdf-'))
  async function* lotes() {
    const pdfs = a.archivo ? [a.archivo] : await descargarBoletines(dir)
    for (const pdf of pdfs) {
      const { stdout } = await promisify(execFile)('pdftotext', ['-layout', pdf, '-'], { maxBuffer: 20e6 })
      const filas = leerBoletin(stdout)
      console.log(`  ${filas[0].fecha_dato}: ${filas.length} productos (${filas.filter((f) => f.cultivo_id).length} del catálogo)`)
      yield filas
    }
  }
  try {
    const r = await ejecutarExtractor({ fuente: 'precios-pima', tabla: 'precios_historico', lotes: lotes(), simulacion: a.simulacion })
    if (r.errores.length) throw new Error(r.errores.join('; '))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
