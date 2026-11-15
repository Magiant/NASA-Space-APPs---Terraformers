// Punto de entrada de los extractores. Cada tema agrega UNA línea en EXTRACTORES.
//
//   npm run extraer -- clima --simulacion --distritos=CR10101,CR30110
//   npm run extraer -- clima-historico --desde=2025-01-01 --hasta=2025-12-31
//
// Opciones comunes: --simulacion (no escribe en Supabase), --distritos=CR10101,CR30110,
// --distritos-archivo=<json> (probar sin la tabla distritos), --puntos-max=N.
import { leerArgumentos, type Argumentos } from './comun/argumentos.ts'
// Cada comando carga solo sus dependencias al ejecutarse.



const EXTRACTORES: Record<string, (a: Argumentos) => Promise<void>> = {
  // Tema 1 · Clima
  'clima': async a => (await import('./clima/open-meteo.ts')).extraerClimaOpenMeteo(a),          // diario.yml
  'clima-historico': async a => (await import('./cargas-unicas/clima-historico.ts')).cargarClimaHistorico(a), // unica-vez.yml
  'cne': async a => (await import('./riesgos/cne.ts')).extraerCNE(a), // diario.yml: boletines revisados
  'imn': async a => (await import('./riesgos/imn.ts')).extraerIMN(a), // diario.yml: boletines revisados
  'amenazas': async a => (await import('./cargas-unicas/amenazas.ts')).cargarAmenazas(a), // unica-vez.yml
  'capacitacion-ina': async a => (await import('./capacitacion/ina.ts')).extraerIna(a), // semanal.yml
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
