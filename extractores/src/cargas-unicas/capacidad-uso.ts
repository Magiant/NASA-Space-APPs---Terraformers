// Tema 10 · Capacidad de uso de la tierra (Decreto 41960-MAG-MINAE) → tabla `terreno_zona`, solo `capacidad_uso_clase`. UNA VEZ.
// Usa la pendiente que guarda el tema 9 (terreno_zona.pendiente_pct) y el suelo de SoilGrids (suelos_zona).
// Clase final = la PEOR clase entre los factores evaluados (Decreto, art. 1, secciones 4 y 6, ejemplo práctico).
// Es INDICATIVA: el decreto evalúa 14 limitantes y aquí solo hay datos para 3 (regla CU-01).
import type { SueloZona, TerrenoZona } from '../../../packages/compartido/src/esquemas/datos.ts'

export const TABLA = 'terreno_zona'
export const FUENTE = 'decreto-41960'
/** terreno_zona es compartida con el tema 9: enviar solo estas columnas. */
export const COLUMNAS = ['codigo_distrito', 'capacidad_uso_clase'] as const

/** Pendiente (e1). Decreto 41960, sección 5.1.1.1 y Cuadro 1 (pág. 9–10). La clase V no tiene rango de pendiente. */
export function clasePorPendiente(pct: number): number {
  if (pct <= 3) return 1 // plana o casi plana 0–3 %
  if (pct <= 8) return 2 // ligeramente ondulada 4–8 %
  if (pct <= 15) return 3 // moderadamente ondulada 9–15 %
  if (pct <= 30) return 4 // ondulada 16–30 %
  if (pct <= 55) return 6 // fuertemente ondulada 31–55 %
  if (pct <= 75) return 7 // escarpada 56–75 %
  return 8 // fuertemente escarpada > 75 %
}

/** Categoría de textura del decreto (sección 5.2.2.1) a partir de la clase USDA de suelos_zona. */
export function categoriaTextura(textura: string, arcillaPct: number | null): 'gruesa' | 'moderadamente gruesa' | 'media' | 'moderadamente fina' | 'fina' | 'muy fina' | null {
  switch (textura) {
    case 'arenosa': case 'arenosa franca': return 'gruesa'
    case 'franco arenosa': return 'moderadamente gruesa'
    case 'franca': case 'franco limosa': case 'limosa': return 'media'
    case 'franco arcillosa': case 'franco arcillo limosa': case 'franco arcillo arenosa': return 'moderadamente fina'
    case 'arcillo arenosa': case 'arcillo limosa': return 'fina'
    case 'arcillosa': return arcillaPct !== null && arcillaPct > 60 ? 'muy fina' : 'fina'
    default: return null
  }
}

/** Textura superficial 0–30 cm (s2). Cuadro 1: I medias · II mod. finas o mod. gruesas · III finas o muy finas · V gruesas. */
export function clasePorTextura(cat: NonNullable<ReturnType<typeof categoriaTextura>>): number {
  return { media: 1, 'moderadamente fina': 2, 'moderadamente gruesa': 2, fina: 3, 'muy fina': 3, gruesa: 5 }[cat]
}

/**
 * Fertilidad (s4). Sección 5.2.4.1 usa suma de bases, acidez, pH y saturación de acidez; SoilGrids solo da pH,
 * así que se usa SOLO el criterio de pH (regla CU-02): alta > 6,5 · media > 5,5–6,5 · baja 4,5–5,5 · muy baja < 4,5.
 * Cuadro 1: alta I · media II · baja IV · muy baja VI. Solo se aplica con pendiente < 55 % (sección 5.2.4).
 */
export function clasePorFertilidadPh(ph: number): number {
  if (ph > 6.5) return 1
  if (ph > 5.5) return 2
  if (ph >= 4.5) return 4
  return 6
}

/** Clase I–VIII (1–8). Sin pendiente no se clasifica (null): es el factor que más pesa y no hay otro dato que lo supla. */
export function claseIndicativa(pendientePct: number | null, suelo: Pick<SueloZona, 'textura' | 'arcilla_pct' | 'ph'> | undefined): number | null {
  if (pendientePct === null) return null
  const clases = [clasePorPendiente(pendientePct)]
  const cat = suelo?.textura ? categoriaTextura(suelo.textura, suelo.arcilla_pct) : null
  if (cat) clases.push(clasePorTextura(cat))
  if (suelo?.ph != null && pendientePct < 55) clases.push(clasePorFertilidadPh(suelo.ph))
  return Math.max(...clases)
}

/** Recibe lo ya guardado por el tema 9 (pendiente) y por soilgrids.ts (suelo). */
export function calcularCapacidadUso(
  terreno: Array<Pick<TerrenoZona, 'codigo_distrito' | 'pendiente_pct'>>,
  suelos: SueloZona[],
): Array<Pick<TerrenoZona, 'codigo_distrito' | 'capacidad_uso_clase'>> {
  const porDistrito = new Map(suelos.map((s) => [s.codigo_distrito, s]))
  return terreno.map((t) => ({
    codigo_distrito: t.codigo_distrito,
    capacidad_uso_clase: claseIndicativa(t.pendiente_pct, porDistrito.get(t.codigo_distrito)),
  }))
}
