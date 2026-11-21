// Cuándo se siembra cada cultivo, contado desde hoy. Lo usa la tarjeta de cada cultivo ("Buena época para sembrar").
import { catalogo } from '../servicios/algolia';
import type { RegistroAptitud } from '../tipos';

/** Meses de siembra del cultivo (calendario MAG/INTA del catálogo); si no está ahí, el que trae la aptitud. */
export function mesesDeSiembra(a: Pick<RegistroAptitud, 'cultivo_id' | 'mes_siembra'>): number[] {
  const meses = catalogo.cultivo(a.cultivo_id)?.meses_siembra ?? [];
  return meses.length ? meses : a.mes_siembra ? [a.mes_siembra] : [];
}

/** El próximo mes de siembra y cuántos meses faltan (0 = este mes). Sin calendario: null. */
export function proximaSiembra(meses: number[], hoy = new Date()): { mes: number; faltan: number } | null {
  const actual = hoy.getMonth() + 1;
  let proxima: { mes: number; faltan: number } | null = null;
  for (const mes of meses) {
    const faltan = (mes - actual + 12) % 12;
    if (!proxima || faltan < proxima.faltan) proxima = { mes, faltan };
  }
  return proxima;
}

