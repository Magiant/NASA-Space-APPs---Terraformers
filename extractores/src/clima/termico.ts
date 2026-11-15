// Tema 7 · Análisis térmico sobre clima_diario: olas de calor y evaluación de cultivos y plagas.
// Adaptado del prototipo "clima NASA por distrito" (ver docs/temperatura-termica.md).
// Funciones puras: no consultan APIs ni Supabase, así se prueban sin red.
//
// Reglas comunes:
//   * "Sin dato" (null) nunca cuenta como 0: rompe rachas y baja la cobertura.
//   * Sin datos suficientes no se aprueba nada: el estado es 'datos_insuficientes'.
//   * Los umbrales de cultivos vienen de requisitos_cultivo (EcoCrop); los de plagas, de perfiles con fuente.
import type { ClimaDiario, RequisitoCultivo } from '@terraformes/compartido'

export type Dia = Pick<ClimaDiario, 'fecha' | 'temp_media_c' | 'temp_max_c' | 'temp_min_c'>

// ------------------------------------------------------------------------------------------
// Fechas
// ------------------------------------------------------------------------------------------

/** Fechas AAAA-MM-DD entre dos días, ambos incluidos. */
export function rangoFechas(desde: string, hasta: string): string[] {
  const fechas: string[] = []
  for (let d = new Date(`${desde}T00:00:00Z`); d <= new Date(`${hasta}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    fechas.push(d.toISOString().slice(0, 10))
  }
  return fechas
}

/** Día siguiente a una fecha AAAA-MM-DD. */
export const diaSiguiente = (fecha: string) => new Date(Date.parse(`${fecha}T00:00:00Z`) + 864e5).toISOString().slice(0, 10)

/** Fecha local de una zona horaria (por defecto Costa Rica), aunque en UTC ya sea el día siguiente. */
export function fechaZona(zona = 'America/Costa_Rica', ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

const mesDe = (fecha: string) => Number(fecha.slice(5, 7))
const anioDe = (fecha: string) => Number(fecha.slice(0, 4))

// ------------------------------------------------------------------------------------------
// Olas de calor
// ------------------------------------------------------------------------------------------

/** Percentil con interpolación lineal (p entre 0 y 100). */
export function percentil(valores: number[], p: number): number | null {
  if (!valores.length) return null
  const v = [...valores].sort((a, b) => a - b)
  const pos = (p / 100) * (v.length - 1)
  const i = Math.floor(pos)
  return i + 1 < v.length ? v[i] + (v[i + 1] - v[i]) * (pos - i) : v[i]
}

/**
 * Umbral de ola de calor de cada mes (índice 0 = enero): el percentil `p` de las máximas diarias
 * de ese mes en el histórico. Si el mes tiene menos de `aniosMin` años con datos → null (no se detectan olas).
 */
export function umbralesOla(historico: Dia[], { p = 90, aniosMin = 2 } = {}): Array<number | null> {
  return Array.from({ length: 12 }, (_, i) => {
    const delMes = historico.filter((d) => mesDe(d.fecha) === i + 1 && d.temp_max_c !== null)
    const anios = new Set(delMes.map((d) => anioDe(d.fecha)))
    if (anios.size < aniosMin) return null
    const u = percentil(delMes.map((d) => d.temp_max_c as number), p)
    return u === null ? null : Math.round(u * 100) / 100
  })
}

export interface Ola {
  inicio: string
  fin: string
  dias_totales: number
  /** Días de la ola que caen en el mes pedido (si se pidió uno). */
  dias_en_mes: number | null
  temp_max_media_c: number
  temp_max_pico_c: number
  /** La ola sigue al terminar la serie: puede durar más. */
  abierta_al_cierre_serie: boolean
}

/**
 * Detecta olas de calor: `diasOla` o más días SEGUIDOS con la máxima por encima del umbral de su mes.
 * Un día sin dato o una fecha que falta rompe la racha. Las olas que cruzan de un mes a otro se
 * conservan enteras; con `mes` ('AAAA-MM') solo se devuelven las que tocan ese mes y se cuentan sus días ahí.
 */
export function detectarOlas(dias: Dia[], umbrales: Array<number | null>, { diasOla = 3, mes }: { diasOla?: number; mes?: string } = {}): Ola[] {
  const serie = [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const ultima = serie.at(-1)?.fecha
  const olas: Ola[] = []
  let racha: Dia[] = []

  const cerrar = () => {
    if (racha.length >= diasOla) {
      const maximas = racha.map((d) => d.temp_max_c as number)
      const fin = racha.at(-1)!.fecha
      olas.push({
        inicio: racha[0].fecha,
        fin,
        dias_totales: racha.length,
        dias_en_mes: mes ? racha.filter((d) => d.fecha.startsWith(mes)).length : null,
        temp_max_media_c: Math.round((maximas.reduce((a, b) => a + b, 0) / maximas.length) * 100) / 100,
        temp_max_pico_c: Math.max(...maximas),
        abierta_al_cierre_serie: fin === ultima,
      })
    }
    racha = []
  }

  for (const d of serie) {
    const umbral = umbrales[mesDe(d.fecha) - 1]
    const caliente = d.temp_max_c !== null && umbral !== null && umbral !== undefined && d.temp_max_c > umbral
    const seguido = racha.length > 0 && diaSiguiente(racha.at(-1)!.fecha) === d.fecha
    if (!caliente) { cerrar(); continue }
    if (racha.length && !seguido) cerrar()
    racha.push(d)
  }
  cerrar()
  return mes ? olas.filter((o) => (o.dias_en_mes ?? 0) > 0) : olas
}

// ------------------------------------------------------------------------------------------
// Cobertura de datos
// ------------------------------------------------------------------------------------------

const completo = (d: Dia) => d.temp_media_c !== null && d.temp_max_c !== null && d.temp_min_c !== null

/** Días con las tres temperaturas sobre los días esperados del periodo (0 a 1). */
export function cobertura(dias: Dia[], diasEsperados: number): number {
  return diasEsperados > 0 ? dias.filter(completo).length / diasEsperados : 0
}

// ------------------------------------------------------------------------------------------
// Evaluación térmica de cultivos (con requisitos_cultivo de EcoCrop)
// ------------------------------------------------------------------------------------------

export type EstadoCultivo =
  | 'apto'
  | 'fuera_rango_optimo'               // la media se sale del óptimo, pero los extremos se aguantan
  | 'fuera_tolerancia_por_extremos'    // algún día pasó la máxima o la mínima absoluta
  | 'datos_insuficientes'
  | 'sin_requisitos'

export interface EvaluacionCultivo {
  cultivo_id: string
  estado: EstadoCultivo
  temp_media_c: number | null
  dias_validos: number
  dias_sobre_max_abs: number
  dias_bajo_min_abs: number
}

type Requisito = Pick<RequisitoCultivo, 'cultivo_id' | 'temp_opt_min_c' | 'temp_opt_max_c' | 'temp_abs_min_c' | 'temp_abs_max_c'>

/**
 * ¿La temperatura del periodo le sirve al cultivo? La media aceptable NO oculta los extremos:
 * un solo día fuera de la tolerancia absoluta lo marca.
 */
export function evaluarCultivo(dias: Dia[], req: Requisito, { diasEsperados = dias.length, coberturaMin = 0.9 } = {}): EvaluacionCultivo {
  const validos = dias.filter(completo)
  const media = validos.length ? Math.round((validos.reduce((a, d) => a + (d.temp_media_c as number), 0) / validos.length) * 100) / 100 : null
  const sobre = req.temp_abs_max_c === null ? 0 : validos.filter((d) => (d.temp_max_c as number) > req.temp_abs_max_c!).length
  const bajo = req.temp_abs_min_c === null ? 0 : validos.filter((d) => (d.temp_min_c as number) < req.temp_abs_min_c!).length
  const base = { cultivo_id: req.cultivo_id, temp_media_c: media, dias_validos: validos.length, dias_sobre_max_abs: sobre, dias_bajo_min_abs: bajo }

  if ([req.temp_opt_min_c, req.temp_opt_max_c, req.temp_abs_min_c, req.temp_abs_max_c].some((v) => v === null)) return { ...base, estado: 'sin_requisitos' }
  if (cobertura(dias, diasEsperados) < coberturaMin || media === null) return { ...base, estado: 'datos_insuficientes' }
  if (sobre || bajo) return { ...base, estado: 'fuera_tolerancia_por_extremos' }
  if (media < req.temp_opt_min_c! || media > req.temp_opt_max_c!) return { ...base, estado: 'fuera_rango_optimo' }
  return { ...base, estado: 'apto' }
}

// ------------------------------------------------------------------------------------------
// Evaluación térmica de plagas (perfiles del estudio del equipo)
// ------------------------------------------------------------------------------------------

export interface PerfilPlaga {
  id: string
  nombre: string
  /** Referencia de donde sale el rango (artículo, ficha del SFE/MAG...). Obligatoria. */
  fuente: string
  media_favorable_min_c: number
  media_favorable_max_c: number
  /** Días favorables en el periodo a partir de los cuales se avisa. */
  dias_favorables_alerta: number
}

/** Rechaza perfiles sin fuente o con rangos imposibles. Una lista vacía es válida. */
export function validarPerfilesPlaga(perfiles: PerfilPlaga[]): PerfilPlaga[] {
  for (const p of perfiles) {
    if (!p.fuente?.trim()) throw new Error(`La plaga ${p.id} no tiene fuente para su rango de temperatura`)
    if (!(p.media_favorable_min_c < p.media_favorable_max_c)) throw new Error(`La plaga ${p.id} tiene un rango de temperatura inválido`)
    if (!(p.dias_favorables_alerta >= 1)) throw new Error(`La plaga ${p.id} necesita dias_favorables_alerta ≥ 1`)
  }
  return perfiles
}

export interface EvaluacionPlaga {
  plaga_id: string
  estado: 'condiciones_favorables' | 'umbral_termico_no_alcanzado' | 'datos_insuficientes'
  dias_favorables: number
}

/**
 * Cuenta los días con la media dentro del rango favorable de la plaga. Más calor NO siempre es más
 * riesgo: un día por encima del rango no cuenta.
 */
export function evaluarPlaga(dias: Dia[], p: PerfilPlaga, { diasEsperados = dias.length, coberturaMin = 0.9 } = {}): EvaluacionPlaga {
  const favorables = dias.filter((d) => d.temp_media_c !== null && d.temp_media_c >= p.media_favorable_min_c && d.temp_media_c <= p.media_favorable_max_c).length
  if (cobertura(dias, diasEsperados) < coberturaMin) return { plaga_id: p.id, estado: 'datos_insuficientes', dias_favorables: favorables }
  return {
    plaga_id: p.id,
    estado: favorables >= p.dias_favorables_alerta ? 'condiciones_favorables' : 'umbral_termico_no_alcanzado',
    dias_favorables: favorables,
  }
}
