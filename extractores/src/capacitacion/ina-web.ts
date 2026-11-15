// Tema 6 · Capacitación — extractor automático de la página del Núcleo Agropecuario del INA.
// Corre SEMANAL (semanal.yml). Una sola consulta por corrida.
//
// Qué hace, en simple:
//   1. Baja https://www.ina.ac.cr/SitePages/nucleos/Agropecuario.aspx (el INA no tiene robots.txt que
//      lo restrinja; ver docs/capacitacion/README.md).
//   2. Lee las pestañas por subsector (Agricultura, Ganadería, Gestión…) y, dentro de cada una, las
//      tablas de "Programas de formación", "Capacitación" y "Curso": nombre y total de horas.
//   3. Cada curso queda con:
//      - url = página oficial + ancla #subsector-tipo-curso (el INA no publica un enlace por curso;
//        el ancla hace única la llave `url` y apunta a la página donde aparece el curso);
//      - tema = "Subsector · tipo"; modalidad y provincias = null (la página no los dice);
//      - cultivo_id = el cultivo de los títulos "Cultivo de X" (p. ej. "Cultivo de café" → 'cafe'),
//        solo si ese id existe en `cultivos`; si no, null (lo resuelve cargarFilasIna).
//   4. Valida con Zod y guarda con el mismo cargador del CSV (upsert por url + extracciones).
// Si la página cambia y se leen menos de 20 cursos, falla en vez de guardar una lista incompleta.
import { readFile } from 'node:fs/promises'
import type { Argumentos } from '../comun/argumentos.ts'
import { obtenerTexto, textoDeHtml } from '../comun/http.ts'
import { cargarFilasIna, Esquema, type Fila } from './ina.ts'

export const URL_NUCLEO = 'https://www.ina.ac.cr/SitePages/nucleos/Agropecuario.aspx'
export const MINIMO_CURSOS = 20

/** Texto → slug sin tildes: "Cultivo de café" → "cultivo-de-cafe". */
export function slug(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** "Cultivo de café" → 'cafe'. Otros títulos → null. Que exista en `cultivos` se revisa al cargar. */
export function cultivoCandidato(titulo: string): string | null {
  const m = /^cultivo\s+de\s+(.+)$/i.exec(titulo.trim())
  return m ? slug(m[1]) : null
}

function tipoDe(etiqueta: string): string {
  const e = etiqueta.toLowerCase()
  if (e.includes('programa')) return 'Programa de formación'
  if (e.includes('capacitaci')) return 'Capacitación'
  if (e.includes('curso')) return 'Curso'
  return etiqueta
}

/** Etiquetas de los enlaces de pestañas: id → texto (p. ej. BIG-1 → "Agricultura"). */
function etiquetas(html: string, patron: RegExp): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of html.matchAll(patron)) out.set(m[1], textoDeHtml(m[2]))
  return out
}

/** Lee la página del Núcleo Agropecuario y devuelve las filas de `capacitaciones` ya validadas. */
export function leerNucleo(html: string): Fila[] {
  const subsectores = etiquetas(html, /href="#(BIG-\d+)"[^>]*>([\s\S]*?)<\/a>/g)
  const secciones = [...html.matchAll(/<div class="tab-pane fade[^"]*" id="(BIG-\d+)"/g)]
  const filas: Fila[] = []
  const urls = new Set<string>()
  secciones.forEach((sec, i) => {
    const subsector = subsectores.get(sec[1]) ?? sec[1]
    const contenido = html.slice(sec.index!, secciones[i + 1]?.index ?? html.length)
    const pestanas = etiquetas(contenido, /href="#((?:SMALL-\d+)|CURSO)"[^>]*>([\s\S]*?)<\/a>/g)
    for (const panel of contenido.matchAll(/<div class="tab-pane container[^"]*" id="((?:SMALL-\d+)|CURSO)">([\s\S]*?)<\/table>/g)) {
      const tipo = tipoDe(pestanas.get(panel[1]) ?? panel[1])
      for (const fila of panel[2].matchAll(/<tr>\s*<th scope="row"[^>]*>[\s\S]*?<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/g)) {
        const titulo = textoDeHtml(fila[1])
        const horas = Number(textoDeHtml(fila[2]).replace(',', '.'))
        if (!titulo) continue
        let url = `${URL_NUCLEO}#${slug(subsector)}-${slug(tipo)}-${slug(titulo)}`
        for (let n = 2; urls.has(url); n++) url = `${URL_NUCLEO}#${slug(subsector)}-${slug(tipo)}-${slug(titulo)}-${n}`
        urls.add(url)
        filas.push({
          institucion: 'INA', titulo, tema: `${subsector} · ${tipo}`, cultivo_id: cultivoCandidato(titulo),
          modalidad: null, duracion_horas: Number.isFinite(horas) && horas > 0 ? horas : null, provincias: null, url,
        })
      }
    }
  })
  if (filas.length < MINIMO_CURSOS) {
    throw new Error(`Solo se leyeron ${filas.length} cursos en la página del INA (mínimo ${MINIMO_CURSOS}): la página pudo cambiar; revisar antes de guardar.`)
  }
  return Esquema.array().parse(filas)
}

/** --archivo=<html> lee una copia local de la página (pruebas); si no, la baja del INA. */
export async function extraerInaWeb(args: Argumentos): Promise<void> {
  if (args.distritos?.length || args.distritosArchivo) throw new Error('Capacitaciones no tiene distritos')
  const html = args.archivo ? await readFile(args.archivo, 'utf8') : await obtenerTexto(URL_NUCLEO)
  const filas = leerNucleo(html)
  if (args.simulacion) {
    const porTema = Object.fromEntries([...new Set(filas.map(f => f.tema!))].map(t => [t, filas.filter(f => f.tema === t).length]))
    console.log(JSON.stringify({
      modo: 'simulacion', fuente: args.archivo ?? URL_NUCLEO, registros: filas.length, por_tema: porTema,
      con_cultivo_candidato: filas.filter(f => f.cultivo_id).map(f => `${f.titulo} → ${f.cultivo_id}`),
      ejemplo: filas[0],
    }, null, 2))
    return
  }
  const { crearDestino } = await import('./supabase.ts')
  console.log(await cargarFilasIna(async () => filas, crearDestino('ina-web')))
}
