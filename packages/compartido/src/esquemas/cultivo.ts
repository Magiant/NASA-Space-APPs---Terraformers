import { z } from 'zod'
import { ValorNumero, valor } from './valor.ts'

/** Rango de EcoCrop: mínimo absoluto, óptimo (min–max) y máximo absoluto. */
export const Rango = z.object({
  min: z.number().nullable(),
  optMin: z.number().nullable(),
  optMax: z.number().nullable(),
  max: z.number().nullable(),
})

export const Tolerancia = z.enum(['alta', 'media', 'baja'])

/** Requisitos de un cultivo (punto 10, "requisitos de cada cultivo"). */
export const RequisitoCultivo = z.object({
  /** Id de EcoCrop, o "gaez:<nombre>" para cultivos de GAEZ sin pareja en EcoCrop. */
  id: z.string(),
  nombreCientifico: z.string().nullable(),
  nombreComun: z.string(),
  /** Nombre del cultivo en GAEZ, si existe pareja. */
  gaezCultivo: z.string().nullable(),
  /** true = solo hay aptitud GAEZ; los campos de EcoCrop vienen null con advertencia. */
  sinEcocrop: z.boolean(),
  temperaturaC: valor(Rango),
  lluviaAnualMm: valor(Rango),
  ph: valor(Rango),
  texturas: valor(z.array(z.string())),
  drenaje: valor(z.array(z.string())),
  cicloDias: valor(z.object({ min: z.number().nullable(), max: z.number().nullable() })),
  /** Derivados (origen "derivado" + código de regla en docs/supuestos.md). */
  altitudMaxM: ValorNumero,
  pendienteMaxPct: ValorNumero,
  toleranciaSequia: valor(Tolerancia),
  toleranciaInundacion: valor(Tolerancia),
})
export type RequisitoCultivo = z.infer<typeof RequisitoCultivo>
