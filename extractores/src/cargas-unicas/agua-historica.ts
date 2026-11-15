// Tema 4 · ESTUDIO HÍDRICO — carga histórica UNA VEZ (unica-vez.yml), sin llamar a ninguna API:
// agrega por semana y mes todo lo que ya haya en clima_diario.
//   fuente 'open-meteo' → lluvia + ET0 (tema 1)
//   fuente 'nasa-power' → solo lluvia (POWER no trae ET0; la carga el tema 7). Es el "POWER opcional,
//                         histórico" del PDF, sin consultas extra.
// Avanza año por año para no traer millones de filas de una vez.
// Uso: npm run extraer -- agua-historica [--desde=2021-01-01] [--hasta=AAAA-MM-DD]
import type { Argumentos } from '../comun/argumentos.ts'
import { agregarRango } from '../agua/open-meteo.ts'
import { lunesDe } from '../agua/agregar.ts'

export async function cargarAguaHistorica(args: Argumentos): Promise<void> {
  const desde = args.desde ?? '2021-01-01'
  const hasta = args.hasta ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  for (const fuente of ['open-meteo', 'nasa-power']) {
    for (let anio = Number(desde.slice(0, 4)); anio <= Number(hasta.slice(0, 4)); anio++) {
      // Cada tramo empieza el 1 de enero (o en `desde`) para que los meses queden completos, y termina el
      // domingo de la semana del 31 de diciembre para que esa semana también quede completa. El enero
      // parcial que se cuela se reescribe completo en el tramo siguiente (el upsert lo reemplaza).
      const ini = anio === Number(desde.slice(0, 4)) ? desde : `${anio}-01-01`
      const domingo = new Date(Date.parse(lunesDe(`${anio}-12-31`)) + 6 * 86_400_000).toISOString().slice(0, 10)
      const fin = domingo < hasta ? domingo : hasta
      await agregarRango(fuente, fuente, ini, fin, args, `agua-historica-${fuente}-${anio}`)
    }
  }
}
