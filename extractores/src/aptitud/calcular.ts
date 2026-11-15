// Resultado · Aptitud de cada cultivo en cada distrito → tabla `aptitud`. SEMANAL (después de clima, precios y amenazas).
//
// No llama a ninguna API: cruza lo que los demás temas ya guardaron.
//   clima_normales (NASA POWER, corregida por altitud) · suelos_zona (SoilGrids) · terreno_zona (SRTM)
//   requisitos_cultivo (FAO EcoCrop) · gaez_zona (FAO GAEZ) · amenazas_zona · precios_historico (PIMA)
//
// APT-01  Nota de un valor contra un rango EcoCrop: 100 dentro del óptimo; baja en línea recta hasta 0 en el límite
//         absoluto; fuera del absoluto 0. Sin dato → null (no se inventa).
// APT-02  nota_clima = temperatura (60 %) + altitud (40 %). Óptimo de las fichas MAG/INTA (cultivos/catalogo.ts, `local`),
//         límites absolutos de EcoCrop; altitud: 100 dentro del rango local, 0 a 600 m fuera de él.
//         GAEZ NO entra en la nota: sus píxeles de ≈ 9 km dan 0 a la papa en Cartago; queda solo como verificación.
// APT-03  nota_agua  = lluvia del ciclo contra el rango de EcoCrop (que para cultivos de ciclo corto es la lluvia del
//         ciclo, no la del año): lluvia anual × (días del ciclo / 365); cultivos de más de un año, la anual.
//         Ojo: NASA POWER sobreestima la lluvia en las montañas (Cartago ≈ 3 600 mm frente a ≈ 1 400 mm medidos).
// APT-04  nota_suelo = pH (80 %) + pendiente (20 %: 100 hasta 8 %, 0 desde 45 %).
// APT-05  nota_riesgo = 100 − (volcán, deslizamiento, sequía, inundación): muy_alto 35 · alto 20 · medio 8 · bajo 0.
// APT-06  nota_mercado = precio promedio de la última semana PIMA contra el de las semanas anteriores (sube → más nota).
//         Sin precios del cultivo → null y su peso se reparte entre las demás notas.
// APT-07  puntaje = clima 30 % · agua 25 % · suelo 20 % · riesgo 15 % · mercado 10 % (solo las notas con dato).
// APT-08  descartado si: temperatura fuera del rango absoluto, altitud sobre el máximo de EcoCrop, o sin datos de clima.
//         Si no: ≥ 85 excelente · ≥ 65 bueno · resto no_recomendado.
// APT-09  mes_siembra: el primero del calendario MAG/INTA (`local.meses`); si no hay, el de GAEZ; si no, el primer mes con ≥ 100 mm después de un mes con < 100 mm
//         (inicio de las lluvias); si llueve todo el año, null (se puede sembrar cualquier mes).
import type { Aptitud, Distrito, GaezZona, RequisitoCultivo, SueloZona, TerrenoZona } from '@terraformes/compartido'
import type { Argumentos } from '../comun/argumentos.ts'
import { cargarDistritos } from '../comun/distritos.ts'
import { CATALOGO } from '../cultivos/catalogo.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { leerTabla } from '../comun/leer-tabla.ts'
import { obtenerSupabase } from '../comun/supabase.ts'

const r0 = (n: number) => Math.round(n)

/** APT-01 */
export function notaRango(v: number | null | undefined, optMin: number | null, optMax: number | null, absMin: number | null, absMax: number | null): number | null {
  if (v == null || optMin == null || optMax == null) return null
  if (v >= optMin && v <= optMax) return 100
  const lim = v < optMin ? (absMin ?? optMin - (optMax - optMin)) : (absMax ?? optMax + (optMax - optMin))
  const borde = v < optMin ? optMin : optMax
  if (lim === borde) return 0
  const t = (v - borde) / (lim - borde)
  return t >= 1 ? 0 : r0(100 * (1 - t))
}

const PENALIZA: Record<string, number> = { muy_alto: 35, alto: 20, medio: 8, bajo: 0 }

export function mesSiembra(lluvia: (number | null)[]): number | null {
  if (lluvia.some((x) => x == null)) return null
  if (lluvia.every((x) => x! >= 100)) return null
  for (let i = 0; i < 12; i++) if (lluvia[i]! >= 100 && lluvia[(i + 11) % 12]! < 100) return i + 1
  return null
}

type Clima = { temp: number | null; lluvia: (number | null)[] }

export function aptitudDe(
  d: Pick<Distrito, 'codigo_distrito'>, req: RequisitoCultivo, c: Clima | undefined, s: SueloZona | undefined, t: TerrenoZona | undefined,
  g: GaezZona | undefined, riesgos: { tipo: string; nivel: string }[], mercado: number | null,
): Aptitud {
  const local = CATALOGO.find((x) => x.id === req.cultivo_id)
  const lluviaAnual = c && c.lluvia.every((x) => x != null) ? c.lluvia.reduce((a, b) => a! + b!, 0)! : null
  const cicloDias = local && local.ciclo_dias_min != null && local.ciclo_dias_max != null ? (local.ciclo_dias_min + local.ciclo_dias_max) / 2 : 365
  const lluviaCiclo = lluviaAnual == null ? null : Math.round(lluviaAnual * Math.min(1, cicloDias / 365))
  const [tMin, tMax] = local?.local.temp ?? [req.temp_opt_min_c, req.temp_opt_max_c]
  const notaTemp = notaRango(c?.temp, tMin, tMax, req.temp_abs_min_c, req.temp_abs_max_c)
  const [aMin, aMax] = local?.local.altitud ?? [null, null]
  const notaAlt = aMin == null || aMax == null ? null : notaRango(t?.altitud_m, aMin, aMax, aMin - 600, aMax + 600)
  const nota_clima = notaTemp == null ? null : notaAlt == null ? notaTemp : r0(0.6 * notaTemp + 0.4 * notaAlt)
  const nota_agua = notaRango(lluviaCiclo, req.lluvia_opt_min_mm, req.lluvia_opt_max_mm, req.lluvia_abs_min_mm, req.lluvia_abs_max_mm)
  const notaPh = notaRango(s?.ph, req.ph_opt_min, req.ph_opt_max, req.ph_abs_min, req.ph_abs_max)
  const p = t?.pendiente_pct
  const notaPend = p == null ? null : p <= 8 ? 100 : p >= 45 ? 0 : r0(100 * (1 - (p - 8) / 37))
  const nota_suelo = notaPh == null ? notaPend : notaPend == null ? notaPh : r0(0.8 * notaPh + 0.2 * notaPend)
  const nota_riesgo = Math.max(0, 100 - riesgos.reduce((a, r) => a + (PENALIZA[r.nivel] ?? 0), 0))

  const pesos: [number | null, number][] = [[nota_clima, 30], [nota_agua, 25], [nota_suelo, 20], [nota_riesgo, 15], [mercado, 10]]
  const usados = pesos.filter(([n]) => n != null) as [number, number][]
  const puntaje = usados.length ? r0(usados.reduce((a, [n, w]) => a + n * w, 0) / usados.reduce((a, [, w]) => a + w, 0)) : 0

  let motivo: string | null = null
  if (c?.temp == null) motivo = 'Sin datos de clima del distrito.'
  else if ((req.temp_abs_min_c != null && c.temp < req.temp_abs_min_c) || (req.temp_abs_max_c != null && c.temp > req.temp_abs_max_c))
    motivo = `Temperatura media ${c.temp.toFixed(1)} °C fuera de lo que aguanta (${req.temp_abs_min_c}–${req.temp_abs_max_c} °C).`
  else if (req.altitud_max_m != null && t?.altitud_m != null && t.altitud_m > req.altitud_max_m)
    motivo = `Altitud ${t.altitud_m} m sobre el máximo del cultivo (${req.altitud_max_m} m).`

  return {
    codigo_distrito: d.codigo_distrito, cultivo_id: req.cultivo_id,
    puntaje: motivo ? Math.min(puntaje, 20) : puntaje,
    nivel: motivo ? 'descartado' : puntaje >= 85 ? 'excelente' : puntaje >= 65 ? 'bueno' : 'no_recomendado',
    nota_clima, nota_suelo, nota_agua, nota_mercado: mercado, nota_riesgo,
    mes_siembra: local?.local.meses[0] ?? g?.mes_siembra ?? (c ? mesSiembra(c.lluvia) : null),
    motivo_descarte: motivo,
  }
}

/** Normales de temperatura y lluvia por distrito (vista clima_normales, NASA POWER). */
async function normales(): Promise<Map<string, Clima>> {
  const out = new Map<string, Clima & { temps: (number | null)[] }>()
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await obtenerSupabase().from('clima_normales').select('codigo_distrito,mes_num,temp_normal_c,lluvia_normal_mm')
      .eq('fuente', 'nasa-power').order('codigo_distrito').order('mes_num').range(desde, desde + 999)
    if (error) throw new Error(`No se pudo leer clima_normales: ${error.message}`)
    for (const f of data as { codigo_distrito: string; mes_num: number; temp_normal_c: number | null; lluvia_normal_mm: number | null }[]) {
      if (!out.has(f.codigo_distrito)) out.set(f.codigo_distrito, { temp: null, lluvia: Array(12).fill(null), temps: Array(12).fill(null) })
      const c = out.get(f.codigo_distrito)!
      c.lluvia[f.mes_num - 1] = f.lluvia_normal_mm == null ? null : Number(f.lluvia_normal_mm)
      c.temps[f.mes_num - 1] = f.temp_normal_c == null ? null : Number(f.temp_normal_c)
    }
    if (data.length < 1000) break
  }
  for (const c of out.values()) {
    const v = c.temps.filter((x): x is number => x != null)
    c.temp = v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
  }
  return out
}

/** APT-06: tendencia del precio promedio (última semana contra las anteriores), por cultivo. */
async function notasMercado(): Promise<Map<string, number>> {
  const { data, error } = await obtenerSupabase().from('precios_historico').select('cultivo_id,fecha_dato,precio_promedio,variedad,unidad')
    .not('cultivo_id', 'is', null).order('fecha_dato', { ascending: false }).limit(5000)
  if (error) throw new Error(`No se pudo leer precios_historico: ${error.message}`)
  const filas = data as { cultivo_id: string; fecha_dato: string; precio_promedio: number | null; variedad: string; unidad: string }[]
  if (!filas.length) return new Map()
  const corte = new Date(Date.parse(filas[0].fecha_dato) - 7 * 864e5).toISOString().slice(0, 10)
  const grupos = new Map<string, { nuevo: number[]; viejo: number[] }>()
  for (const f of filas) {
    if (f.precio_promedio == null) continue
    const k = `${f.cultivo_id}|${f.variedad}|${f.unidad}`
    if (!grupos.has(k)) grupos.set(k, { nuevo: [], viejo: [] })
    grupos.get(k)![f.fecha_dato > corte ? 'nuevo' : 'viejo'].push(Number(f.precio_promedio))
  }
  const cambios = new Map<string, number[]>()
  const prom = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length
  for (const [k, g] of grupos) {
    if (!g.nuevo.length || !g.viejo.length) continue
    const id = k.split('|')[0]
    if (!cambios.has(id)) cambios.set(id, [])
    cambios.get(id)!.push(prom(g.nuevo) / prom(g.viejo) - 1)
  }
  // 0 % de cambio = 60; cada 1 % de subida suma 2 puntos (tope 100), cada 1 % de bajada resta 2 (piso 20).
  return new Map([...cambios].map(([id, v]) => [id, Math.max(20, Math.min(100, r0(60 + 200 * prom(v))))]))
}

export async function calcularAptitud(a: Argumentos) {
  const [distritos, requisitos, suelos, terreno, gaez, clima, mercado] = await Promise.all([
    cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo }),
    leerTabla<RequisitoCultivo>('requisitos_cultivo'), leerTabla<SueloZona>('suelos_zona'), leerTabla<TerrenoZona>('terreno_zona'),
    leerTabla<GaezZona>('gaez_zona'), normales(), notasMercado(),
  ])
  if (!requisitos.length) throw new Error('requisitos_cultivo está vacía: correr antes `cultivos` y `ecocrop`')
  const amenazas = await leerTabla<{ codigo_distrito: string; tipo: string; nivel: string }>('amenazas_zona')
  const porDistrito = <T extends { codigo_distrito: string }>(v: T[]) => new Map(v.map((x) => [x.codigo_distrito, x]))
  const S = porDistrito(suelos), T = porDistrito(terreno)
  const G = new Map(gaez.map((g) => [`${g.codigo_distrito}|${g.cultivo_id}`, g]))
  const A = new Map<string, { tipo: string; nivel: string }[]>()
  for (const x of amenazas) A.set(x.codigo_distrito, [...(A.get(x.codigo_distrito) ?? []), x])

  const filas = distritos.flatMap((d) => requisitos.map((req) => aptitudDe(
    d, req, clima.get(d.codigo_distrito), S.get(d.codigo_distrito), T.get(d.codigo_distrito),
    G.get(`${d.codigo_distrito}|${req.cultivo_id}`), A.get(d.codigo_distrito) ?? [], mercado.get(req.cultivo_id) ?? null,
  )))
  const cuenta = (n: string) => filas.filter((f) => f.nivel === n).length
  console.log(`Aptitud: ${filas.length} filas (excelente ${cuenta('excelente')}, bueno ${cuenta('bueno')}, no recomendado ${cuenta('no_recomendado')}, descartado ${cuenta('descartado')}) · mercado con precios: ${[...mercado.keys()].join(', ') || 'ninguno'}`)
  const r = await ejecutarExtractor({ fuente: 'aptitud-calcular', tabla: 'aptitud', lotes: [filas], simulacion: a.simulacion })
  if (r.errores.length) throw new Error(r.errores.join('; '))
}
