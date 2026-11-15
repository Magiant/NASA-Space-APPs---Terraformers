import { z } from 'zod'

/** Código INEC de distrito, p. ej. CR30110. El cantón son los primeros 5 caracteres (CR301). */
export const CodigoDistrito = z.string().regex(/^CR\d{5}$/)

export const Distrito = z.object({
  codigo: CodigoDistrito,
  nombre: z.string(),
  canton: z.object({ codigo: z.string().regex(/^CR\d{3}$/), nombre: z.string() }),
  provincia: z.object({ codigo: z.string().regex(/^CR\d$/), nombre: z.string() }),
  /** Punto representativo del distrito (HDX cri_adminpoints), grados WGS84. */
  lat: z.number().min(5).max(12),
  lon: z.number().min(-88).max(-82),
})
export type Distrito = z.infer<typeof Distrito>

/** Un punto cualquiera (distrito hoy, finca mañana) para las funciones basadas en coordenadas. */
export const Punto = z.object({
  id: z.string(),
  lat: z.number(),
  lon: z.number(),
  elevacionM: z.number().optional(),
})
export type Punto = z.infer<typeof Punto>
