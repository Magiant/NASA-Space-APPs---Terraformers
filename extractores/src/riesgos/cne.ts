import type { Argumentos } from '../comun/argumentos.ts'
import { importarBoletines } from './revisados.ts'
export const extraerCNE = (args: Argumentos) => importarBoletines('cne', args)
