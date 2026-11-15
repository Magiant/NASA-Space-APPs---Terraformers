// ejecutarExtractor(): el patrón obligatorio del equipo en un solo lugar.
//   extraer → normalizar (lo hace cada tema) → validar con Zod → upsert por lotes → registrar en `extracciones`.
// Cada tema solo entrega lotes de filas ya normalizadas; aquí se valida y se guarda.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ZodTypeAny } from 'zod'
import { TABLAS, type NombreTabla } from '@terraformes/compartido'
import { abrirExtraccion, cerrarExtraccion } from './registro.ts'
import { obtenerSupabase } from './supabase.ts'

export interface OpcionesExtractor {
  /** Nombre corto de la corrida en `extracciones`, p. ej. 'clima-open-meteo'. */
  fuente: string
  tabla: NombreTabla
  /** Si la tabla la comparte otro tema: SOLO estas columnas (además de la llave) van en el upsert. */
  columnas?: string[]
  /** Lotes de filas normalizadas. Cada lote se valida y se guarda por separado. */
  lotes: AsyncIterable<unknown[]> | Iterable<unknown[]>
  /** Filas por upsert (cientos, nunca una por una). */
  tamanoUpsert?: number
  /** true = no escribe en Supabase; guarda una muestra en extractores/salida/ para revisar. */
  simulacion?: boolean
}

export interface ResultadoExtractor {
  guardadas: number
  lotesConError: number
  errores: string[]
  muestra: unknown[]
}

const DIR_SALIDA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'salida')

/** Esquema a usar: el de la tabla, recortado con .pick() si el tema solo es dueño de algunas columnas. */
export function esquemaDe(tabla: NombreTabla, columnas?: string[]): ZodTypeAny {
  const { esquema, claveUnica } = TABLAS[tabla]
  if (!columnas) return esquema
  const elegidas = new Set([...claveUnica.split(','), ...columnas])
  // Todos los esquemas de TABLAS son z.object: .pick() existe.
  return (esquema as unknown as { pick: (m: Record<string, true>) => ZodTypeAny })
    .pick(Object.fromEntries([...elegidas].map((c) => [c, true])))
}

export async function ejecutarExtractor(o: OpcionesExtractor): Promise<ResultadoExtractor> {
  const simulacion = o.simulacion ?? false
  const tamano = o.tamanoUpsert ?? 500
  const esquema = esquemaDe(o.tabla, o.columnas).array()
  const claveUnica = TABLAS[o.tabla].claveUnica
  const r: ResultadoExtractor = { guardadas: 0, lotesConError: 0, errores: [], muestra: [] }
  const id = await abrirExtraccion(o.fuente, simulacion)
  let nLote = 0

  try {
    for await (const lote of o.lotes) {
      nLote++
      if (!lote.length) continue
      const validado = esquema.safeParse(lote)
      if (!validado.success) {
        // Regla del equipo: un lote que no pasa Zod no se guarda; se registra el error y se sigue.
        r.lotesConError++
        const primeros = validado.error.issues.slice(0, 3)
          .map((i) => `fila ${String(i.path[0])} · ${i.path.slice(1).join('.')}: ${i.message}`).join(' | ')
        r.errores.push(`lote ${nLote}: ${primeros}`)
        console.error(`  ✘ lote ${nLote} rechazado por Zod (${lote.length} filas): ${primeros}`)
        continue
      }
      const filas = validado.data as Record<string, unknown>[]
      if (r.muestra.length < 20) r.muestra.push(...filas.slice(0, 20 - r.muestra.length))
      if (simulacion) { r.guardadas += filas.length; continue }
      for (let i = 0; i < filas.length; i += tamano) {
        const parte = filas.slice(i, i + tamano)
        const { error } = await obtenerSupabase().from(o.tabla).upsert(parte, { onConflict: claveUnica })
        if (error) {
          r.lotesConError++
          r.errores.push(`lote ${nLote} (upsert): ${error.message}`)
          console.error(`  ✘ upsert ${o.tabla}: ${error.message}`)
          continue
        }
        r.guardadas += parte.length
      }
    }
  } catch (e) {
    r.errores.push((e as Error).message)
    await cerrarExtraccion(id, 'error', r.guardadas, r.errores.join('\n'))
    throw e
  }

  const estado = r.lotesConError ? 'error' : r.guardadas ? 'ok' : 'sin_cambios'
  await cerrarExtraccion(id, estado, r.guardadas, r.errores.length ? r.errores.join('\n') : null)
  if (simulacion) {
    await mkdir(DIR_SALIDA, { recursive: true })
    const ruta = path.join(DIR_SALIDA, `${o.fuente}.muestra.json`)
    await writeFile(ruta, JSON.stringify(r.muestra, null, 1), 'utf-8')
    console.log(`  (simulación: nada se escribió en Supabase; muestra en ${ruta})`)
  }
  console.log(`  ${estado === 'error' ? '⚠' : '✔'} ${o.tabla}: ${r.guardadas} filas ${simulacion ? 'válidas' : 'guardadas'}` +
    (r.lotesConError ? `, ${r.lotesConError} lotes con error` : ''))
  return r
}
