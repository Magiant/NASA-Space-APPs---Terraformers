import { z } from 'zod'
import { FuenteId } from './valor.ts'

export const MetaExtraccion = z.object({
  fuentes: z.array(
    z.object({
      id: FuenteId,
      url: z.string().url(),
      /** Última fecha de dato que entregó esta fuente (YYYY-MM-DD), o null si falló. */
      fechaDatos: z.string().nullable(),
      ok: z.boolean(),
    }),
  ),
  /** Fecha de los datos del resultado (la más antigua entre fuentes usadas). */
  fechaDatos: z.string().nullable(),
  /** Momento de la corrida, ISO 8601 con hora. */
  generadoEn: z.string().datetime({ offset: true }),
  /** % de registros con todos sus valores principales no nulos (0–100). */
  coberturaPct: z.number().min(0).max(100),
  advertencias: z.array(z.string()),
  errores: z.array(
    z.object({ fuente: FuenteId, mensaje: z.string(), distritos: z.array(z.string()).optional() }),
  ),
})
export type MetaExtraccion = z.infer<typeof MetaExtraccion>

/** Envoltura de toda función pública: los datos validados más la metadata de la corrida. */
export const resultadoExtraccion = <T extends z.ZodTypeAny>(registro: T) =>
  z.object({ datos: z.array(registro), meta: MetaExtraccion })

export type ResultadoExtraccion<T> = { datos: T[]; meta: MetaExtraccion }
