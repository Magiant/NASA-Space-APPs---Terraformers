// Cliente de AppEEARS (NASA) para muestras por punto: login → crear tarea → esperar → bajar CSV.
// Lo usan el tema 4 (ECOSTRESS) y, después, el tema 2 (SMAP) y el tema 9 (SRTM, MODIS NDVI).
// Documentación: https://appeears.earthdatacloud.nasa.gov/api/
//
// Credenciales (solo por entorno):
//   EARTHDATA_USERNAME + EARTHDATA_PASSWORD  → POST /login (token Bearer que vence en ~48 h). NECESARIOS.
//   EARTHDATA_TOKEN → se prueba primero por si AppEEARS lo aceptara en el futuro; el 14-nov-2026
//                     respondió 403 con un token válido de Earthdata, así que hoy no basta solo.
import { esperar } from './http.ts'

export const URL_APPEEARS = 'https://appeears.earthdatacloud.nasa.gov/api'

export interface CapaAppeears { product: string; layer: string }
export interface PuntoAppeears { id: string; latitude: number; longitude: number; category?: string }
/** Una fila del CSV: id del punto, fecha y el valor de cada capa (`producto/capa` → número o null). */
export interface MuestraAppeears { id: string; fecha: string; valores: Record<string, number | null> }

let tokenEnMemoria: string | null = null

/** Token Bearer: primero EARTHDATA_TOKEN (si AppEEARS lo acepta); si no, login con usuario y contraseña. */
export async function obtenerToken(): Promise<string> {
  if (tokenEnMemoria) return tokenEnMemoria
  const token = process.env.EARTHDATA_TOKEN
  if (token) {
    const prueba = await fetch(`${URL_APPEEARS}/task?limit=1`, { headers: { Authorization: `Bearer ${token}` } })
    if (prueba.ok) return (tokenEnMemoria = token)
    console.warn(`  AppEEARS no aceptó EARTHDATA_TOKEN (HTTP ${prueba.status}); se intenta con usuario y contraseña.`)
  }
  const usuario = process.env.EARTHDATA_USERNAME
  const clave = process.env.EARTHDATA_PASSWORD
  if (!usuario || !clave) {
    throw new Error('Faltan credenciales de NASA Earthdata: EARTHDATA_USERNAME y EARTHDATA_PASSWORD (o un EARTHDATA_TOKEN que AppEEARS acepte).')
  }
  const r = await fetch(`${URL_APPEEARS}/login`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${usuario}:${clave}`).toString('base64')}`, 'Content-Length': '0' },
  })
  if (!r.ok) throw new Error(`Login de AppEEARS falló (HTTP ${r.status}). Revisa usuario/contraseña y que la cuenta haya entrado una vez a AppEEARS.`)
  return (tokenEnMemoria = ((await r.json()) as { token: string }).token)
}

async function pedir(ruta: string, init: RequestInit = {}): Promise<Response> {
  const r = await fetch(`${URL_APPEEARS}${ruta}`, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${await obtenerToken()}` },
  })
  if (!r.ok) throw new Error(`AppEEARS ${init.method ?? 'GET'} ${ruta}: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`)
  return r
}

/** AAAA-MM-DD → MM-DD-AAAA (formato de fechas de AppEEARS). */
export const fechaAppeears = (iso: string) => `${iso.slice(5, 7)}-${iso.slice(8, 10)}-${iso.slice(0, 4)}`

export async function crearTareaPuntos(nombre: string, desde: string, hasta: string, capas: CapaAppeears[], puntos: PuntoAppeears[]): Promise<string> {
  const cuerpo = {
    task_type: 'point',
    task_name: nombre,
    params: { dates: [{ startDate: fechaAppeears(desde), endDate: fechaAppeears(hasta) }], layers: capas, coordinates: puntos },
  }
  const r = await pedir('/task', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
  return ((await r.json()) as { task_id: string }).task_id
}

/** Revisa el estado cada `cadaMs` hasta 'done' o hasta `maxMs`. Devuelve true si terminó. */
export async function esperarTarea(id: string, maxMs = 90 * 60_000, cadaMs = 60_000): Promise<boolean> {
  const fin = Date.now() + maxMs
  for (;;) {
    const { status } = (await (await pedir(`/task/${id}`)).json()) as { status: string }
    if (status === 'done') return true
    if (status === 'error') throw new Error(`La tarea ${id} de AppEEARS terminó con error`)
    if (Date.now() + cadaMs > fin) return false
    await esperar(cadaMs)
  }
}

/** Baja todos los CSV de resultados de la tarea (uno por producto). */
export async function descargarCsv(id: string): Promise<string[]> {
  const { files } = (await (await pedir(`/bundle/${id}`)).json()) as { files: Array<{ file_id: string; file_name: string; file_type: string }> }
  const csv = files.filter((f) => f.file_type === 'csv' && !/granule-list|request|README/i.test(f.file_name))
  const textos: string[] = []
  for (const f of csv) textos.push(await (await pedir(`/bundle/${id}/${f.file_id}`, { redirect: 'follow' })).text())
  return textos
}

/** Separa una línea CSV respetando comillas. */
function celdas(linea: string): string[] {
  const out: string[] = []
  let actual = ''
  let comillas = false
  for (const c of linea) {
    if (c === '"') comillas = !comillas
    else if (c === ',' && !comillas) { out.push(actual); actual = '' }
    else actual += c
  }
  out.push(actual)
  return out
}

/**
 * Lee un CSV de AppEEARS. Las columnas de datos se llaman `<PRODUCTO>_<VERSION>_<capa>` con los
 * puntos cambiados por guion bajo (p. ej. `ECO_L4T_ESI_002_ESI`); aquí se devuelven como `producto/capa`.
 * Vacíos, NaN y textos no numéricos → null.
 */
export function leerCsvAppeears(texto: string, capas: CapaAppeears[]): MuestraAppeears[] {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim())
  if (lineas.length < 2) return []
  const cab = celdas(lineas[0])
  const iId = cab.indexOf('ID')
  const iFecha = cab.indexOf('Date')
  if (iId < 0 || iFecha < 0) throw new Error(`CSV de AppEEARS sin columnas ID/Date: ${cab.slice(0, 8).join(',')}`)
  const columnas = capas
    .map((c) => ({ clave: `${c.product}/${c.layer}`, i: cab.indexOf(`${c.product.replace(/\./g, '_')}_${c.layer}`) }))
    .filter((c) => c.i >= 0)
  return lineas.slice(1).map((l) => {
    const v = celdas(l)
    const valores: Record<string, number | null> = {}
    for (const c of columnas) {
      const n = Number(v[c.i])
      valores[c.clave] = v[c.i] === '' || !Number.isFinite(n) ? null : n
    }
    return { id: v[iId], fecha: v[iFecha].slice(0, 10), valores }
  })
}

/** Tarea completa: crea, espera y lee. Parte los puntos en tareas de `porTarea` para no pasar límites. */
export async function muestrearPuntos(
  nombre: string, desde: string, hasta: string, capas: CapaAppeears[], puntos: PuntoAppeears[], porTarea = 500,
): Promise<MuestraAppeears[]> {
  const todas: MuestraAppeears[] = []
  for (let i = 0; i < puntos.length; i += porTarea) {
    const parte = puntos.slice(i, i + porTarea)
    const id = await crearTareaPuntos(`${nombre}-${i / porTarea + 1}`, desde, hasta, capas, parte)
    console.log(`  AppEEARS: tarea ${id} con ${parte.length} puntos; esperando…`)
    if (!(await esperarTarea(id))) throw new Error(`La tarea ${id} de AppEEARS no terminó a tiempo; la próxima corrida la vuelve a pedir.`)
    // Cada producto viene en su propio CSV: se juntan por punto y fecha.
    const porClave = new Map<string, MuestraAppeears>()
    for (const csv of await descargarCsv(id)) {
      for (const m of leerCsvAppeears(csv, capas)) {
        const k = `${m.id}|${m.fecha}`
        const previa = porClave.get(k)
        if (previa) Object.assign(previa.valores, Object.fromEntries(Object.entries(m.valores).filter(([, x]) => x !== null)))
        else porClave.set(k, m)
      }
    }
    todas.push(...porClave.values())
  }
  return todas
}
