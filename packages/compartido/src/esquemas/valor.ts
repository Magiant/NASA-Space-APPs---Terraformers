import { z } from 'zod'

/** De dónde viene un valor. "sensor" y "manual" quedan reservados para la app (lecturas de finca). */
export const Origen = z.enum(['satelite', 'modelo', 'derivado'])
export type Origen = z.infer<typeof Origen>

/** Identificador corto de cada fuente; ver docs/diccionario-datos.md. */
export const FuenteId = z.enum([
  'nasa-power',
  'open-meteo-era5land',
  'soilgrids',
  'fao-gaez',
  'ecocrop',
  'decreto-41960',
  'hdx-inec',
])
export type FuenteId = z.infer<typeof FuenteId>

const FechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha YYYY-MM-DD')

/**
 * Un valor con su etiqueta completa. `fecha` es la fecha del dato, no la de la consulta.
 * Un valor vacío (null) siempre trae `advertencia` explicando por qué: nunca 0 en lugar de "sin dato".
 */
export const valor = <T extends z.ZodTypeAny>(tipo: T) =>
  z
    .object({
      valor: tipo.nullable(),
      unidad: z.string(),
      fuente: FuenteId,
      fecha: FechaIso,
      origen: Origen,
      regla: z.string().optional(),
      advertencia: z.string().optional(),
    })
    .refine((v) => v.valor !== null || !!v.advertencia, {
      message: 'un valor null debe traer advertencia',
    })
    .refine((v) => v.origen !== 'derivado' || !!v.regla, {
      message: 'un valor derivado debe traer el código de su regla',
    })

export const ValorNumero = valor(z.number())
export type ValorNumero = z.infer<typeof ValorNumero>
export const ValorTexto = valor(z.string())
export type ValorTexto = z.infer<typeof ValorTexto>

export { FechaIso }
