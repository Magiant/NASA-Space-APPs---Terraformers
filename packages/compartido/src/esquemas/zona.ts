import { z } from 'zod'
import { CodigoDistrito } from './distrito.ts'
import { FuenteId, ValorNumero, ValorTexto, valor } from './valor.ts'

/** Clases de limitación de las capas de calidad de suelo de GAEZ (SQ1 nutrientes, SQ4 oxígeno/drenaje). */
export const LimitacionGaez = z.enum(['sin limitacion', 'ligera', 'moderada', 'severa', 'muy severa'])

export const ClaseCapacidadUso = z.enum(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'])

export const CapacidadUso = z.object({
  clase: valor(ClaseCapacidadUso),
  /** Siempre true: faltan factores del decreto (ver factoresNoDisponibles). */
  indicativa: z.literal(true),
  factoresUsados: z.array(z.string()),
  factoresNoDisponibles: z.array(z.string()),
  versionDecreto: z.string(),
})

/** Datos de suelo y terreno de un distrito (punto 10, "datos de la zona"). */
export const ZonaSuelo = z.object({
  codigoDistrito: CodigoDistrito,
  nombreDistrito: z.string(),
  ph: ValorNumero,
  arcillaPct: ValorNumero,
  arenaPct: ValorNumero,
  limoPct: ValorNumero,
  carbonoOrganicoGKg: ValorNumero,
  materiaOrganicaPct: ValorNumero,
  nitrogenoGKg: ValorNumero,
  cicCmolKg: ValorNumero,
  densidadAparenteGCm3: ValorNumero,
  texturaUsda: ValorTexto,
  tipoSuelo: ValorTexto,
  fertilidad: valor(LimitacionGaez),
  drenaje: valor(LimitacionGaez),
  pendienteClase: ValorTexto,
  capacidadUso: CapacidadUso,
  /** Aptitud GAEZ por cultivo (0–100 %). Verificación cruzada, no verdad de campo. */
  aptitudGaez: z.record(z.string(), ValorNumero),
  /** % de píxeles del distrito con dato válido, por fuente. */
  coberturaPixelesPct: z.record(FuenteId, z.number().min(0).max(100)),
})
export type ZonaSuelo = z.infer<typeof ZonaSuelo>
