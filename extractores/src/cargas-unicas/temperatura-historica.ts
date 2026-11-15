// Tema 7 · TEMPERATURA — carga histórica UNA VEZ (unica-vez.yml) con NASA POWER.
// Cuesta lo mismo que la semanal: una consulta por celda (≈ 30) con todo el rango de fechas.
//
// Ojo con el espacio en Supabase: cada año son ≈ 180 000 filas (492 distritos × 365 días).
// Por defecto carga desde 2021 (≈ 1 millón de filas). Para más años: --desde=2001-01-01
// (≈ 4,5 millones de filas; revisar antes el límite de almacenamiento del plan de Supabase).
// Uso: npm run extraer -- temperatura-historica [--desde=2021-01-01] [--hasta=AAAA-MM-DD]
import type { Argumentos } from '../comun/argumentos.ts'
import { cargarPower } from '../clima/power.ts'

export const DESDE_POR_DEFECTO = '2021-01-01'

export async function cargarTemperaturaHistorica(args: Argumentos): Promise<void> {
  const hasta = args.hasta ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  await cargarPower(args, args.desde ?? DESDE_POR_DEFECTO, hasta, 'temperatura-nasa-power-historico')
}
