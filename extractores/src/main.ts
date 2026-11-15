// Punto de entrada de los extractores. Cada tema agrega UNA línea en EXTRACTORES.
//
//   npm run extraer -- clima --simulacion --distritos=CR10101,CR30110
//   npm run extraer -- clima-historico --desde=2025-01-01 --hasta=2025-12-31
//
// Opciones comunes: --simulacion (no escribe en Supabase), --distritos=CR10101,CR30110,
// --distritos-archivo=<json> (probar sin la tabla distritos), --puntos-max=N.
import { leerArgumentos, type Argumentos } from './comun/argumentos.ts'
import { extraerClimaOpenMeteo } from './clima/open-meteo.ts'
import { cargarClimaHistorico } from './cargas-unicas/clima-historico.ts'

const EXTRACTORES: Record<string, (a: Argumentos) => Promise<void>> = {
  // Tema 1 · Clima
  'clima': extraerClimaOpenMeteo,          // diario.yml
  'clima-historico': cargarClimaHistorico, // unica-vez.yml
  // Los demás temas agregan su línea aquí.
}

const args = leerArgumentos()
if (!args.nombre || !EXTRACTORES[args.nombre]) {
  console.error(`Uso: npm run extraer -- <nombre> [opciones]\nDisponibles: ${Object.keys(EXTRACTORES).join(', ')}`)
  process.exit(2)
}
try {
  await EXTRACTORES[args.nombre](args)
} catch (e) {
  console.error(`✘ ${args.nombre}: ${(e as Error).message}`)
  process.exit(1)
}
