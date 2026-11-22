// Lluvia por satélite · NASA GPM IMERG → tabla lluvia_satelite. Corre DIARIO (diario.yml), una vez por día nuevo.
//
// Qué hace, en simple:
//   1. Busca en el listado público de la NASA (GES DISC) el archivo diario "Early" de cada día: lluvia de todo el
//      mundo en celdas de 0,1° (≈ 11 km), unas horas después de terminar el día UTC.
//   2. Pide por OPeNDAP SOLO el recuadro de Costa Rica (37 × 35 celdas) en texto, en vez de bajar el archivo entero.
//      Los datos piden la cuenta de Earthdata (EARTHDATA_USERNAME y EARTHDATA_PASSWORD, la misma de ECOSTRESS); la
//      cuenta debe tener autorizada la aplicación "NASA GESDISC DATA ARCHIVE".
//   3. Para cada distrito toma de 5 a 20 puntos dentro de él (regla PTS-01), la lluvia de la celda de cada punto, y
//      promedia. Las celdas sin dato (-9999.9) no entran.
//   4. Guarda en lluvia_satelite y compara con la lluvia de Open-Meteo de los mismos días (resumen de la corrida):
//      así se decide con datos si conviene usarla en la web.
//
// Producto: GPM_3IMERGDE.07 (doi 10.5067/GPM/IMERGDE/DAY/07). Variable "precipitation" [time][lon][lat], mm/día.
import { appendFile } from 'node:fs/promises'
import type { LluviaSatelite } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { cargarDistritos } from '../comun/distritos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { cantidadPuntos, puntosDentro, type Coordenada } from '../comun/puntos.ts'
import { obtenerSupabase } from '../comun/supabase.ts'

const SERVIDOR = 'https://gpm1.gesdisc.eosdis.nasa.gov'
const PRODUCTO = 'GPM_3IMERGDE.07'
const URS = 'urs.earthdata.nasa.gov'
// Recuadro de Costa Rica en la rejilla de 0,1° (lon −179,95 + 0,1·i; lat −89,95 + 0,1·j): lon −86,05…−82,45, lat 7,95…11,35.
const LON = [939, 975]
const LAT = [979, 1013]
const SIN_DATO = -9000

const isoMenosDias = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10)

/** Días AAAA-MM-DD de `desde` a `hasta`, ambos incluidos. */
export function dias(desde: string, hasta: string): string[] {
  const out: string[] = []
  for (let t = Date.parse(desde); t <= Date.parse(hasta); t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}

// ---------------------------------------------------------------------
// Sesión de Earthdata: sigue las redirecciones del inicio de sesión de la NASA guardando las cookies.
// El usuario y la clave solo se mandan a urs.earthdata.nasa.gov.
// ---------------------------------------------------------------------
type Cookie = { dominio: string; valor: string }
export class SesionEarthdata {
  private galletas = new Map<string, Cookie>()
  private basico: string
  constructor(usuario: string, clave: string) {
    this.basico = 'Basic ' + Buffer.from(`${usuario}:${clave}`).toString('base64')
  }

  private cabeceras(url: URL): Record<string, string> {
    const h: Record<string, string> = {}
    const c = [...this.galletas].filter(([, g]) => url.hostname === g.dominio || url.hostname.endsWith('.' + g.dominio))
      .map(([nombre, g]) => `${nombre}=${g.valor}`).join('; ')
    if (c) h.Cookie = c
    if (url.hostname === URS) h.Authorization = this.basico
    return h
  }

  private guardar(url: URL, r: Response) {
    for (const linea of r.headers.getSetCookie()) {
      const [par, ...attrs] = linea.split(';')
      const i = par.indexOf('=')
      if (i < 1) continue
      const dominio = attrs.map((a) => a.trim()).find((a) => /^domain=/i.test(a))?.slice(7).replace(/^\./, '') ?? url.hostname
      this.galletas.set(par.slice(0, i).trim(), { dominio, valor: par.slice(i + 1).trim() })
    }
  }

  /** GET de texto con la sesión (hasta 10 redirecciones). */
  async texto(direccion: string): Promise<string> {
    let url = new URL(direccion)
    for (let i = 0; i < 10; i++) {
      const r = await fetch(url, { headers: this.cabeceras(url), redirect: 'manual', signal: AbortSignal.timeout(120_000) })
      this.guardar(url, r)
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        url = new URL(r.headers.get('location')!, url)
        continue
      }
      const cuerpo = await r.text()
      if (r.status === 401) throw new Error('Earthdata rechazó el usuario o la clave (EARTHDATA_USERNAME / EARTHDATA_PASSWORD).')
      if (url.hostname === URS) {
        throw new Error('Earthdata pide autorizar la aplicación "NASA GESDISC DATA ARCHIVE": entre a urs.earthdata.nasa.gov → Applications → Authorized Apps → Approve More Applications.')
      }
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${url.pathname}: ${cuerpo.slice(0, 200)}`)
      return cuerpo
    }
    throw new Error('Demasiadas redirecciones al iniciar sesión en Earthdata')
  }
}

// ---------------------------------------------------------------------
// Archivos y lectura del texto de OPeNDAP
// ---------------------------------------------------------------------
const listados = new Map<string, Promise<string[]>>()
/** Nombres de los archivos diarios de un mes (el listado es público). */
async function archivosDelMes(anio: string, mes: string): Promise<string[]> {
  const clave = `${anio}/${mes}`
  if (!listados.has(clave)) {
    listados.set(clave, fetch(`${SERVIDOR}/data/GPM_L3/${PRODUCTO}/${anio}/${mes}/`, { signal: AbortSignal.timeout(60_000) })
      .then((r) => (r.ok ? r.text() : ''))
      .then((html) => [...new Set(html.match(/3B-DAY-E\.MS\.MRG\.3IMERG\.\d{8}-S000000-E235959\.V\d+[A-Z]?\.nc4/g) ?? [])]))
  }
  return listados.get(clave)!
}

/** Rejilla de lluvia del recuadro: valores[iLon][jLat] y las coordenadas de cada índice. */
export interface Rejilla { lon: number[]; lat: number[]; valores: number[][] }

/**
 * Lee el texto que devuelve OPeNDAP (.ascii) para precipitation[0:0][LON][LAT]. Acepta los dos formatos de Hyrax:
 *   "[0][5], 0.1, 0.2, …"  o  "precipitation.precipitation[0][5], 0.1, 0.2, …"   (una fila por longitud)
 *   "precipitation.lon[37]" con los valores en la línea siguiente, o "precipitation.lon, -86.05, …" en la misma.
 * Si no vienen las coordenadas, se calculan de los índices de la rejilla (lon −179,95 + 0,1·i; lat −89,95 + 0,1·j).
 */
export function leerAscii(texto: string): Rejilla {
  const lineas = texto.split(/\r?\n/)
  const numeros = (s: string) => s.split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v))
  const valores: number[][] = []
  let lon: number[] = [], lat: number[] = []
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i].trim()
    const fila = l.match(/^(?:[\w.]*precipitation)?\[0\]\[(\d+)\],\s*(.*)$/)
    if (fila) { valores[+fila[1]] = numeros(fila[2]); continue }
    for (const [nombre, fijar] of [['lon', (v: number[]) => { lon = v }], ['lat', (v: number[]) => { lat = v }]] as const) {
      const m = l.match(new RegExp(`^(?:precipitation\\.)?${nombre}(?:\\[\\d+\\])?\\s*(?:,\\s*(.*))?$`))
      if (m) fijar(m[1] ? numeros(m[1]) : numeros(lineas[i + 1] ?? ''))
    }
  }
  const nLon = LON[1] - LON[0] + 1, nLat = LAT[1] - LAT[0] + 1
  if (valores.filter(Boolean).length !== nLon || valores.some((f) => f && f.length !== nLat)) {
    throw new Error(`Respuesta de OPeNDAP sin la rejilla completa (${valores.filter(Boolean).length} de ${nLon} filas; ¿cambió el formato?)`)
  }
  if (lon.length !== nLon) lon = Array.from({ length: nLon }, (_, i) => Math.round((-179.95 + 0.1 * (LON[0] + i)) * 100) / 100)
  if (lat.length !== nLat) lat = Array.from({ length: nLat }, (_, j) => Math.round((-89.95 + 0.1 * (LAT[0] + j)) * 100) / 100)
  return { lon, lat, valores }
}

/** Lluvia media de un distrito a partir de sus puntos: la celda más cercana a cada punto. */
export function lluviaDistrito(puntos: Coordenada[], r: Rejilla): { lluvia: number | null; celdas: number } {
  const usadas = new Map<string, number>()
  for (const [lng, lat] of puntos) {
    const i = Math.round((lng - r.lon[0]) / 0.1), j = Math.round((lat - r.lat[0]) / 0.1)
    const v = r.valores[i]?.[j]
    if (v === undefined || !Number.isFinite(v) || v < SIN_DATO) continue
    usadas.set(`${i},${j}`, v)
  }
  // Cada celda cuenta una vez (en distritos pequeños varios puntos caen en la misma).
  const vs = [...usadas.values()]
  if (!vs.length) return { lluvia: null, celdas: 0 }
  return { lluvia: Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 10) / 10, celdas: vs.length }
}

// ---------------------------------------------------------------------
// Extractor
// ---------------------------------------------------------------------
export async function extraerLluviaImerg(a: Argumentos) {
  const usuario = process.env.EARTHDATA_USERNAME, clave = process.env.EARTHDATA_PASSWORD
  if (!usuario || !clave) throw new Error('Faltan EARTHDATA_USERNAME y EARTHDATA_PASSWORD (cuenta de Earthdata de la NASA)')
  const sesion = new SesionEarthdata(usuario, clave)
  // Por defecto, los últimos 7 días hasta ayer (UTC): así se completan los que salieron tarde.
  const fechas = dias(a.desde ?? isoMenosDias(7), a.hasta ?? isoMenosDias(1))
  const distritos = await cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo })
  const puntos = new Map(distritos.map((d) => [
    d.codigo_distrito,
    d.poligono ? puntosDentro(d.poligono, cantidadPuntos(d.area_km2)) : [[d.lng, d.lat] as Coordenada],
  ]))
  console.log(`Lluvia GPM IMERG (${PRODUCTO}) ${fechas[0]} → ${fechas[fechas.length - 1]}: ${distritos.length} distritos`)

  const traidas: string[] = []
  async function* lotes() {
    for (const f of fechas) {
      const [anio, mes, dia] = f.split('-')
      const archivo = (await archivosDelMes(anio, mes)).find((n) => n.includes(`.${anio}${mes}${dia}-`))
      if (!archivo) { console.log(`  ${f}: la NASA todavía no publica ese día`); continue }
      const restriccion = encodeURIComponent(`precipitation[0:0][${LON[0]}:${LON[1]}][${LAT[0]}:${LAT[1]}]`)
      const rejilla = leerAscii(await sesion.texto(`${SERVIDOR}/opendap/GPM_L3/${PRODUCTO}/${anio}/${mes}/${archivo}.ascii?${restriccion}`))
      const filas: LluviaSatelite[] = []
      for (const [codigo, ps] of puntos) {
        const { lluvia, celdas } = lluviaDistrito(ps, rejilla)
        if (lluvia !== null) filas.push({ codigo_distrito: codigo, fecha: f, fuente: 'imerg', producto: 'early', lluvia_mm: lluvia, celdas })
      }
      console.log(`  ${f}: ${filas.length} distritos (${archivo})`)
      traidas.push(f)
      yield filas
    }
  }
  const r = await ejecutarExtractor({ fuente: 'lluvia-imerg', tabla: 'lluvia_satelite', lotes: lotes(), simulacion: a.simulacion })
  if (r.errores.length) throw new Error(r.errores.join('; '))
  if (!a.simulacion && traidas.length) await compararConOpenMeteo(traidas)
}

/**
 * Compara, por día, la lluvia de IMERG con la de Open-Meteo de los mismos distritos (promedio del país y diferencia
 * media por distrito). Ojo: el día de IMERG es UTC y el de Open-Meteo el de Costa Rica (6 horas de diferencia).
 */
async function compararConOpenMeteo(fechas: string[]) {
  const leer = async (tabla: string, fuente: string) => {
    const filas: { codigo_distrito: string; fecha: string; lluvia_mm: number | null }[] = []
    for (let i = 0; ; i += 1000) {
      const { data, error } = await obtenerSupabase().from(tabla).select('codigo_distrito,fecha,lluvia_mm')
        .eq('fuente', fuente).in('fecha', fechas).range(i, i + 999)
      if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`)
      filas.push(...(data as typeof filas))
      if (data.length < 1000) break
    }
    return new Map(filas.filter((f) => f.lluvia_mm != null).map((f) => [`${f.codigo_distrito}|${f.fecha}`, Number(f.lluvia_mm)]))
  }
  const [imerg, om] = await Promise.all([leer('lluvia_satelite', 'imerg'), leer('clima_diario', 'open-meteo')])
  const filas = ['| Día | IMERG (mm, promedio país) | Open-Meteo (mm) | Diferencia media por distrito (mm) | Distritos |', '|---|---|---|---|---|']
  for (const f of fechas) {
    const pares = [...imerg].filter(([k]) => k.endsWith(`|${f}`) && om.has(k)).map(([k, v]) => [v, om.get(k)!])
    if (!pares.length) { filas.push(`| ${f} | — | sin datos de Open-Meteo | — | 0 |`); continue }
    const prom = (i: number) => (pares.reduce((s, p) => s + p[i], 0) / pares.length).toFixed(1)
    const dif = (pares.reduce((s, [x, y]) => s + Math.abs(x - y), 0) / pares.length).toFixed(1)
    filas.push(`| ${f} | ${prom(0)} | ${prom(1)} | ${dif} | ${pares.length} |`)
  }
  console.log(['Comparación con Open-Meteo:', ...filas].join('\n'))
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, ['### Lluvia por satélite (GPM IMERG) frente a Open-Meteo', '', ...filas, ''].join('\n'))
  }
}
