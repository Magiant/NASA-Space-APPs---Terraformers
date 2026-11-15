import { readFile } from 'node:fs/promises'
import { AmenazaZona, type Distrito } from '@terraformes/compartido'
import { cargarDistritos } from '../comun/distritos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import type { Argumentos } from '../comun/argumentos.ts'

// CSV con comas, comillas escapadas y campos multilínea; vacío = null.
export function leerCsv(texto: string): string[][] {
  const filas: string[][] = []; let fila: string[] = []; let campo = ''; let citado = false; let cerrado = false
  texto = texto.replace(/^\uFEFF/, '')
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (citado) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') { citado = false; cerrado = true }
      else campo += c
    } else if (c === ',' || c === '\n' || c === '\r') {
      fila.push(campo.trim()); campo = ''; cerrado = false
      if (c !== ',') { if (fila.some(Boolean)) filas.push(fila); fila = []; if (c === '\r' && texto[i + 1] === '\n') i++ }
    } else if (c === '"' && !campo && !cerrado) citado = true
    else { if (cerrado || c === '"') throw new Error('CSV: comillas inválidas'); campo += c }
  }
  if (citado) throw new Error('CSV: comillas sin cerrar')
  fila.push(campo.trim()); if (fila.some(Boolean)) filas.push(fila)
  return filas
}

export function normalizarAmenazas(texto: string, distritos: Distrito[]) {
  const [cabecera, ...datos] = leerCsv(texto)
  if (cabecera?.join(',') !== 'codigo_distrito,tipo,nivel,meses_riesgo,fuente') throw new Error('Cabecera CSV incorrecta')
  if (!datos.length) throw new Error('CSV sin filas revisadas; no hay amenazas para importar')
  const claves = new Set<string>(); const conocidos = new Set(distritos.map(d => d.codigo_distrito))
  const filas = datos.map(c => {
    if (c.length !== 5) throw new Error('Cada fila CSV debe tener cinco columnas')
    const [codigo_distrito, tipo, nivel, meses, fuente] = c
    if (!conocidos.has(codigo_distrito)) throw new Error('Distrito desconocido: ' + codigo_distrito)
    const clave = codigo_distrito + ':' + tipo
    if (claves.has(clave)) throw new Error('Amenaza duplicada: ' + clave)
    claves.add(clave)
    if (meses && !/^\d{1,2}(;\d{1,2})*$/.test(meses)) throw new Error('Meses: usar enteros separados por ; o campo vacío')
    return { codigo_distrito, tipo, nivel, meses_riesgo: meses ? [...new Set(meses.split(';').map(Number))].sort((a,b) => a-b) : null, fuente }
  })
  return AmenazaZona.array().parse(filas)
}

export async function cargarAmenazas(args: Argumentos) {
  async function* lotes() {
    if (!args.simulacion && args.distritosArchivo) throw new Error('El catálogo local solo se permite en simulación')
    const distritos = await cargarDistritos({ archivo: args.distritosArchivo })
    const filas = normalizarAmenazas(await readFile(args.archivo ?? 'datos/riesgos/amenazas.csv', 'utf8'), distritos)
    if (!args.simulacion && filas.some(f => f.fuente.startsWith('PRUEBA:'))) throw new Error('Datos ficticios: usar --simulacion')
    for (const codigo of args.distritos ?? []) if (!distritos.some(d => d.codigo_distrito === codigo)) throw new Error('Distrito desconocido: ' + codigo)
    yield args.distritos?.length ? filas.filter(f => args.distritos!.includes(f.codigo_distrito)) : filas
  }
  const r = await ejecutarExtractor({ fuente: 'cne-amenazas-csv', tabla: 'amenazas_zona', lotes: lotes(), simulacion: args.simulacion })
  if (r.errores.length) throw new Error(r.errores.join('; '))
}
