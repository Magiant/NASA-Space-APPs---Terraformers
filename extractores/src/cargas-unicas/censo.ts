// Tema 10 · Censo Agropecuario 2014 (INEC): qué se siembra en cada cantón → tabla `censo_canton`. UNA VEZ.
// INEC no tiene API y su sitio bloquea descargas automáticas (403): el cuadro se baja a mano desde el navegador
// y se pasa la ruta del Excel. Se busca la hoja cuyo encabezado tenga columnas de cantón, cultivo, área y fincas.
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import type { CensoCanton, Cultivo, Distrito } from '../../../packages/compartido/src/esquemas/datos.ts'

export const TABLA = 'censo_canton'
export const FUENTE = 'inec-censo-2014'

/** "San Carlos" / "SAN CARLOS" / "Sán Carlos" → "san carlos", para comparar nombres. */
export const normalizar = (s: unknown) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

const COLUMNAS = {
  canton: /^canton/,
  cultivo: /^(cultivo|producto)/,
  area: /(superficie|area)/,
  fincas: /(fincas|explotaciones)/,
} as const

/**
 * Filas del censo a partir de una tabla (primera fila con los 4 encabezados = encabezado). Puro.
 * Cantón por nombre (o código CRxxx) usando los distritos; cultivo por nombre o id de la tabla `cultivos`.
 */
export function aFilas(tabla: unknown[][], distritos: Pick<Distrito, 'codigo_canton' | 'canton'>[], cultivos: Pick<Cultivo, 'id' | 'nombre'>[]) {
  const iEnc = tabla.findIndex((f) => Object.values(COLUMNAS).every((re) => f.some((c) => re.test(normalizar(c)))))
  if (iEnc < 0) throw new Error('No se encontró el encabezado (cantón, cultivo, superficie/área, fincas) en el Excel')
  const enc = tabla[iEnc]!.map(normalizar)
  const col = (re: RegExp) => enc.findIndex((c) => re.test(c))
  const [cCanton, cCultivo, cArea, cFincas] = [col(COLUMNAS.canton), col(COLUMNAS.cultivo), col(COLUMNAS.area), col(COLUMNAS.fincas)]

  const cantones = new Map(distritos.flatMap((d) => [[normalizar(d.canton), d.codigo_canton], [d.codigo_canton.toLowerCase(), d.codigo_canton]] as const))
  const porNombre = new Map(cultivos.flatMap((c) => [[normalizar(c.nombre), c.id], [c.id, c.id]] as const))
  const num = (v: unknown) => {
    if (typeof v === 'number') return v
    let s = String(v ?? '').replace(/[\s  ]/g, '')
    // Formato del INEC: espacio de miles y coma decimal ("12 345,5"). Con coma, el punto es separador de miles.
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
    const n = Number(s)
    return s && Number.isFinite(n) ? n : null
  }

  const filas = new Map<string, CensoCanton>()
  const sinCanton = new Set<string>(), sinCultivo = new Set<string>()
  for (const f of tabla.slice(iEnc + 1)) {
    const canton = cantones.get(normalizar(f[cCanton]))
    const cultivo = porNombre.get(normalizar(f[cCultivo]))
    if (!canton) { if (f[cCanton]) sinCanton.add(String(f[cCanton])); continue }
    if (!cultivo) { if (f[cCultivo]) sinCultivo.add(String(f[cCultivo])); continue }
    filas.set(`${canton}|${cultivo}`, { codigo_canton: canton, cultivo_id: cultivo, area_ha: num(f[cArea]), fincas: num(f[cFincas]) })
  }
  return { filas: [...filas.values()], sinCanton: [...sinCanton], sinCultivo: [...sinCultivo] }
}

export async function extraerCenso(rutaExcel: string, distritos: Distrito[], cultivos: Cultivo[]): Promise<CensoCanton[]> {
  const libro = XLSX.read(readFileSync(rutaExcel))
  for (const nombre of libro.SheetNames) {
    const tabla = XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[nombre]!, { header: 1, blankrows: false })
    try {
      const r = aFilas(tabla, distritos, cultivos)
      if (r.sinCanton.length) console.warn('Cantones sin código:', r.sinCanton.slice(0, 10).join(', '))
      if (r.sinCultivo.length) console.warn(`Cultivos del censo sin pareja en \`cultivos\` (${r.sinCultivo.length}):`, r.sinCultivo.slice(0, 15).join(', '))
      return r.filas
    } catch { /* probar la siguiente hoja */ }
  }
  throw new Error(`Ninguna hoja de ${rutaExcel} tiene las columnas cantón, cultivo, superficie/área y fincas`)
}
