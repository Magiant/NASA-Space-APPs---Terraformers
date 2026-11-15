// Tema 1 · CLIMA — carga histórica UNA VEZ (unica-vez.yml) con la Historical Weather API de Open-Meteo.
//
// Ojo con el límite gratis: cada punto cuesta (días / 14) llamadas. Con ~4 000 puntos (492 distritos
// × 5–20 puntos), UN mes de historia ≈ 9 000 llamadas, casi todo el cupo diario de 10 000.
// Por eso esta carga:
//   * avanza mes por mes y se DETIENE al llegar al --presupuesto de llamadas (por defecto 9 000);
//   * es REANUDABLE: antes de pedir un mes revisa en Supabase qué distritos ya lo tienen completo
//     y los salta. Se vuelve a correr al día siguiente y sigue donde quedó.
//   * --puntos-max=5 baja el costo (mínimo del PDF: 5 puntos por distrito).
// Uso: --desde=2025-01-01 --hasta=2025-12-31 [--presupuesto=9000] [--puntos-max=5] [--simulacion]
import type { Distrito } from '@terraformes/compartido'
import { cargarDistritos } from '../comun/distritos.ts'
import { ejecutarExtractor } from '../comun/ejecutar.ts'
import { obtenerSupabase } from '../comun/supabase.ts'
import type { Argumentos } from '../comun/argumentos.ts'
import { consultarPorTandas, costoLlamadas, hoyCostaRica, puntosDeDistritos, URL_HISTORICO } from '../clima/open-meteo.ts'

/** Meses entre dos fechas como rangos [desde, hasta] (el último mes se recorta a `hasta`). */
export function mesesEntre(desde: string, hasta: string): Array<[string, string]> {
  const meses: Array<[string, string]> = []
  let [a, m] = desde.split('-').map(Number)
  const fin = hasta
  for (;;) {
    const ini = `${a}-${String(m).padStart(2, '0')}-01`
    if (ini > fin) break
    const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
    meses.push([ini < desde ? desde : ini, ultimo > fin ? fin : ultimo])
    m++
    if (m > 12) { m = 1; a++ }
  }
  return meses
}

const diasEntre = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1

/** Distritos que ya tienen todos los días del rango con fuente 'open-meteo' (para saltarlos). */
async function yaCompletos(codigos: string[], desde: string, hasta: string): Promise<Set<string>> {
  const cuenta = new Map<string, number>()
  for (let i = 0; i < codigos.length; i += 100) {
    for (let pag = 0; ; pag += 1000) {
      const { data, error } = await obtenerSupabase().from('clima_diario').select('codigo_distrito')
        .eq('fuente', 'open-meteo').gte('fecha', desde).lte('fecha', hasta)
        .in('codigo_distrito', codigos.slice(i, i + 100)).range(pag, pag + 999)
      if (error) throw new Error(`No se pudo revisar lo ya cargado: ${error.message}`)
      for (const f of data) cuenta.set(f.codigo_distrito, (cuenta.get(f.codigo_distrito) ?? 0) + 1)
      if (data.length < 1000) break
    }
  }
  const dias = diasEntre(desde, hasta)
  return new Set([...cuenta].filter(([, n]) => n >= dias).map(([c]) => c))
}

export async function cargarClimaHistorico(args: Argumentos): Promise<void> {
  if (!args.desde) throw new Error('Falta --desde=AAAA-MM-DD (y opcional --hasta). Ej.: --desde=2025-01-01 --hasta=2025-12-31')
  // El archivo histórico de Open-Meteo llega con unos días de atraso; por defecto, hasta hace 7 días.
  const hasta = args.hasta ?? new Date(Date.parse(hoyCostaRica()) - 7 * 86_400_000).toISOString().slice(0, 10)
  const presupuesto = args.presupuesto ?? 9000
  const distritos = await cargarDistritos({ codigos: args.distritos, archivo: args.distritosArchivo })
  const porCodigo = new Map(distritos.map((d) => [d.codigo_distrito, d]))
  let gastado = 0
  let detenido = false

  async function* lotes() {
    for (const [ini, fin] of mesesEntre(args.desde!, hasta)) {
      const listos = args.simulacion ? new Set<string>() : await yaCompletos([...porCodigo.keys()], ini, fin)
      const pendientes: Distrito[] = distritos.filter((d) => !listos.has(d.codigo_distrito))
      if (!pendientes.length) { console.log(`  ${ini.slice(0, 7)}: ya estaba completo`); continue }
      const puntos = puntosDeDistritos(pendientes, args.puntosMax)
      const costo = costoLlamadas(puntos.length, diasEntre(ini, fin))
      if (gastado + costo > presupuesto) {
        detenido = true
        console.log(`  ■ Presupuesto alcanzado (${Math.round(gastado)} de ${presupuesto} llamadas). ` +
          `Falta desde ${ini}: vuelve a correr la carga mañana y sigue desde aquí.`)
        return
      }
      console.log(`  ${ini.slice(0, 7)}: ${pendientes.length} distritos, ${puntos.length} puntos, ≈ ${Math.round(costo)} llamadas`)
      yield* consultarPorTandas(puntos, URL_HISTORICO, { desde: ini, hasta: fin }, diasEntre(ini, fin))
      gastado += costo
    }
  }

  console.log(`Clima Open-Meteo (histórico ${args.desde} → ${hasta}), presupuesto ${presupuesto} llamadas`)
  await ejecutarExtractor({ fuente: 'clima-open-meteo-historico', tabla: 'clima_diario', lotes: lotes(), simulacion: args.simulacion })
  if (detenido) console.log('  La carga quedó a medias a propósito (cupo de Open-Meteo). Es seguro volver a correrla.')
}
