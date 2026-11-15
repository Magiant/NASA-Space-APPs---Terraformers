// Tema 7 · Comparación NASA POWER (corregido por altitud) vs Open-Meteo en distritos de montaña.
// Lo pide el PDF: "comparar con Open-Meteo en 3 distritos de montaña y reportar la diferencia".
// Solo LEE clima_diario; no escribe nada.
// Uso: npm run extraer -- temperatura-comparar [--distritos=CR30110,CR21101,CR10501] [--desde=AAAA-MM-DD]
import type { Argumentos } from '../comun/argumentos.ts'
import { obtenerSupabase } from '../comun/supabase.ts'

/** Llano Grande (Cartago), Zarcero (Alajuela) y San Marcos de Tarrazú (Los Santos). */
export const MONTANA_POR_DEFECTO = ['CR30110', 'CR21101', 'CR10501']

export interface Diferencia { codigo: string; dias: number; difMedia: number | null; difMax: number | null; difMin: number | null }

type Fila = { codigo_distrito: string; fecha: string; fuente: string; temp_media_c: number | null; temp_max_c: number | null; temp_min_c: number | null }

/** Diferencia media POWER − Open-Meteo por distrito, solo en días que tienen las dos fuentes. */
export function diferencias(filas: Fila[]): Diferencia[] {
  const porDistrito = new Map<string, Map<string, Partial<Record<string, Fila>>>>()
  for (const f of filas) {
    const dias = porDistrito.get(f.codigo_distrito) ?? new Map()
    const dia = dias.get(f.fecha) ?? {}
    dia[f.fuente] = f
    dias.set(f.fecha, dia)
    porDistrito.set(f.codigo_distrito, dias)
  }
  return [...porDistrito].map(([codigo, dias]) => {
    const pares = [...dias.values()].filter((d) => d['nasa-power'] && d['open-meteo'])
    const dif = (col: 'temp_media_c' | 'temp_max_c' | 'temp_min_c') => {
      const xs = pares.map((d) => [d['nasa-power']![col], d['open-meteo']![col]]).filter(([a, b]) => a !== null && b !== null)
      return xs.length ? Math.round((xs.reduce((s, [a, b]) => s + (Number(a) - Number(b)), 0) / xs.length) * 100) / 100 : null
    }
    return { codigo, dias: pares.length, difMedia: dif('temp_media_c'), difMax: dif('temp_max_c'), difMin: dif('temp_min_c') }
  })
}

export async function compararTemperatura(args: Argumentos): Promise<void> {
  const codigos = args.distritos ?? MONTANA_POR_DEFECTO
  const desde = args.desde ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const { data, error } = await obtenerSupabase().from('clima_diario')
    .select('codigo_distrito,fecha,fuente,temp_media_c,temp_max_c,temp_min_c')
    .in('codigo_distrito', codigos).in('fuente', ['nasa-power', 'open-meteo']).gte('fecha', desde)
  if (error) throw new Error(`No se pudo leer clima_diario: ${error.message}`)
  console.log(`Diferencia POWER (corregido) − Open-Meteo desde ${desde} (°C; positivo = POWER más caliente)`)
  console.table(diferencias(data as Fila[]))
}
