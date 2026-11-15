// Tema 5 · Catálogo de cultivos → tablas `cultivos` y `secuencias`. UNA VEZ (y cada vez que se agregue un cultivo).
//
// No hay una API pública con fichas de cultivos para Costa Rica, así que el catálogo es una tabla revisada por el equipo.
// Los ids son los mismos que usa la web (fotos, textos y precios se unen por `id`).
// Ciclo, agua del ciclo y raíz: fichas técnicas del MAG/INTA y guías de la FAO (Riego y Drenaje 56, tabla 11 y 12).
// Efecto en el suelo (−2 agota … +2 aporta): extracción típica de N, P, K y aporte de rastrojo (materia orgánica).
// Los rangos de temperatura, lluvia y pH de la FAO NO van aquí: los pone el extractor `ecocrop` en `requisitos_cultivo`.
// `local` = temperatura óptima, altitud y meses de siembra de las fichas del MAG/INTA para Costa Rica. EcoCrop da rangos
// mundiales muy amplios (café arábica 14–28 °C), así que `aptitud` usa estos para el óptimo y EcoCrop para los límites.
//
// Las `secuencias` (qué sembrar después de qué) se generan con reglas, no a mano, para que sean coherentes:
//   CUL-01  Mismo cultivo o misma familia → prohibida (comparten plagas y enfermedades del suelo).
//   CUL-02  Comparten una plaga que vive en el suelo o en los rastrojos → prohibida.
//   CUL-03  Leguminosa (aporta N) antes de un cultivo que gasta mucho N → recomendada.
//   CUL-04  Cultivo que gasta N antes de una leguminosa → recomendada (repone el nitrógeno).
//   CUL-05  Raíces a distinta profundidad → recomendada (aprovecha otra capa del suelo).
//   CUL-06  Cultivos permanentes o de más de un año (café, piña) → neutral: no se rotan cada ciclo.
//   El resto → neutral.
import type { Cultivo, Secuencia } from '@terraformes/compartido'

export const FUENTE = 'catalogo-equipo'

/** Datos locales de las fichas del MAG/INTA (los mismos que muestra la web): temperatura óptima (°C), altitud (m) y meses de siembra. */
type Local = { temp: [number, number]; altitud: [number, number]; meses: number[] }
type Fila = Cultivo & { plagas: string[]; permanente?: boolean; local: Local }

const c = (
  id: string, nombre: string, nombre_cientifico: string, familia: string,
  ciclo: [number, number], agua_ciclo_mm: number, profundidad_raiz: Cultivo['profundidad_raiz'],
  [efecto_n, efecto_p, efecto_k, efecto_mo]: [number, number, number, number],
  espera_familia_ciclos: number | null, plagas: string[], local: Local, permanente = false, ecocrop_id: string | null = null,
): Fila => ({
  id, nombre, nombre_cientifico, familia, ciclo_dias_min: ciclo[0], ciclo_dias_max: ciclo[1], agua_ciclo_mm, profundidad_raiz,
  efecto_n, efecto_p, efecto_k, efecto_mo, espera_familia_ciclos, ecocrop_id, plagas, permanente, local,
})

/** `ecocrop_id` solo cuando EcoCrop usa otro nombre científico (EcoPortCode). Plagas: los mismos ids que la web (web/src/datos-ejemplo/publicos.ts y las fotos de web/public/imagenes/plagas/). */
export const CATALOGO: Fila[] = [
  c('papa', 'Papa', 'Solanum tuberosum', 'Solanaceae', [100, 130], 650, 'superficial', [-1, -1, -2, -1], 3, ['tizon-tardio', 'nematodo', 'polilla-papa'], { temp: [12, 20], altitud: [1400, 3000], meses: [4, 5, 9] }),
  c('cebolla', 'Cebolla', 'Allium cepa', 'Amaryllidaceae', [110, 150], 450, 'superficial', [-1, -1, -1, -1], 2, ['trips'], { temp: [13, 24], altitud: [900, 2500], meses: [11, 12, 1] }),
  c('zanahoria', 'Zanahoria', 'Daucus carota', 'Apiaceae', [90, 120], 500, 'media', [-1, -1, -1, -1], 2, ['nematodo'], { temp: [15, 22], altitud: [1200, 2800], meses: [3, 4, 8, 9] }),
  c('repollo', 'Repollo', 'Brassica oleracea', 'Brassicaceae', [80, 110], 480, 'superficial', [-2, -1, -1, -1], 3, ['hernia'], { temp: [14, 22], altitud: [1200, 2800], meses: [5, 6, 10] }),
  c('frijol', 'Frijol', 'Phaseolus vulgaris', 'Fabaceae', [75, 95], 400, 'media', [2, -1, -1, 0], 2, ['mosca-blanca'], { temp: [17, 27], altitud: [100, 1600], meses: [5, 9, 11] }),
  c('maiz', 'Maíz', 'Zea mays', 'Poaceae', [100, 140], 650, 'profunda', [-2, -1, -1, 1], 1, ['gusano-cogollero'], { temp: [18, 30], altitud: [0, 2200], meses: [5, 6, 8] }),
  c('tomate', 'Tomate', 'Solanum lycopersicum', 'Solanaceae', [90, 120], 500, 'media', [-1, -1, -2, -1], 3, ['tizon-tardio', 'mosca-blanca', 'nematodo'], { temp: [18, 27], altitud: [400, 1800], meses: [1, 2, 10, 11] }, false, '1379'), // EcoCrop: Lycopersicon esculentum
  c('chile', 'Chile dulce', 'Capsicum annuum', 'Solanaceae', [100, 140], 600, 'media', [-1, -1, -2, -1], 3, ['mosca-blanca', 'nematodo', 'trips'], { temp: [18, 28], altitud: [300, 1600], meses: [1, 2, 9] }),
  c('cafe', 'Café', 'Coffea arabica', 'Rubiaceae', [1095, 1460], 1800, 'profunda', [-1, -1, -1, 2], null, ['broca'], { temp: [17, 23], altitud: [800, 1700], meses: [5, 6] }, true),
  c('arroz', 'Arroz', 'Oryza sativa', 'Poaceae', [110, 140], 1200, 'superficial', [-2, -1, -1, 1], 1, ['gusano-cogollero'], { temp: [22, 32], altitud: [0, 500], meses: [5, 6] }),
  c('pina', 'Piña', 'Ananas comosus', 'Bromeliaceae', [450, 540], 1200, 'superficial', [-1, 0, -2, -1], 1, [], { temp: [22, 32], altitud: [0, 700], meses: [3, 4, 9] }, true),
  c('yuca', 'Yuca', 'Manihot esculenta', 'Euphorbiaceae', [240, 330], 1000, 'profunda', [-1, 0, -2, -1], 1, [], { temp: [22, 32], altitud: [0, 1000], meses: [4, 5, 10] }),
  c('culantro', 'Culantro', 'Coriandrum sativum', 'Apiaceae', [40, 60], 400, 'superficial', [-1, 0, 0, 0], 1, [], { temp: [15, 25], altitud: [600, 2400], meses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }),
]

/** Plagas que sobreviven en el suelo o en los rastrojos entre un ciclo y otro (las que importan para rotar). */
const PLAGAS_DEL_SUELO = new Set(['nematodo', 'hernia', 'tizon-tardio', 'polilla-papa', 'gusano-cogollero'])

/** Filas para la tabla `cultivos` (sin los campos internos). */
export function filasCultivos(): Cultivo[] {
  return CATALOGO.map(({ plagas: _p, permanente: _q, local: _l, ...f }) => f)
}

const PROFUNDIDAD = { superficial: 0, media: 1, profunda: 2 } as const

/** Regla de rotación de un par (anterior → siguiente). */
export function regla(a: Fila, s: Fila): Pick<Secuencia, 'tipo' | 'motivo'> {
  if (a.id === s.id) return { tipo: 'prohibida', motivo: 'Mismo cultivo: se acumulan sus plagas y gasta los mismos nutrientes.' }
  if (a.familia === s.familia)
    return { tipo: 'prohibida', motivo: `Misma familia (${a.familia}): esperar ${Math.max(a.espera_familia_ciclos ?? 1, 1)} ciclo(s) con otra familia.` }
  const comunes = a.plagas.filter((p) => s.plagas.includes(p) && PLAGAS_DEL_SUELO.has(p))
  if (comunes.length) return { tipo: 'prohibida', motivo: `Comparten plagas que quedan en el suelo: ${comunes.join(', ')}.` }
  if (a.permanente || s.permanente) return { tipo: 'neutral', motivo: 'Cultivo de más de un año: no entra en la rotación de cada ciclo.' }
  if ((a.efecto_n ?? 0) >= 1 && (s.efecto_n ?? 0) <= -2) return { tipo: 'recomendada', motivo: `Aprovecha el nitrógeno que deja ${a.nombre.toLowerCase()}.` }
  if ((a.efecto_n ?? 0) <= -1 && (s.efecto_n ?? 0) >= 1) return { tipo: 'recomendada', motivo: `${s.nombre} devuelve nitrógeno al suelo.` }
  if (a.profundidad_raiz && s.profundidad_raiz && Math.abs(PROFUNDIDAD[a.profundidad_raiz] - PROFUNDIDAD[s.profundidad_raiz]) === 2)
    return { tipo: 'recomendada', motivo: 'Raíces a distinta profundidad: usa otra capa del suelo.' }
  return { tipo: 'neutral', motivo: null }
}

/** Todas las parejas anterior → siguiente del catálogo. */
export function filasSecuencias(): Secuencia[] {
  return CATALOGO.flatMap((a) => CATALOGO.map((s) => ({ cultivo_anterior: a.id, cultivo_siguiente: s.id, ...regla(a, s), fuente: 'reglas-rotacion' })))
}
