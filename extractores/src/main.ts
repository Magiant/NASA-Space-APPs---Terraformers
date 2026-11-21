// Punto de entrada de los extractores. Cada tema agrega UNA línea en EXTRACTORES.
//
//   npm run extraer -- clima --simulacion --distritos=CR10101,CR30110
//   npm run extraer -- clima-historico --desde=2025-01-01 --hasta=2025-12-31
//
// Opciones comunes: --simulacion (no escribe en Supabase), --distritos=CR10101,CR30110,
// --distritos-archivo=<json> (probar sin la tabla distritos), --puntos-max=N, --desde, --hasta,
// --archivo=<ruta> y --regiones-archivo=<ruta> (cargas desde archivos revisados, temas 6 y 8).
import { leerArgumentos, type Argumentos } from './comun/argumentos.ts'
import { extraerClimaOpenMeteo } from './clima/open-meteo.ts'
import { cargarClimaHistorico } from './cargas-unicas/clima-historico.ts'
import * as temas2y10 from './temas-2-y-10.ts'
import { extraerAguaOpenMeteo } from './agua/open-meteo.ts'
import { extraerAguaEcostress } from './agua/appeears.ts'
import { cargarAguaHistorica } from './cargas-unicas/agua-historica.ts'
import { extraerTemperaturaPower } from './clima/power.ts'
import { compararTemperatura } from './clima/comparar.ts'
import { cargarTemperaturaHistorica } from './cargas-unicas/temperatura-historica.ts'

const EXTRACTORES: Record<string, (a: Argumentos) => Promise<void>> = {
  // Tema 0 · Distritos (HDX/INEC): correr PRIMERO, una vez. Todos los demás dependen de esta tabla.
  'distritos': async (a) => (await import('./cargas-unicas/distritos.ts')).cargarDistritosHdx(a), // unica-vez.yml
  // Tema 1 · Clima
  'clima': extraerClimaOpenMeteo,          // diario.yml
  'clima-historico': cargarClimaHistorico, // unica-vez.yml
  // Tema 2 · Humedad del suelo (docs/temas-2-y-10.md)
  'humedad-open-meteo': temas2y10.humedadOpenMeteo, // diario.yml
  'humedad-power': temas2y10.humedadPower,          // semanal.yml
  // Tema 4 · Estudio hídrico
  'agua-open-meteo': extraerAguaOpenMeteo,          // diario.yml (después de 'clima'; suma clima_diario, sin APIs)
  'agua-ecostress': extraerAguaEcostress,           // semanal.yml (AppEEARS; necesita EARTHDATA_USERNAME/PASSWORD)
  'agua-historica': cargarAguaHistorica,            // unica-vez.yml
  // Tema 6 · Capacitación del agricultor (docs/capacitacion/README.md). Carga solo sus dependencias al ejecutarse.
  'capacitacion-ina-web': async (a) => (await import('./capacitacion/ina-web.ts')).extraerInaWeb(a), // semanal.yml: página del Núcleo Agropecuario
  'capacitacion-ina': async (a) => (await import('./capacitacion/ina.ts')).extraerIna(a),             // a mano: CSV revisado (otros cursos/instituciones)
  // Tema 7 · Temperatura del sector
  'temperatura-power': extraerTemperaturaPower,     // semanal.yml
  'temperatura-historica': cargarTemperaturaHistorica, // unica-vez.yml
  'temperatura-comparar': compararTemperatura,      // a mano: POWER vs Open-Meteo en distritos de montaña
  'olas-calor': async (a) => (await import('./clima/olas.ts')).extraerOlasCalor(a), // semanal.yml (después de temperatura-power; sin APIs)
  // Tema 8 · Fenómenos naturales (docs/fenomenos-naturales.md)
  'imn-subestacional': async (a) => (await import('./riesgos/imn-subestacional.ts')).extraerImnSubestacional(a), // diario.yml: automático
  'cne': async (a) => (await import('./riesgos/cne.ts')).extraerCNE(a),                     // diario.yml: boletín revisado a mano
  'imn': async (a) => (await import('./riesgos/imn.ts')).extraerIMN(a),                     // diario.yml: avisos revisados a mano
  'amenazas-estimar': async (a) => (await import('./riesgos/estimar-amenazas.ts')).estimarAmenazas(a), // a mano, una vez: escribe datos/riesgos/amenazas.csv (necesita terreno)
  'amenazas': async (a) => (await import('./cargas-unicas/amenazas.ts')).cargarAmenazas(a), // unica-vez.yml
  // Tema 10 · Compatibilidad del sector. Orden: soilgrids → ecocrop, gaez, areas-protegidas, censo → capacidad-uso
  'soilgrids': temas2y10.soilgrids,                 // unica-vez.yml
  'ecocrop': temas2y10.ecocrop,                     // unica-vez.yml (necesita cultivos, tema 5)
  'gaez': temas2y10.gaez,                           // unica-vez.yml (necesita cultivos, tema 5)
  'areas-protegidas': temas2y10.areasProtegidas,    // unica-vez.yml (necesita WDPA_API_TOKEN)
  'censo': temas2y10.censo,                         // en local: CENSO_EXCEL=ruta.xlsx
  'capacidad-uso': temas2y10.capacidadUso,          // unica-vez.yml (al final; necesita pendiente del tema 9)
  // Tema 3 · Precios mayoristas PIMA-CENADA (boletín diario en PDF; necesita Chrome y pdftotext)
  'precios-pima': async (a) => (await import('./precios/pima.ts')).extraerPima(a), // diario.yml (lunes a viernes)
  // Tema 3 · Precios nacionales semanales del CNP (Excel "Lista comparativa": productor, CENADA, Borbón y ferias por región)
  'precios-cnp': async (a) => (await import('./precios/cnp.ts')).extraerCNP(a), // semanal.yml (antes de aptitud)
  // Tema 5 · Catálogo de cultivos y reglas de rotación (cultivos + secuencias). Correr ANTES de ecocrop, gaez y aptitud.
  'cultivos': async (a) => (await import('./cultivos/cargar.ts')).cargarCultivos(a), // unica-vez.yml
  // Tema 9 · Altitud y pendiente por distrito (OpenTopoData). Correr ANTES de capacidad-uso y aptitud.
  'terreno': async (a) => (await import('./cargas-unicas/terreno.ts')).cargarTerreno(a), // unica-vez.yml
  // Resultado · Aptitud distrito × cultivo (sin APIs; cruza clima, suelo, terreno, EcoCrop, GAEZ, amenazas y precios)
  'aptitud': async (a) => (await import('./aptitud/calcular.ts')).calcularAptitud(a), // semanal.yml (al final)
  // Los demás temas agregan su línea aquí.
}

const args = leerArgumentos()
if (!args.nombre || !EXTRACTORES[args.nombre]) {
  console.error(`Uso: npm run extraer -- <nombre> [opciones]\nDisponibles: ${Object.keys(EXTRACTORES).join(', ')}`)
  process.exit(2)
}
// Correccion - Poll: en GitHub Actions el motivo del fallo se muestra en la pagina de la corrida, no solo en el log.
try {
  await EXTRACTORES[args.nombre](args)
} catch (e) {
  const mensaje = (e as Error).message
  console.error(`✘ ${args.nombre}: ${mensaje}`)
  // Formato de anotación de GitHub (::error::): aparece en el resumen de la corrida, que se ve sin iniciar sesión.
  if (process.env.GITHUB_ACTIONS === 'true') {
    const limpio = mensaje.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
    console.log(`::error title=Extractor ${args.nombre}::${limpio}`)
  }
  // exitCode en vez de process.exit(): deja cerrar las conexiones abiertas (en Windows, process.exit
  // con fetch pendientes muestra "Assertion failed" de libuv).
  process.exitCode = 1
}
