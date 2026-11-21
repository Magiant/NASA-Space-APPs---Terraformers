// Tema 3 · Precios nacionales semanales del CNP → tabla `precios_historico` (fuente 'cnp'). SEMANAL.
//
// Fuente: Consejo Nacional de Producción, Sistema de Información de Mercados (SIM) → Precios nacionales semanales →
// "Lista comparativa": https://www.cnp.go.cr/sim/Precios_Nac_Semanales.aspx
// Licencia: el portal se distribuye bajo Creative Commons Reconocimiento 4.0 (hay que citar al CNP) y sus términos de uso
// piden citar la fuente y no usar el material con fines comerciales. El portal no tiene robots.txt (responde 404).
//
// CNP-01  La página arma su contenido con la API del portal (app_httphandlers/subsitios.ashx): con id=322 y tree=1
//         devuelve el árbol de carpetas (Lista comparativa → 2026 …) y con el id de una carpeta, sus archivos.
//         No hace falta navegador: son dos consultas JSON y la descarga de cada Excel.
// CNP-02  Se usan los .xlsx de "Lista comparativa". Los .csv de esa carpeta y de "Granos básicos" se dejaron de
//         publicar en setiembre de 2026, y los .csv de granos son la hoja de trabajo del técnico con notas sueltas.
// CNP-03  Hoja "Lista Comparativa": fila "Producto | Unidad de Medida | Brunca | … | Promedio nacional" (regiones en
//         celdas combinadas) y debajo el tipo de mercado (Productor, CENADA, Borbon, Ferias). Cada celda con un número
//         es una fila de la tabla, con mercado = "Productor · Brunca", "Ferias · Promedio nacional"…
// CNP-04  Fecha: el título dice "Boletín N°43 / 26 de Octubre al 01 Noviembre 2026". Se guarda el viernes de esa semana
//         (al pie: productor = lunes a viernes, CENADA = el viernes, ferias = viernes a domingo). Si el título no trae
//         fechas, se usa la semana del nombre del archivo ("…_semana_44-2026.xlsx").
// CNP-05  Por defecto se bajan las 6 listas más recientes; con --desde=AAAA-MM-DD, todas desde esa fecha. Pausa de 2 s
//         entre archivos. Correrlo de nuevo no duplica: la llave es fuente + mercado + fecha + producto + variedad + unidad.
// CNP-06  La lista comparativa trae frijol (negro, rojo, blanco), papa, cebolla, chile, tomate y unos 100 productos más,
//         pero NO maíz, arroz ni café: esos siguen sin precio (ver docs/temas-3-5-8-9.md).
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import type { Precio } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { esperar, obtenerJson } from '../comun/http.ts'
import { clasificarProducto } from '../comun/productos.ts'

const PORTAL = 'https://www.cnp.go.cr/'
const API = `${PORTAL}app_httphandlers/subsitios.ashx?format=json&id=`
/** Carpeta "Precios Nacionales Semanales" del SIM (CNP-01). */
const ID_PRECIOS_SEMANALES = 322
const RECIENTES = 6

interface Nodo { text: string; idSubsitio: string; url: string; nodes?: Nodo[] }
interface Archivo { URL: string; filename: string; fechaUltimaModificacion: string }

/** Mes por sus tres primeras letras: aguanta errores de tipeo del boletín ("Dicembre") y "setiembre"/"septiembre". */
const MESES: Record<string, number> = {
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, set: 9, sep: 9, oct: 10, nov: 11, dic: 12,
}
const mes = (nombre?: string) => (nombre ? MESES[nombre.slice(0, 3)] : undefined)
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const iso = (d: Date) => d.toISOString().slice(0, 10)
const texto = (v: unknown) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim())

/** Viernes de la semana que empieza en esta fecha (los boletines van de lunes a domingo). */
function viernesDe(d: Date): string {
  return iso(new Date(d.getTime() + ((5 - d.getUTCDay() + 7) % 7) * 864e5))
}

/** Viernes de la semana ISO del nombre del archivo ("…_semana_44-2026.xlsx" → '2026-10-30'), o null. */
function fechaDelArchivo(archivo: string): string | null {
  const s = archivo.match(/semana[_-]?(\d{1,2})[_-](\d{4})/i)
  if (!s) return null
  const [semana, anio] = [Number(s[1]), Number(s[2])]
  const enero4 = new Date(Date.UTC(anio, 0, 4))
  const lunesSemana1 = enero4.getTime() - ((enero4.getUTCDay() + 6) % 7) * 864e5
  return iso(new Date(lunesSemana1 + ((semana - 1) * 7 + 4) * 864e5))
}

// Correccion - Poll: el boletin N°01 de 2026 dice "29 de Dicembre del 2025 al 04 de Enero 2026" (con error de tipeo
// y el año en medio); la fecha no se reconocia y se tomaba el "25" de "2025" como dia, lo que dio 30-ene y
// sobrescribio la semana del 30-ene. Ahora el mes se reconoce por sus 3 letras, se acepta el año del inicio, un dia
// nunca sale de dentro de otro numero y una fecha muy lejos de la semana del nombre del archivo se rechaza.
/**
 * CNP-04: "26 de Octubre al 01 Noviembre 2026", "del 07 al 11 de setiembre, 2026" o "29 de Dicembre del 2025 al 04 de
 * Enero 2026" → el viernes de esa semana. Si el título no trae fechas, la semana ISO del nombre del archivo.
 */
export function fechaDelBoletin(titulo: string, archivo = ''): string {
  // El mes (y el año) del inicio son opcionales: si la semana no cambia de mes, solo se escriben al final.
  const m = sinTildes(titulo).match(
    /(?<!\d)(\d{1,2})(?:\s+(?:de\s+)?([a-z]+)(?:\s+(?:del?\s+)?(\d{4}))?)?\s+al\s+(\d{1,2})\s+(?:de\s+)?([a-z]+)\s*,?\s+(?:del?\s+)?(\d{4})/,
  )
  const mesFin = mes(m?.[5])
  const mesInicio = m?.[2] ? mes(m[2]) : mesFin
  const delArchivo = fechaDelArchivo(archivo)
  if (m && mesInicio && mesFin) {
    // "28 de Diciembre al 03 Enero 2027": si el inicio no trae año, es el del final (o el anterior si cambia de año).
    const anio = m[3] ? Number(m[3]) : Number(m[6]) - (mesInicio > mesFin ? 1 : 0)
    const fecha = viernesDe(new Date(Date.UTC(anio, mesInicio - 1, Number(m[1]))))
    // Red de seguridad: el número de semana del archivo a veces va corrido una semana, pero nunca más.
    if (delArchivo && Math.abs(Date.parse(fecha) - Date.parse(delArchivo)) > 10 * 864e5) {
      throw new Error(`Lista comparativa ${archivo}: la fecha del título (${fecha}) no calza con la semana del archivo (${delArchivo})`)
    }
    return fecha
  }
  if (delArchivo) return delArchivo
  throw new Error(`Lista comparativa ${archivo}: no se encontró la fecha del boletín`)
}

/** CNP-03: Excel de la lista comparativa → filas de precios_historico. */
export function leerListaComparativa(libro: XLSX.WorkBook, archivo = ''): Precio[] {
  const hoja = libro.Sheets['Lista Comparativa'] ?? libro.Sheets[libro.SheetNames[0]]
  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, blankrows: true, defval: null, raw: true })
  const titulo = filas.flat().map(texto).find((c) => /bolet[ií]n/i.test(c) && /\d{4}/.test(c)) ?? ''
  const fecha_dato = fechaDelBoletin(titulo, archivo)

  const iEncabezado = filas.findIndex((f) => /^producto$/i.test(texto(f[0])))
  if (iEncabezado < 0) throw new Error(`Lista comparativa ${archivo}: no se encontró la fila "Producto" (¿cambió el formato?)`)
  const regiones = filas[iEncabezado]
  const tipos = filas[iEncabezado + 1] ?? []
  // Las regiones van en celdas combinadas: el nombre está en la primera columna y vale para las siguientes.
  const columnas: { i: number; mercado: string }[] = []
  let region = ''
  for (let i = 2; i < Math.max(regiones.length, tipos.length); i++) {
    if (texto(regiones[i])) region = texto(regiones[i])
    const tipo = texto(tipos[i]).replace(/^Borbon$/i, 'Borbón')
    if (region && tipo) columnas.push({ i, mercado: `${tipo} · ${region}` })
  }
  if (!columnas.length) throw new Error(`Lista comparativa ${archivo}: no se encontraron regiones ni mercados`)

  const salida = new Map<string, Precio>()
  for (const f of filas.slice(iEncabezado + 2)) {
    const original = texto(f[0])
    // Al pie vienen las notas ("1/ Los precios al productor…", "Informe elaborado por…", "www.cnp.go.cr…").
    if (!original || /^\d+\/|informe elaborado|www\./i.test(original)) continue
    const unidad = texto(f[1]) || 'sin unidad'
    const { producto, variedad, cultivo_id } = clasificarProducto(original)
    for (const c of columnas) {
      const celda = f[c.i]
      const valor = typeof celda === 'number' ? celda : Number(texto(celda).replace(/\s/g, '').replace(',', '.'))
      if (!Number.isFinite(valor) || valor <= 0) continue
      salida.set(`${c.mercado}|${producto}|${variedad}|${unidad}`, {
        fuente: 'cnp', mercado: c.mercado, fecha_dato, producto, variedad, producto_original: original, cultivo_id,
        unidad, moneda: 'CRC', precio_min: null, precio_max: null, precio_moda: null,
        precio_promedio: Math.round(valor * 100) / 100, volumen_ton: null, procedencia_provincia: null,
      })
    }
  }
  if (!salida.size) throw new Error(`Lista comparativa ${archivo} (${fecha_dato}) sin precios (¿cambió el formato?)`)
  return [...salida.values()]
}

/** CNP-01/05: los .xlsx de "Lista comparativa", del más reciente al más viejo, hasta tener los que hacen falta. */
async function listasDisponibles(desde?: string): Promise<Archivo[]> {
  const arbol = await obtenerJson<Nodo | Nodo[]>(`${API}${ID_PRECIOS_SEMANALES}&tree=1`)
  const buscar = (nodos: Nodo[]): Nodo | undefined => {
    for (const n of nodos) {
      if (/\/listacomparativa\/?$/i.test(n.url)) return n
      const hallado = buscar(n.nodes ?? [])
      if (hallado) return hallado
    }
  }
  const carpeta = buscar(Array.isArray(arbol) ? arbol : [arbol])
  if (!carpeta) throw new Error('El portal del CNP no tiene la carpeta "Lista comparativa" (¿cambió la estructura?)')
  const anios = (carpeta.nodes ?? []).filter((n) => /^\d{4}$/.test(n.text.trim())).sort((a, b) => Number(b.text) - Number(a.text))
  const anioDesde = desde ? Number(desde.slice(0, 4)) : null

  const archivos: { a: Archivo; anio: number; numero: number }[] = []
  for (const n of anios) {
    const anio = Number(n.text)
    if (anioDesde !== null ? anio < anioDesde : archivos.length >= RECIENTES) break
    const lista = await obtenerJson<Archivo[]>(`${API}${n.idSubsitio}`)
    for (const a of lista) {
      if (!/\.xlsx$/i.test(a.filename)) continue
      archivos.push({ a, anio, numero: Number(a.filename.match(/Comparativa_(\d+)/i)?.[1] ?? 0) })
    }
  }
  archivos.sort((x, y) => y.anio - x.anio || y.numero - x.numero)
  return (anioDesde !== null ? archivos : archivos.slice(0, RECIENTES)).map((x) => x.a)
}

/** Descarga un Excel del portal (pocos reintentos: es un sitio público que se consulta una vez por semana). */
async function bajarLibro(url: string): Promise<XLSX.WorkBook> {
  let ultimo: unknown
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) })
      if (r.ok) return XLSX.read(new Uint8Array(await r.arrayBuffer()))
      ultimo = new Error(`HTTP ${r.status} en ${url}`)
      if (r.status !== 429 && r.status < 500) break
    } catch (e) {
      ultimo = e
    }
    await esperar(3_000 * 2 ** i)
  }
  throw ultimo
}

export async function extraerCNP(a: Argumentos) {
  const fallos: string[] = []
  async function* lotes() {
    if (a.archivo) {
      yield leerListaComparativa(XLSX.read(readFileSync(a.archivo)), a.archivo)
      return
    }
    const archivos = await listasDisponibles(a.desde)
    console.log(`  CNP: ${archivos.length} listas comparativas por revisar`)
    for (const [i, f] of archivos.entries()) {
      if (i) await esperar(2_000) // pausa entre descargas (política del proyecto)
      try {
        const filas = leerListaComparativa(await bajarLibro(PORTAL + encodeURI(f.URL)), f.filename)
        if (a.desde && filas[0].fecha_dato < a.desde) continue
        const cultivos = [...new Set(filas.map((x) => x.cultivo_id).filter(Boolean))].join(', ')
        console.log(`  ${filas[0].fecha_dato} · ${f.filename}: ${filas.length} precios (cultivos del catálogo: ${cultivos || 'ninguno'})`)
        yield filas
      } catch (e) {
        // Un archivo dañado no detiene los demás; al final se avisa.
        fallos.push(`${f.filename}: ${(e as Error).message}`)
        console.error(`  ✘ ${f.filename}: ${(e as Error).message}`)
      }
    }
  }
  const r = await ejecutarExtractor({ fuente: 'precios-cnp', tabla: 'precios_historico', lotes: lotes(), simulacion: a.simulacion })
  const errores = [...r.errores, ...fallos]
  if (errores.length) throw new Error(errores.join('; '))
}
