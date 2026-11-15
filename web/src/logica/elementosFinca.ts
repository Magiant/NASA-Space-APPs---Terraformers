// Elementos de la finca que no son cultivo (ríos, caminos, agua, bosque, construcciones) y lo que
// significan para cada parcela. Coordenadas en "parcelas": x = columna, y = fila (ver ElementoFinca).
import type { ElementoFinca, TipoElemento } from '../tipos';

type Linea = Extract<ElementoFinca, { tipo: 'rio' | 'quebrada' | 'canal' | 'camino' }>;
type Area = Extract<ElementoFinca, { tipo: 'lago' | 'bosque' | 'invernadero' }>;
type Punto = Extract<ElementoFinca, { en: [number, number] }>;

export const esLinea = (e: ElementoFinca): e is Linea => e.tipo === 'rio' || e.tipo === 'quebrada' || e.tipo === 'canal' || e.tipo === 'camino';
export const esArea = (e: ElementoFinca): e is Area => e.tipo === 'lago' || e.tipo === 'bosque' || e.tipo === 'invernadero';
export const esPunto = (e: ElementoFinca): e is Punto => 'en' in e;

/** Color, grosor (para líneas, en parcelas) y símbolo de cada tipo. El símbolo acompaña siempre al color. */
export const ESTILO: Record<TipoElemento, { color: string; ancho?: number; simbolo: string }> = {
  rio: { color: '#2f7fd1', ancho: 0.34, simbolo: '≈' },
  quebrada: { color: '#4a9be0', ancho: 0.17, simbolo: '≈' },
  canal: { color: '#62b6ea', ancho: 0.11, simbolo: '≈' },
  camino: { color: '#cdb98f', ancho: 0.22, simbolo: '═' },
  lago: { color: '#2f7fd1', simbolo: '≈' },
  bosque: { color: '#1e5130', simbolo: '♣' },
  invernadero: { color: '#c9d8e2', simbolo: '▤' },
  casa: { color: '#b5543a', simbolo: '⌂' },
  bodega: { color: '#7d8590', simbolo: '▣' },
  pozo: { color: '#2f7fd1', simbolo: '◎' },
  tanque: { color: '#62b6ea', simbolo: '◍' },
  naciente: { color: '#1f8fd6', simbolo: '◉' },
};

export const clave = (f: number, c: number) => `${f},${c}`;

/** ¿El punto (x, y) está dentro del polígono? (rayo horizontal) */
export function dentro(poligono: [number, number][], x: number, y: number): boolean {
  let si = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i], [xj, yj] = poligono[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) si = !si;
  }
  return si;
}

/** Distancia (en parcelas) del punto (x, y) a la línea que une los puntos. */
export function distanciaALinea(puntos: [number, number][], x: number, y: number): number {
  let min = Infinity;
  for (let i = 1; i < puntos.length; i++) {
    const [ax, ay] = puntos[i - 1], [bx, by] = puntos[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    min = Math.min(min, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return min;
}

/**
 * Parcelas que no son cultivo: el centro cae en agua, bosque o invernadero, en el cauce de un río,
 * o tiene una casa, bodega o tanque. Esas no cuentan como "parcelas para revisar".
 */
export function usosNoAgricolas(elementos: ElementoFinca[] | undefined, filas: number, columnas: number): Map<string, ElementoFinca> {
  const usos = new Map<string, ElementoFinca>();
  if (!elementos?.length) return usos;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      const x = c + 0.5, y = f + 0.5;
      for (const e of elementos) {
        if (esArea(e) && dentro(e.puntos, x, y)) usos.set(clave(f, c), e);
        else if (e.tipo === 'rio' && distanciaALinea(e.puntos, x, y) < 0.3) usos.set(clave(f, c), e);
      }
    }
  }
  for (const e of elementos) {
    if (esPunto(e) && (e.tipo === 'casa' || e.tipo === 'bodega' || e.tipo === 'tanque')) {
      const f = Math.min(filas - 1, Math.floor(e.en[1])), c = Math.min(columnas - 1, Math.floor(e.en[0]));
      usos.set(clave(f, c), e);
    }
  }
  return usos;
}

/**
 * Parcelas que tocan una zona de protección (Ley Forestal 7575, art. 33): 15 m a cada lado de ríos y
 * quebradas en terreno plano y 50 m si es quebrado (aquí: pendiente media mayor a 40 %), y 100 m
 * alrededor de una naciente. Devuelve los metros de la franja que aplica en cada parcela.
 */
export function zonasProteccion(
  elementos: ElementoFinca[] | undefined, filas: number, columnas: number, ladoM: number, pendientePct: number,
): Map<string, { metros: number; por: 'rio' | 'naciente' }> {
  const zonas = new Map<string, { metros: number; por: 'rio' | 'naciente' }>();
  if (!elementos?.length) return zonas;
  const franjaRio = pendientePct > 40 ? 50 : 15;
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      const x = c + 0.5, y = f + 0.5;
      for (const e of elementos) {
        // La parcela "toca" la franja si su borde más cercano queda dentro de ella.
        if ((e.tipo === 'rio' || e.tipo === 'quebrada') && distanciaALinea(e.puntos, x, y) * ladoM - ladoM / 2 < franjaRio) {
          if (!zonas.has(clave(f, c))) zonas.set(clave(f, c), { metros: franjaRio, por: 'rio' });
        }
        if (e.tipo === 'naciente' && Math.hypot(e.en[0] - x, e.en[1] - y) * ladoM - ladoM / 2 < 100) {
          zonas.set(clave(f, c), { metros: 100, por: 'naciente' });
        }
      }
    }
  }
  return zonas;
}
