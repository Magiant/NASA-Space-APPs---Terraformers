// Cuándo se siembra cada cultivo, contado desde hoy. Lo usan la tarjeta de cada cultivo ("Buena época para
// sembrar") y el interruptor "Para sembrar ahora / Todos los cultivos" de Sembrar y de la ficha del distrito.
import { catalogo } from '../servicios/algolia';
import type { RegistroAptitud } from '../tipos';

/** Meses que cuentan como "ahora": este y los dos siguientes (lo mismo que usa Cursos). */
export const MESES_AHORA = 3;

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

/** Se puede sembrar este mes o en los dos siguientes. */
export function seSiembraAhora(a: Pick<RegistroAptitud, 'cultivo_id' | 'mes_siembra'>, hoy = new Date()): boolean {
  const p = proximaSiembra(mesesDeSiembra(a), hoy);
  return !!p && p.faltan < MESES_AHORA;
}

/**
 * Los cultivos que se dan bien en el distrito, separados en los que se siembran ahora y los de otros meses.
 * Las dos listas siguen ordenadas por puntaje (clima, agua, suelo, riesgos y precio en el mercado); si dos
 * empatan, va primero el que se puede sembrar antes.
 */
export function separarPorTemporada<T extends Pick<RegistroAptitud, 'cultivo_id' | 'mes_siembra' | 'puntaje'>>(buenos: T[], hoy = new Date()) {
  const faltan = (a: T) => proximaSiembra(mesesDeSiembra(a), hoy)?.faltan ?? 12;
  const ahora = buenos.filter((a) => seSiembraAhora(a, hoy)).sort((x, y) => y.puntaje - x.puntaje || faltan(x) - faltan(y));
  const otrosMeses = buenos.filter((a) => !seSiembraAhora(a, hoy));
  return { ahora, otrosMeses };
}
