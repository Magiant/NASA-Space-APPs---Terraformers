import { z } from 'zod'
import { CodigoDistrito } from './distrito.ts'
import { FechaIso, ValorNumero, valor } from './valor.ts'

/** Humedad volumétrica (Open-Meteo / ERA5-Land, m³/m³ × 100) en una capa del suelo. */
export const LecturaCapa = z.object({
  profundidadCm: z.object({ desde: z.number(), hasta: z.number() }),
  humedadVolPct: ValorNumero,
})

/**
 * Índice de humedad de NASA POWER (GWET*): fracción 0–1, NO es %. Nunca se mezcla con humedadVolPct.
 * superficie = GWETTOP (0–5 cm), raiz = GWETROOT (0–100 cm), perfil = GWETPROF (todo el perfil).
 */
export const IndiceHumedadPower = z.object({
  superficie: ValorNumero,
  raiz: ValorNumero,
  perfil: ValorNumero,
})

export const EstadoHumedad = z.enum(['seco', 'normal', 'humedo'])
export const NivelRiesgo = z.enum(['bajo', 'medio', 'alto'])

/** Lectura para cualquier punto (distrito hoy, finca después). */
export const HumedadPunto = z.object({
  id: z.string(),
  lat: z.number(),
  lon: z.number(),
  fecha: FechaIso,
  elevacionM: ValorNumero,
  humedadVolPct: z.array(LecturaCapa),
  indiceHumedadPower: IndiceHumedadPower,
  temperaturaAireC: ValorNumero,
  humedadRelativaPct: ValorNumero,
  lluviaMm: ValorNumero,
  /** Seco / normal / húmedo frente a la línea base del mes (regla EST-01). */
  estado: valor(EstadoHumedad),
  /** Percentil del índice de raíz de hoy dentro de su mes histórico (0–100). */
  percentilMes: ValorNumero,
  riesgoHongos: z.object({
    nivel: valor(NivelRiesgo),
    /** Condiciones que se cumplieron, en palabras. */
    motivos: z.array(z.string()),
    /** Códigos de los supuestos usados (docs/supuestos.md). */
    supuestos: z.array(z.string()),
  }),
})
export type HumedadPunto = z.infer<typeof HumedadPunto>

export const HumedadDistrito = HumedadPunto.extend({
  codigoDistrito: CodigoDistrito,
  nombreDistrito: z.string(),
})
export type HumedadDistrito = z.infer<typeof HumedadDistrito>
