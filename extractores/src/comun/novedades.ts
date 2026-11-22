// Revisión de datos nuevos (diario.yml). GitHub corre el flujo cada 3 horas y este paso mira en Supabase qué
// tan al día está cada tema, para correr solo los extractores que tienen algo nuevo que traer. Revisar no llama
// a ninguna fuente (solo lee Supabase): si todo está al día, no se baja nada.
//
//   clima      falta el día de ayer (hora de Costa Rica) en clima_diario de Open-Meteo.
//   humedad    falta el día de ayer en humedad_suelo de Open-Meteo. Si el clima también corre (o corrió hace
//              menos de una hora), espera a la siguiente revisión: los dos juntos pasarían el límite de
//              Open-Meteo de 5 000 llamadas por hora.
//   precios    de lunes a viernes, mientras no esté el boletín PIMA de hoy (los fines de semana no publica).
//   imn        una vez al día: el pronóstico subestacional cambia cada semana y leerlo es una sola consulta.
//   lluvia     falta el día UTC de ayer en lluvia_satelite (GPM IMERG). No corre si la tabla no existe todavía.
//
// En GitHub deja las respuestas en GITHUB_OUTPUT (clima=true, ...) y una tabla en el resumen de la corrida.
import { appendFile } from 'node:fs/promises'
import type { Argumentos } from './argumentos.ts'
import { obtenerSupabase } from './supabase.ts'

const HORAS_CR = -6 // Costa Rica no cambia de hora en el año
const MINUTOS_ENTRE_OPEN_METEO = 70

/** Fecha (AAAA-MM-DD) en Costa Rica, corrida `dias` días. */
export function fechaCR(dias = 0, ahora = new Date()): string {
  return new Date(ahora.getTime() + HORAS_CR * 36e5 + dias * 864e5).toISOString().slice(0, 10)
}
/** 0 = domingo … 6 = sábado, en Costa Rica. */
const diaSemanaCR = (ahora: Date) => new Date(ahora.getTime() + HORAS_CR * 36e5).getUTCDay()

export interface Estado {
  ahora: Date
  /** Fecha más nueva guardada de cada tema (null si la tabla está vacía). */
  clima: string | null
  humedad: string | null
  pima: string | null
  /** Fecha (Costa Rica) de la última lectura correcta del pronóstico del IMN. */
  imnUltimaOk: string | null
  /** Inicio de la última corrida del clima de Open-Meteo (cuenta para el límite por hora). */
  climaUltimoInicio: Date | null
  /** Día UTC más nuevo de lluvia por satélite (GPM IMERG); undefined = la tabla todavía no existe (migración 016). */
  imerg?: string | null
}

export type Tema = 'clima' | 'humedad' | 'precios' | 'imn' | 'lluvia'
export type Decision = Record<Tema, { correr: boolean; motivo: string }>

const dma = (f: string | null) => (f ? f.split('-').reverse().join('-') : 'nada')

/** Qué hace falta correr. Sin consultas: así se puede probar con cualquier fecha. */
export function decidir(e: Estado): Decision {
  const hoy = fechaCR(0, e.ahora)
  const ayer = fechaCR(-1, e.ahora)

  const climaAtrasado = !e.clima || e.clima < ayer
  const clima = climaAtrasado
    ? { correr: true, motivo: `faltan días: hay hasta ${dma(e.clima)} y ayer fue ${dma(ayer)}` }
    : { correr: false, motivo: `al día (hasta ${dma(e.clima)})` }

  const humedadAtrasada = !e.humedad || e.humedad < ayer
  const climaReciente = !!e.climaUltimoInicio && e.ahora.getTime() - e.climaUltimoInicio.getTime() < MINUTOS_ENTRE_OPEN_METEO * 6e4
  const humedad = !humedadAtrasada
    ? { correr: false, motivo: `al día (hasta ${dma(e.humedad)})` }
    : climaAtrasado || climaReciente
      ? { correr: false, motivo: `faltan días (hay hasta ${dma(e.humedad)}), pero espera a la próxima revisión: el clima usa Open-Meteo en esta hora` }
      : { correr: true, motivo: `faltan días: hay hasta ${dma(e.humedad)} y ayer fue ${dma(ayer)}` }

  const dia = diaSemanaCR(e.ahora)
  const precios = dia === 0 || dia === 6
    ? { correr: false, motivo: 'fin de semana: el PIMA no publica boletín' }
    : e.pima && e.pima >= hoy
      ? { correr: false, motivo: `ya está el boletín de hoy (${dma(e.pima)})` }
      : { correr: true, motivo: `falta el boletín de hoy (el último es del ${dma(e.pima)})` }

  const imn = e.imnUltimaOk === hoy
    ? { correr: false, motivo: 'ya se revisó hoy' }
    : { correr: true, motivo: `última revisión: ${dma(e.imnUltimaOk)}` }

  // Lluvia por satélite: la NASA publica el día UTC unas horas después de que termina; si todavía no sale, la
  // próxima revisión vuelve a probar.
  const ayerUtc = new Date(e.ahora.getTime() - 864e5).toISOString().slice(0, 10)
  const lluvia = e.imerg === undefined
    ? { correr: false, motivo: 'falta la tabla lluvia_satelite (migración 016)' }
    : e.imerg && e.imerg >= ayerUtc
      ? { correr: false, motivo: `al día (hasta ${dma(e.imerg)}, día UTC)` }
      : { correr: true, motivo: `falta el día UTC ${dma(ayerUtc)} (hay hasta ${dma(e.imerg)})` }

  return { clima, humedad, precios, imn, lluvia }
}

async function fechaMasNueva(tabla: string, columna: string, fuente: string): Promise<string | null> {
  const { data, error } = await obtenerSupabase().from(tabla).select(columna).eq('fuente', fuente)
    .order(columna, { ascending: false }).limit(1)
  if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`)
  return ((data?.[0] ?? null) as Record<string, string> | null)?.[columna] ?? null
}

async function ultimaCorrida(fuente: string, soloOk: boolean): Promise<Date | null> {
  let q = obtenerSupabase().from('extracciones').select('inicio').eq('fuente', fuente)
  if (soloOk) q = q.eq('estado', 'ok')
  const { data, error } = await q.order('inicio', { ascending: false }).limit(1)
  if (error) throw new Error(`No se pudo leer extracciones: ${error.message}`)
  const inicio = (data?.[0] as { inicio: string } | undefined)?.inicio
  return inicio ? new Date(inicio) : null
}

/** Deja una línea "nombre=valor" para los pasos siguientes del flujo (solo en GitHub). */
async function salida(lineas: string[]) {
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, lineas.join('\n') + '\n')
}

export async function revisarNovedades(_a: Argumentos) {
  const ahora = new Date()
  const [clima, humedad, pima, imnOk, climaInicio] = await Promise.all([
    fechaMasNueva('clima_diario', 'fecha', 'open-meteo'),
    fechaMasNueva('humedad_suelo', 'fecha', 'open-meteo'),
    fechaMasNueva('precios_historico', 'fecha_dato', 'pima'),
    ultimaCorrida('imn-subestacional', true),
    ultimaCorrida('clima-open-meteo', false),
  ])
  // La tabla de lluvia por satélite puede no existir todavía (migración 016 sin aplicar): eso no frena lo demás.
  const imerg = await fechaMasNueva('lluvia_satelite', 'fecha', 'imerg').catch(() => undefined)
  const d = decidir({ ahora, clima, humedad, pima, imnUltimaOk: imnOk ? fechaCR(0, imnOk) : null, climaUltimoInicio: climaInicio, imerg })

  const nombres: Record<Tema, string> = {
    clima: 'Clima (Open-Meteo)', humedad: 'Humedad del suelo', precios: 'Precios PIMA', imn: 'Pronóstico IMN', lluvia: 'Lluvia por satélite',
  }
  for (const t of Object.keys(d) as Tema[]) console.log(`${d[t].correr ? '▶ corre ' : '· no    '} ${nombres[t].padEnd(20)} ${d[t].motivo}`)

  // precios_hasta: para saber después si el PIMA trajo un boletín más nuevo (y recalcular la aptitud).
  await salida([...(Object.keys(d) as Tema[]).map((t) => `${t}=${d[t].correr}`), `precios_hasta=${pima ?? ''}`])
  if (process.env.GITHUB_STEP_SUMMARY) {
    const filas = (Object.keys(d) as Tema[]).map((t) => `| ${nombres[t]} | ${d[t].correr ? '▶ Sí' : 'No'} | ${d[t].motivo} |`)
    await appendFile(process.env.GITHUB_STEP_SUMMARY, ['### ¿Hay datos nuevos?', '', '| Tema | ¿Se baja? | Por qué |', '|---|---|---|', ...filas, ''].join('\n'))
  }
}

/** Después de correr el PIMA: ¿quedó un boletín más nuevo que el de antes (--desde)? Deja nuevos=true/false. */
export async function preciosNuevos(a: Argumentos) {
  const ahora = await fechaMasNueva('precios_historico', 'fecha_dato', 'pima')
  const nuevos = !!ahora && (!a.desde || ahora > a.desde)
  console.log(nuevos ? `Boletín nuevo: ${dma(ahora)} (antes ${dma(a.desde ?? null)})` : `Sin boletín nuevo (sigue ${dma(ahora)})`)
  await salida([`nuevos=${nuevos}`])
}
