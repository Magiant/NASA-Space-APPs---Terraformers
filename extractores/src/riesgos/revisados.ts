// Fuentes web pendientes de verificar: se importan boletines revisados, nunca HTML supuesto.
import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { Alerta, CodigoCanton, CodigoDistrito, type Distrito } from '@terraformes/compartido'
import { cargarDistritos } from '../comun/distritos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import type { Argumentos } from '../comun/argumentos.ts'

const Zonas = z.object({
  distritos: z.array(CodigoDistrito).default([]),
  cantones: z.array(CodigoCanton).default([]),
  regiones: z.array(z.string().min(1)).default([]),
}).strict()
const Documento = z.object({
  revisado_en: z.string().datetime({ offset: true }),
  prueba: z.boolean().default(false),
  registros: z.array(z.object({
    alerta: Alerta,
    zonas: Zonas.optional(),
  }).strict()),
}).strict()
const Catalogo = z.record(z.string(), z.array(CodigoDistrito).min(1))
export type Regiones = z.infer<typeof Catalogo>

export function normalizarBoletines(raw: unknown, fuente: 'cne' | 'imn', distritos: Distrito[], regiones: Regiones = {}, simulacion = false, ahora = Date.now()) {
  const doc = Documento.parse(raw)
  if (doc.prueba && !simulacion) throw new Error('Los datos ficticios solo se permiten en simulación')
  const edad = ahora - Date.parse(doc.revisado_en)
  if (!simulacion && (edad < 0 || edad > 48 * 3600_000)) throw new Error('Revisar el boletín: revisado_en debe estar dentro de las últimas 48 horas')
  const conocidos = new Set(distritos.map(d => d.codigo_distrito))
  const ids = new Set<string>()
  const filas = doc.registros.map(({ alerta, zonas }) => {
    if (alerta.fuente !== fuente) throw new Error('Fuente del boletín incorrecta')
    if (ids.has(alerta.id_externo)) throw new Error('id_externo duplicado en el archivo: ' + alerta.id_externo)
    ids.add(alerta.id_externo)
    if (fuente === 'imn' && (alerta.nivel !== null || !['aviso_meteorologico', 'pronostico_subestacional'].includes(alerta.tipo))) throw new Error('IMN requiere nivel null y tipo aviso_meteorologico o pronostico_subestacional')
    if (!alerta.url || !['cne.go.cr', 'www.cne.go.cr', 'imn.ac.cr', 'www.imn.ac.cr'].filter(h => h.includes(fuente + '.')).includes(new URL(alerta.url).hostname)) throw new Error('Falta enlace oficial de la fuente')
    if (alerta.inicio && alerta.fin && Date.parse(alerta.fin) < Date.parse(alerta.inicio)) throw new Error('fin anterior a inicio')
    const codigos = new Set(alerta.codigos_distrito ?? [])
    let desconocida = false
    for (const codigo of zonas?.distritos ?? []) codigos.add(codigo)
    for (const canton of zonas?.cantones ?? []) {
      const encontrados = distritos.filter(d => d.codigo_canton === canton)
      if (!encontrados.length) throw new Error('Cantón ausente del catálogo: ' + canton)
      encontrados.forEach(d => codigos.add(d.codigo_distrito))
    }
    for (const region of zonas?.regiones ?? []) {
      if (!regiones[region]) { desconocida = true; console.warn('Región sin correspondencia revisada: ' + region); continue }
      regiones[region].forEach(c => codigos.add(c))
    }
    for (const codigo of codigos) if (!conocidos.has(codigo)) throw new Error('Distrito ausente del catálogo: ' + codigo)
    // Una cobertura parcial no debe presentarse como la lista completa de afectados.
    return { ...alerta, codigos_distrito: desconocida || !codigos.size ? null : [...codigos].sort() }
  })
  return Alerta.array().parse(filas)
}

export async function importarBoletines(fuente: 'cne' | 'imn', args: Argumentos) {
  async function* lotes() {
    if (!args.simulacion && (args.distritos?.length || args.distritosArchivo)) throw new Error('Los filtros y catálogos locales de distritos solo se permiten en simulación para no truncar coberturas')
    const archivo = args.archivo ?? 'datos/riesgos/' + fuente + '.json'
    let raw: unknown
    try { raw = JSON.parse(await readFile(archivo, 'utf8')) } catch { throw new Error('No se pudo leer ' + archivo + '. Acceso web pendiente de verificar; se necesita un boletín revisado. No significa ausencia de alertas.') }
    const distritos = await cargarDistritos({ archivo: args.distritosArchivo })
    const regiones = args.regionesArchivo ? Catalogo.parse(JSON.parse(await readFile(args.regionesArchivo, 'utf8'))) : {}
    const filas = normalizarBoletines(raw, fuente, distritos, regiones, args.simulacion)
    if (!args.distritos?.length) { yield filas; return }
    for (const codigo of args.distritos) if (!distritos.some(d => d.codigo_distrito === codigo)) throw new Error('Distrito de prueba desconocido: ' + codigo)
    // La simulación filtra alertas, pero conserva su cobertura completa.
    yield filas.filter(f => f.codigos_distrito === null || f.codigos_distrito.some(c => args.distritos!.includes(c)))
  }
  const resultado = await ejecutarExtractor({ fuente: fuente + '-revisado', tabla: 'alertas', lotes: lotes(), simulacion: args.simulacion })
  if (resultado.errores.length) throw new Error(resultado.errores.join('; '))
}
