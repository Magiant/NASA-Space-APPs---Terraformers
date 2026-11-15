// Tema 8 · Primera versión de datos/riesgos/amenazas.csv, ESTIMADA con datos ya guardados en la base.
//
// La CNE solo publica sus mapas de amenazas en PDF por cantón (docs/fenomenos-naturales.md), así que no se pueden
// leer automáticamente. Mientras alguien los revisa a mano, este comando escribe un CSV con estimaciones transparentes;
// la columna `fuente` dice de dónde sale cada fila (empieza con "estimado:"). Después se carga con `amenazas`, igual
// que un CSV revisado. Si el equipo corrige filas a mano, NO volver a correr este comando (las sobrescribe).
//
// AME-01  Volcán: distancia del centro del distrito a los 5 volcanes activos que vigila el OVSICORI.
//         < 10 km muy_alto · < 20 km alto · < 35 km medio. Más lejos: sin fila.
// AME-02  Deslizamiento: pendiente media del distrito (terreno_zona, SRTM).
//         ≥ 30 % muy_alto · ≥ 20 % alto · ≥ 12 % medio · resto bajo. Meses: los de lluvia normal ≥ 250 mm.
// AME-03  Sequía: meses con lluvia normal < 50 mm (clima_normales, NASA POWER).
//         ≥ 6 muy_alto · 4–5 alto · 2–3 medio · 1 bajo · 0 sin fila. Meses: esos meses secos.
// AME-04  Inundación: zonas bajas y planas. altitud < 50 m y pendiente < 4 % alto · altitud < 150 m y pendiente < 6 % medio.
//         Meses: los de lluvia normal ≥ 250 mm (o los 3 más lluviosos si ninguno llega).
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Distrito, TerrenoZona } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { cargarDistritos } from '../comun/distritos.ts'
import { leerTabla } from '../comun/leer-tabla.ts'
import { obtenerSupabase } from '../comun/supabase.ts'

const ARCHIVO = 'datos/riesgos/amenazas.csv'

/** Volcanes activos vigilados por el OVSICORI-UNA (cráter principal, WGS84). */
export const VOLCANES = [
  { nombre: 'Rincón de la Vieja', lat: 10.830, lng: -85.324 },
  { nombre: 'Arenal', lat: 10.463, lng: -84.703 },
  { nombre: 'Poás', lat: 10.200, lng: -84.233 },
  { nombre: 'Irazú', lat: 9.979, lng: -83.852 },
  { nombre: 'Turrialba', lat: 10.025, lng: -83.767 },
]

const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

type Fila = { codigo_distrito: string; tipo: string; nivel: string; meses: number[]; fuente: string }

/** Reglas AME-01…04 para un distrito. `lluvia` = lluvia normal de cada mes (índice 0 = enero). */
export function amenazasDe(d: Pick<Distrito, 'codigo_distrito' | 'lat' | 'lng'>, t: Pick<TerrenoZona, 'altitud_m' | 'pendiente_pct'> | undefined, lluvia: (number | null)[]): Fila[] {
  const filas: Fila[] = []
  const meses = (f: (mm: number) => boolean) => lluvia.flatMap((mm, i) => (mm != null && f(mm) ? [i + 1] : []))
  const lluviosos = () => {
    const m = meses((mm) => mm >= 250)
    if (m.length) return m
    return lluvia.map((mm, i) => [mm ?? -1, i + 1] as const).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, i]) => i).sort((a, b) => a - b)
  }

  const cerca = VOLCANES.map((v) => ({ ...v, d: km(d, v) })).sort((a, b) => a.d - b.d)[0]
  if (cerca.d < 35) {
    const nivel = cerca.d < 10 ? 'muy_alto' : cerca.d < 20 ? 'alto' : 'medio'
    filas.push({ codigo_distrito: d.codigo_distrito, tipo: 'volcan', nivel, meses: [], fuente: `estimado: ${Math.round(cerca.d)} km del volcán ${cerca.nombre} (OVSICORI)` })
  }

  const p = t?.pendiente_pct
  if (p != null) {
    const nivel = p >= 30 ? 'muy_alto' : p >= 20 ? 'alto' : p >= 12 ? 'medio' : 'bajo'
    filas.push({ codigo_distrito: d.codigo_distrito, tipo: 'deslizamiento', nivel, meses: lluviosos(), fuente: `estimado: pendiente media ${p} % (SRTM) y lluvia NASA POWER` })
  }

  if (lluvia.some((mm) => mm != null)) {
    const secos = meses((mm) => mm < 50)
    if (secos.length) {
      const n = secos.length
      const nivel = n >= 6 ? 'muy_alto' : n >= 4 ? 'alto' : n >= 2 ? 'medio' : 'bajo'
      filas.push({ codigo_distrito: d.codigo_distrito, tipo: 'sequia', nivel, meses: secos, fuente: `estimado: ${n} meses con menos de 50 mm de lluvia normal (NASA POWER)` })
    }
  }

  const alt = t?.altitud_m
  if (alt != null && p != null) {
    const nivel = alt < 50 && p < 4 ? 'alto' : alt < 150 && p < 6 ? 'medio' : null
    if (nivel) filas.push({ codigo_distrito: d.codigo_distrito, tipo: 'inundacion', nivel, meses: lluviosos(), fuente: `estimado: zona baja (${Math.round(alt)} m) y plana (${p} %)` })
  }
  return filas
}

const celda = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

/** Lluvia normal por distrito y mes (vista clima_normales, NASA POWER). */
async function lluviaNormal(): Promise<Map<string, (number | null)[]>> {
  const out = new Map<string, (number | null)[]>()
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await obtenerSupabase().from('clima_normales').select('codigo_distrito,mes_num,lluvia_normal_mm')
      .eq('fuente', 'nasa-power').order('codigo_distrito').order('mes_num').range(desde, desde + 999)
    if (error) throw new Error(`No se pudo leer clima_normales: ${error.message}`)
    for (const f of data as { codigo_distrito: string; mes_num: number; lluvia_normal_mm: number | null }[]) {
      if (!out.has(f.codigo_distrito)) out.set(f.codigo_distrito, Array(12).fill(null))
      out.get(f.codigo_distrito)![f.mes_num - 1] = f.lluvia_normal_mm == null ? null : Number(f.lluvia_normal_mm)
    }
    if (data.length < 1000) break
  }
  return out
}

export async function estimarAmenazas(a: Argumentos) {
  const [distritos, terreno, lluvia] = await Promise.all([cargarDistritos(), leerTabla<TerrenoZona>('terreno_zona'), lluviaNormal()])
  if (!terreno.some((t) => t.pendiente_pct != null)) throw new Error('terreno_zona no tiene pendiente: correr antes `terreno`')
  const porCodigo = new Map(terreno.map((t) => [t.codigo_distrito, t]))
  const filas = distritos.flatMap((d) => amenazasDe(d, porCodigo.get(d.codigo_distrito), lluvia.get(d.codigo_distrito) ?? Array(12).fill(null)))
  const csv = ['codigo_distrito,tipo,nivel,meses_riesgo,fuente',
    ...filas.map((f) => [f.codigo_distrito, f.tipo, f.nivel, f.meses.join(';'), celda(f.fuente)].join(','))].join('\n') + '\n'
  const ruta = a.archivo ?? ARCHIVO
  await mkdir(dirname(ruta), { recursive: true })
  await writeFile(ruta, csv)
  const cuenta = (t: string) => filas.filter((f) => f.tipo === t).length
  console.log(`Amenazas estimadas: ${filas.length} filas en ${ruta} (volcán ${cuenta('volcan')}, deslizamiento ${cuenta('deslizamiento')}, sequía ${cuenta('sequia')}, inundación ${cuenta('inundacion')})`)
  console.log('Siguiente paso: npm run extraer -- amenazas')
}
