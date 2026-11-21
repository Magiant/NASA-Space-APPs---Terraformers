// Para qué cultivo sirve cada curso. El INA solo publica el nombre del curso (ninguno trae el cultivo
// enlazado), así que se deduce del título. Lo usa la pantalla de Cursos para el filtro "Lo que siembro".
import type { RegistroCapacitacion } from '../tipos';

const HORTALIZAS = ['tomate', 'chile', 'cebolla', 'zanahoria', 'repollo', 'culantro'];

/** Título del curso → cultivos del catálogo. Varios pueden calzar ("Cultivo de tomate y chile"). */
const CULTIVOS_POR_TITULO: [RegExp, string[]][] = [
  [/caf[eé]/i, ['cafe']],
  [/tomate/i, ['tomate']],
  [/\bchile/i, ['chile']],
  [/hortaliza|vegetales/i, HORTALIZAS],
  [/ra[ií]ces y tub[eé]rculos/i, ['papa', 'yuca']],
  [/\bpapa\b/i, ['papa']], [/\byuca\b/i, ['yuca']], [/cebolla/i, ['cebolla']], [/zanahoria/i, ['zanahoria']], [/repollo/i, ['repollo']],
  [/culantro|hierbas arom[aá]ticas/i, ['culantro']],
  [/frijol/i, ['frijol']], [/\bma[ií]z\b/i, ['maiz']], [/\barroz\b/i, ['arroz']], [/granos b[aá]sicos/i, ['frijol', 'maiz', 'arroz']],
  [/\bpiña\b/i, ['pina']],
  // En Costa Rica el invernadero y la hidroponía se usan sobre todo para tomate, chile dulce y hierbas.
  [/ambiente protegido|hidropon/i, ['tomate', 'chile', 'culantro']],
];

/** Cultivos del catálogo con los que ayuda un curso (vacío si es general o de otra cosa). */
export function cultivosDelCurso(c: Pick<RegistroCapacitacion, 'titulo' | 'cultivo_id'>): string[] {
  const ids = new Set<string>(c.cultivo_id ? [c.cultivo_id] : []);
  for (const [re, cultivos] of CULTIVOS_POR_TITULO) if (re.test(c.titulo)) cultivos.forEach((x) => ids.add(x));
  return [...ids];
}

/**
 * Curso de agricultura que sirve para cualquier cultivo (abonos, plagas, suelos, riego, administración de la finca).
 * No cuentan los de ganadería y forestal, ni los de cultivos que no están en el catálogo (aguacate, cacao…) o de
 * jardinería, hongos y asadas.
 */
export function esParaCualquierCultivo(c: Pick<RegistroCapacitacion, 'titulo' | 'tema' | 'cultivo_id'>): boolean {
  if (!/^(agricultura|gesti[oó]n de la producci[oó]n)/i.test(c.tema)) return false;
  if (cultivosDelCurso(c).length) return false;
  return !/^cultivo de|ornamental|jard[ií]n|orqu[ií]dea|hongos|asadas|henificaci/i.test(c.titulo);
}
