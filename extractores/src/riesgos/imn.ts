import type { Argumentos } from '../comun/argumentos.ts'
import { importarBoletines } from './revisados.ts'
export const extraerIMN = (args: Argumentos) => importarBoletines('imn', args)
