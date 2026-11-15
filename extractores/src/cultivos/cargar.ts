// Tema 5 · Guarda el catálogo (cultivos) y después las reglas de rotación (secuencias, que dependen de cultivos).
import type { Argumentos } from '../comun/argumentos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { FUENTE, filasCultivos, filasSecuencias } from './catalogo.ts'

export async function cargarCultivos(a: Argumentos) {
  const cultivos = filasCultivos()
  const secuencias = filasSecuencias()
  const cuenta = (t: string) => secuencias.filter((s) => s.tipo === t).length
  console.log(`Cultivos: ${cultivos.length} · secuencias: ${secuencias.length} (${cuenta('recomendada')} recomendadas, ${cuenta('prohibida')} prohibidas)`)
  const r1 = await ejecutarExtractor({ fuente: FUENTE, tabla: 'cultivos', lotes: [cultivos], simulacion: a.simulacion })
  if (r1.errores.length) throw new Error(r1.errores.join('; '))
  const r2 = await ejecutarExtractor({ fuente: 'reglas-rotacion', tabla: 'secuencias', lotes: [secuencias], simulacion: a.simulacion })
  if (r2.errores.length) throw new Error(r2.errores.join('; '))
}
