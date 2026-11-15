import { readFileSync } from 'node:fs'
import { Distrito } from '@terraformers/compartido'

export const RUTA_DISTRITOS = new URL('../../../datos/distritos.json', import.meta.url)

let cache: Distrito[] | undefined

/** Los 492 distritos de Costa Rica (semilla datos/distritos.json, validada contra el esquema). */
export function obtenerDistritos(): Distrito[] {
  cache ??= Distrito.array().parse(JSON.parse(readFileSync(RUTA_DISTRITOS, 'utf8')))
  return cache
}
