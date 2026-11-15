// Tema 8 · Fenómenos naturales — pronóstico subestacional del IMN → alertas (fuente 'imn'). Corre DIARIO.
//
// Qué hace, en simple:
//   1. Baja https://www.imn.ac.cr/pronostico-subestacional (robots.txt del IMN solo prohíbe /test y
//      /busqueda; una consulta por corrida).
//   2. Lee el periodo de validez ("Válido del 16 de noviembre - 13 de diciembre 2026"), el comentario
//      general, el pronóstico de cada semana y el apartado de eventos extremos.
//   3. Guarda una alerta para el periodo completo y una por semana, con:
//      tipo 'pronostico_subestacional', nivel null (el IMN no asigna color a un pronóstico),
//      inicio/fin = fechas de validez, codigos_distrito null (alcance nacional: no hay un catálogo
//      revisado de regiones del IMN → distritos; misma regla que riesgos/revisados.ts).
//   4. id_externo estable por periodo: correrlo cada día no duplica; cuando el IMN publica un periodo
//      nuevo se agregan filas nuevas y las anteriores quedan como historial.
// La CNE sigue como carga manual (riesgos/cne.ts): su sitio bloquea el acceso automático (Cloudflare, 403).
import { readFile } from 'node:fs/promises'
import type { Alerta } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { obtenerTexto, textoDeHtml } from '../comun/http.ts'

export const URL_SUBESTACIONAL = 'https://www.imn.ac.cr/pronostico-subestacional'
const ZONA = '-06:00'
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const mesNum = (nombre: string) => {
  const n = MESES.indexOf(nombre.toLowerCase().replace('setiembre', 'septiembre'))
  if (n < 0) throw new Error(`Mes desconocido en el pronóstico del IMN: ${nombre}`)
  return n + 1
}
const iso = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/**
 * Rango de fechas en español: "16 al 22 de noviembre de 2026", "30 de noviembre- 6 de diciembre de 2026",
 * "7-13 de diciembre de 2026", "16 de noviembre - 13 de diciembre 2026". Si el mes inicial es mayor que
 * el final (dic → ene), el inicio es del año anterior.
 */
export function rangoFechas(texto: string): { inicio: string; fin: string } | null {
  const m = /(\d{1,2})(?:\s+de\s+([a-záéíóú]+))?\s*(?:al|-|–)\s*(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de(?:l)?\s+)?(\d{4})/i.exec(texto)
  if (!m) return null
  const mesFin = mesNum(m[4])
  const mesIni = m[2] ? mesNum(m[2]) : mesFin
  const anioFin = Number(m[5])
  const anioIni = mesIni > mesFin ? anioFin - 1 : anioFin
  return { inicio: iso(anioIni, mesIni, Number(m[1])), fin: iso(anioFin, mesFin, Number(m[3])) }
}

/** Lee la página del pronóstico subestacional y devuelve las filas de `alertas`. */
export function leerSubestacional(html: string, url = URL_SUBESTACIONAL): Alerta[] {
  const texto = textoDeHtml(html)
  const iValido = texto.search(/V[áa]lido del/i)
  if (iValido < 0) throw new Error('No se encontró "Válido del …" en la página del IMN: la página pudo cambiar')
  const periodo = rangoFechas(texto.slice(iValido, iValido + 120))
  if (!periodo) throw new Error('No se pudo leer el periodo de validez del pronóstico del IMN')

  const iComentario = texto.search(/Comentario General:/i)
  const finComentario = texto.slice(iComentario).search(/Fig\.\s*1|1\.\s*Pron[óo]stico del/i)
  const comentario = iComentario < 0 ? '' : texto.slice(iComentario + 'Comentario General:'.length, iComentario + (finComentario < 0 ? 2000 : finComentario)).trim()
  if (!comentario) throw new Error('No se encontró el comentario general del pronóstico del IMN')

  // Secciones separadas por líneas de guiones: "N. Pronóstico del … de AAAA <texto>" y eventos extremos.
  const secciones = texto.split(/-{10,}/).map((s) => s.trim())
  const semanas: Array<{ n: number; inicio: string; fin: string; texto: string }> = []
  let extremos = ''
  for (const s of secciones) {
    const sem = /(?:^|\s)(\d)\.\s*Pron[óo]stico del\s+(.+?\d{4})\s+(.*)$/i.exec(s)
    if (sem) {
      const r = rangoFechas(sem[2])
      if (r) semanas.push({ n: Number(sem[1]), ...r, texto: sem[3].trim() })
      continue
    }
    const ext = /Pron[óo]stico de potenciales eventos extremos[^.]*?\d{4}\s*(.*)$/i.exec(s)
    if (ext) extremos = ext[1].trim()
  }

  const base = `subestacional-${periodo.inicio}_${periodo.fin}`
  const fila = (id: string, titulo: string, descripcion: string, inicio: string, fin: string): Alerta => ({
    fuente: 'imn', id_externo: id, tipo: 'pronostico_subestacional', nivel: null,
    titulo, descripcion: descripcion.slice(0, 4000), codigos_distrito: null,
    inicio: `${inicio}T00:00:00${ZONA}`, fin: `${fin}T23:59:59${ZONA}`, url,
  })
  return [
    fila(base, `Pronóstico subestacional del IMN (${periodo.inicio} al ${periodo.fin})`,
      comentario + (extremos ? ` Eventos extremos: ${extremos}` : ''), periodo.inicio, periodo.fin),
    ...semanas.map((s) => fila(`${base}-semana-${s.n}`, `Pronóstico del IMN, semana ${s.n} (${s.inicio} al ${s.fin})`, s.texto, s.inicio, s.fin)),
  ]
}

/** --archivo=<html> lee una copia local (pruebas); si no, baja la página del IMN. */
export async function extraerImnSubestacional(args: Argumentos): Promise<void> {
  const html = args.archivo ? await readFile(args.archivo, 'utf8') : await obtenerTexto(URL_SUBESTACIONAL)
  const filas = leerSubestacional(html)
  console.log(`IMN subestacional: ${filas.length} filas (periodo completo + ${filas.length - 1} semanas)`)
  const r = await ejecutarExtractor({ fuente: 'imn-subestacional', tabla: 'alertas', lotes: [filas], simulacion: args.simulacion })
  if (r.errores.length) throw new Error(r.errores.join('; '))
}
