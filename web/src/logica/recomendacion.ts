// Recomendación del siguiente cultivo según rotación y plagas (docs/contexto-web.md §7).
// Trabaja sobre los registros de `aptitud` de la zona; cuando exista el cálculo real
// en aptitud/calcular.ts, esto solo ordena y explica lo que ya viene calculado.
// Devuelve razones como códigos; la pantalla las convierte en texto según el idioma.
import { SIGUIENTES } from '../datos-ejemplo/publicos';
import { catalogo } from '../servicios/algolia';
import type { RegistroAptitud } from '../tipos';

export type Razon =
  | { tipo: 'corta'; plaga: string }
  | { tipo: 'rotacion'; cultivo: string }
  | { tipo: 'nitrogeno' }
  | { tipo: 'zona' };

export type Motivo =
  | { tipo: 'plaga'; plaga: string }
  | { tipo: 'familia'; cultivo: string }
  | { tipo: 'comparte'; cultivo: string };

export interface Sugerencia {
  a: RegistroAptitud;
  razones: Razon[];
}

export interface Evitado {
  cultivo: string;
  motivo: Motivo;
}

export function recomendarSiguiente(
  aptitud: RegistroAptitud[],
  { anterior, plagaId }: { anterior?: string | null; plagaId?: string | null } = {},
): { sugerencias: Sugerencia[]; evitados: Evitado[] } {
  const previo = anterior ? catalogo.cultivo(anterior) : undefined;
  const rot = previo ? SIGUIENTES[previo.familia] : undefined;
  const plaga = plagaId ? catalogo.plaga(plagaId) : undefined;
  const plagasPrevio = new Set(previo?.plagas ?? []);

  const evitados: Evitado[] = [];
  const sugerencias: Sugerencia[] = [];

  for (const a of aptitud) {
    if (a.nivel === 'descartado' || a.nivel === 'no_recomendado') continue;
    const c = catalogo.cultivo(a.cultivo_id);
    if (!c) continue;

    if (plaga?.cultivos.includes(c.id)) {
      evitados.push({ cultivo: c.id, motivo: { tipo: 'plaga', plaga: plaga.id } });
      continue;
    }
    if (previo && rot?.evitar.includes(c.id)) {
      evitados.push({ cultivo: c.id, motivo: { tipo: 'familia', cultivo: previo.id } });
      continue;
    }
    if (previo && c.plagas.some((p) => plagasPrevio.has(p))) {
      evitados.push({ cultivo: c.id, motivo: { tipo: 'comparte', cultivo: previo.id } });
      continue;
    }

    const razones: Razon[] = [];
    let extra = 0;
    if (plaga?.cultivos_que_cortan.includes(c.id)) {
      razones.push({ tipo: 'corta', plaga: plaga.id });
      extra += 15;
    }
    if (previo && rot?.recomendados.includes(c.id)) {
      razones.push({ tipo: 'rotacion', cultivo: previo.id });
      extra += 10;
    }
    if (c.familia === 'Fabáceas') razones.push({ tipo: 'nitrogeno' });
    if (a.nivel === 'excelente') razones.push({ tipo: 'zona' });

    sugerencias.push({ a: { ...a, puntaje: Math.min(100, a.puntaje + extra) }, razones });
  }

  sugerencias.sort((x, y) => y.a.puntaje - x.a.puntaje);
  return { sugerencias: sugerencias.slice(0, 4), evitados };
}
