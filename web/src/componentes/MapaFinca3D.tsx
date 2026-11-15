import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { dentro, distanciaALinea, esArea, esLinea, esPunto, ESTILO } from '../logica/elementosFinca';
import type { ElementoFinca } from '../tipos';

/**
 * Mapa 3D de la finca, liviano para cualquier celular: un dibujo isométrico en SVG (sin WebGL ni
 * librerías). Cada parcela es una cara del terreno, coloreada por su estado y sombreada según hacia
 * dónde mira (como lo ilumina el sol). Encima van los elementos de la finca: ríos y quebradas (el
 * terreno baja hacia su cauce), canales, caminos, agua, árboles, casas y bodegas.
 *
 * Se gira con los botones o arrastrando de lado (el arrastre vertical deja bajar la página). En fincas
 * grandes se puede acercar: entonces se mueve deslizando, como un mapa. Cada parcela se puede tocar y
 * también elegir con el teclado.
 *
 * Relieve: si el vuelo trae alturas por vértice (`alturas`, en metros) se usan tal cual; si no, se
 * arma uno aproximado con la pendiente media que midió el dron más una ondulación suave y estable
 * (siempre la misma para la misma finca). La pantalla avisa cuál de los dos es.
 */

export interface Parcela3D { color: string; simbolo: string; etiqueta: string; proteccion?: boolean; arboles?: boolean }

interface Props {
  filas: number;
  columnas: number;
  parcela: (f: number, c: number) => Parcela3D;
  nombreFila: (f: number) => string;
  elegida: [number, number] | null;
  alElegir: (f: number, c: number) => void;
  pendientePct: number;
  /** Lado de cada parcela en metros (para que la pendiente se vea en la proporción correcta). */
  ladoM: number;
  /** Alturas medidas en metros, (filas + 1) × (columnas + 1) vértices. */
  alturas?: number[][];
  elementos?: ElementoFinca[];
  semilla: string;
  textos: { girarIzq: string; girarDer: string; centrar: string; arrastrar: string; mapa: string; acercar: string; alejar: string; moverse: string };
}

const EXAGERACION = 2;
const C30 = Math.cos(Math.PI / 6);
const S30 = 0.5;
const BASE = 0.55; // grosor del bloque de tierra, en lados de parcela
const SUELO = '#8a6a46';
const ZOOM = [1, 1.7, 2.6];

function hash(t: string): number {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Alturas aproximadas (en metros) en cada vértice a partir de la pendiente media. Si hay ríos o
 * quebradas, el terreno baja hacia su cauce; los lagos quedan planos (el agua no se inclina).
 */
export function relieveAproximado(filas: number, columnas: number, pendientePct: number, ladoM: number, semilla: string, elementos: ElementoFinca[] = []): number[][] {
  const h = hash(semilla);
  const ang = ((h % 360) * Math.PI) / 180;
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const pend = pendientePct / 100;
  // Lomas y bajos: ondas suaves cuyo tamaño crece con la pendiente (un terreno empinado es más quebrado).
  const amp = Math.max(0.8, pend * ladoM * 1.1);
  const f1 = 0.55 + (h % 7) / 12, f2 = 0.45 + ((h >> 3) % 5) / 10, f3 = 1.1 + ((h >> 5) % 5) / 10;
  const agua = elementos.filter((e) => e.tipo === 'rio' || e.tipo === 'quebrada');
  const z = Array.from({ length: filas + 1 }, (_, i) => Array.from({ length: columnas + 1 }, (_, j) => {
    let v = pend * ladoM * (j * dx + i * dy)
      + amp * Math.sin(j * f1 + (h % 11)) * Math.cos(i * f2 + (h % 13))
      + amp * 0.35 * Math.sin((i + j) * f3 + (h % 17));
    for (const e of agua) {
      if (!esLinea(e)) continue;
      const d = distanciaALinea(e.puntos, j, i);
      const hondo = (e.tipo === 'rio' ? 1.6 : 0.9) * Math.max(amp, 1.2);
      v -= hondo * Math.exp(-((d / (e.tipo === 'rio' ? 1.6 : 1.1)) ** 2));
    }
    return v;
  }));
  for (const e of elementos) {
    if (e.tipo !== 'lago') continue;
    const dentroLago: [number, number][] = [];
    for (let i = 0; i <= filas; i++) for (let j = 0; j <= columnas; j++) if (dentro(e.puntos, j, i)) dentroLago.push([i, j]);
    const nivel = Math.min(...dentroLago.map(([i, j]) => z[i][j]));
    for (const [i, j] of dentroLago) z[i][j] = nivel;
  }
  let min = Infinity;
  for (const fila of z) for (const v of fila) min = Math.min(min, v);
  return z.map((fila) => fila.map((v) => v - min));
}

function aRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const tono = (hex: string, k: number) => `rgb(${aRgb(hex).map((v) => Math.round(Math.min(255, v * k))).join(',')})`;

export default function MapaFinca3D(p: Props) {
  const [angulo, setAngulo] = useState(-35);
  const [zoom, setZoom] = useState(0);
  const lienzo = useRef<HTMLDivElement>(null);
  const animacion = useRef(0);
  const cuadro = useRef(0); // arrastre: a lo sumo un dibujo por cuadro de pantalla
  const arrastre = useRef<{ x: number; a: number; movio: boolean } | null>(null);
  const acercado = zoom > 0;
  const grande = p.filas * p.columnas > 120;

  // Alturas en "lados de parcela", exageradas para que una pendiente suave se alcance a ver.
  const z = useMemo(() => {
    const m = p.alturas ?? relieveAproximado(p.filas, p.columnas, p.pendientePct, p.ladoM, p.semilla, p.elementos);
    return m.map((fila) => fila.map((v) => (v / p.ladoM) * EXAGERACION));
  }, [p.alturas, p.filas, p.columnas, p.pendientePct, p.ladoM, p.semilla, p.elementos]);

  /** Altura del terreno en cualquier punto (interpolando entre las 4 esquinas de la parcela). */
  const alturaEn = (x: number, y: number) => {
    const c = Math.max(0, Math.min(p.columnas - 1e-6, x)), f = Math.max(0, Math.min(p.filas - 1e-6, y));
    const c0 = Math.floor(c), f0 = Math.floor(f), tx = c - c0, ty = f - f0;
    return (z[f0][c0] * (1 - tx) + z[f0][c0 + 1] * tx) * (1 - ty) + (z[f0 + 1][c0] * (1 - tx) + z[f0 + 1][c0 + 1] * tx) * ty;
  };

  const cx = p.columnas / 2, cy = p.filas / 2;
  const rad = (angulo * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  /** Mundo (columna, fila, altura) → pantalla, y profundidad (más grande = más cerca). */
  const proy = (x: number, y: number, h: number) => {
    const xr = (x - cx) * cos - (y - cy) * sin;
    const yr = (x - cx) * sin + (y - cy) * cos;
    return { X: (xr - yr) * C30, Y: (xr + yr) * S30 - h, d: xr + yr };
  };
  const pt = (q: { X: number; Y: number }) => `${q.X.toFixed(2)},${q.Y.toFixed(2)}`;
  /** Profundidad de la parcela donde cae un punto: lo que va encima de ella se dibuja justo después. */
  const profundidadEn = (x: number, y: number) => {
    const c = Math.max(0, Math.min(p.columnas - 1, Math.floor(x))), f = Math.max(0, Math.min(p.filas - 1, Math.floor(y)));
    return proy(c + 0.5, f + 0.5, 0).d;
  };

  // Encuadre fijo para cualquier ángulo (el terreno no "salta" al girar) y ajustado al terreno real.
  const { vbX, vbY, vbW, vbH } = useMemo(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let g = 0; g < 360; g += 5) {
      const c = Math.cos((g * Math.PI) / 180), s = Math.sin((g * Math.PI) / 180);
      for (let i = 0; i <= p.filas; i++) {
        for (let j = 0; j <= p.columnas; j++) {
          const xr = (j - cx) * c - (i - cy) * s, yr = (j - cx) * s + (i - cy) * c;
          const X = (xr - yr) * C30, Y = (xr + yr) * S30;
          x0 = Math.min(x0, X); x1 = Math.max(x1, X);
          y0 = Math.min(y0, Y - z[i][j]); y1 = Math.max(y1, Y + BASE);
        }
      }
    }
    const margen = 0.75, arriba = 1.4; // nombres de filas/columnas, casas y el nombre de la parcela elegida
    return { vbX: x0 - margen, vbY: y0 - arriba, vbW: x1 - x0 + 2 * margen, vbH: y1 - y0 + arriba + margen };
  }, [z, p.filas, p.columnas, cx, cy]);

  // Al acercar o alejar, dejar a la vista el centro (o la parcela elegida).
  useEffect(() => {
    const el = lienzo.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
      el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
    });
  }, [zoom]);

  // Luz del noroeste y desde arriba: las caras que miran hacia ella se ven más claras.
  const luz = (() => { const l = [-0.75, -0.55, 0.75]; const n = Math.hypot(...l); return l.map((v) => v / n); })();

  // ---- Todo lo que se dibuja, ordenado de atrás hacia adelante ----
  const dibujos: { d: number; nodo: ReactNode }[] = [];
  const celdas: { f: number; c: number; esquinas: ReturnType<typeof proy>[]; centro: ReturnType<typeof proy> }[] = [];
  for (let f = 0; f < p.filas; f++) {
    for (let c = 0; c < p.columnas; c++) {
      const a = z[f][c], b = z[f][c + 1], d2 = z[f + 1][c + 1], e = z[f + 1][c];
      // Inclinación de la cara → normal → sombreado.
      const subeX = (b - a + d2 - e) / 2, subeY = (e - a + d2 - b) / 2;
      const nn = Math.hypot(subeX, subeY, 1);
      const brillo = 0.58 + 0.6 * Math.max(0, (-subeX * luz[0] - subeY * luz[1] + luz[2]) / nn);
      const esquinas = [proy(c, f, a), proy(c + 1, f, b), proy(c + 1, f + 1, d2), proy(c, f + 1, e)];
      const centro = proy(c + 0.5, f + 0.5, (a + b + d2 + e) / 4);
      celdas.push({ f, c, esquinas, centro });
      const info = p.parcela(f, c);
      const activa = p.elegida?.[0] === f && p.elegida?.[1] === c;
      dibujos.push({
        d: centro.d,
        nodo: (
          <g
            key={`${f}-${c}`}
            className={`mapa3d-celda${activa ? ' activa' : ''}${info.proteccion ? ' proteccion' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={info.etiqueta}
            aria-pressed={activa}
            onClick={() => elegir(f, c)}
            onKeyDown={(ev) => teclado(ev, f, c)}
          >
            <polygon points={esquinas.map(pt).join(' ')} fill={tono(info.color, brillo)} />
            {info.arboles && [[0.3, 0.35], [0.7, 0.6]].map(([ox, oy], k) => {
              const q = proy(c + ox, f + oy, alturaEn(c + ox, f + oy));
              return (
                <g key={k} className="mapa3d-arbol" aria-hidden>
                  <line x1={q.X} y1={q.Y} x2={q.X} y2={q.Y - 0.22} />
                  <circle cx={q.X} cy={q.Y - 0.32} r={0.17} />
                </g>
              );
            })}
            {info.simbolo && !info.arboles && (
              <text x={centro.X} y={centro.Y} className="mapa3d-simbolo" style={{ fontSize: 0.42 }}>{info.simbolo}</text>
            )}
          </g>
        ),
      });
    }
  }

  // Líneas (ríos, quebradas, canales, caminos): tramos cortos pegados al terreno.
  for (const [n, e] of (p.elementos ?? []).entries()) {
    if (!esLinea(e)) continue;
    const est = ESTILO[e.tipo];
    for (let k = 1; k < e.puntos.length; k++) {
      const [ax, ay] = e.puntos[k - 1], [bx, by] = e.puntos[k];
      const pasos = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.3));
      for (let s = 0; s < pasos; s++) {
        const x1 = ax + ((bx - ax) * s) / pasos, y1 = ay + ((by - ay) * s) / pasos;
        const x2 = ax + ((bx - ax) * (s + 1)) / pasos, y2 = ay + ((by - ay) * (s + 1)) / pasos;
        const q1 = proy(x1, y1, alturaEn(x1, y1) + 0.02), q2 = proy(x2, y2, alturaEn(x2, y2) + 0.02);
        dibujos.push({
          d: profundidadEn((x1 + x2) / 2, (y1 + y2) / 2) + 0.01,
          nodo: <line key={`l${n}-${k}-${s}`} className={`mapa3d-linea linea-${e.tipo}`} x1={q1.X} y1={q1.Y} x2={q2.X} y2={q2.Y} stroke={est.color} strokeWidth={est.ancho} />,
        });
      }
    }
  }

  // Áreas: el agua y el invernadero se dibujan como una sola forma encima de sus parcelas.
  for (const [n, e] of (p.elementos ?? []).entries()) {
    if (!esArea(e) || e.tipo === 'bosque') continue;
    const cxA = e.puntos.reduce((s, q) => s + q[0], 0) / e.puntos.length, cyA = e.puntos.reduce((s, q) => s + q[1], 0) / e.puntos.length;
    const nivel = e.tipo === 'lago' ? Math.min(...e.puntos.map(([x, y]) => alturaEn(x, y))) : null;
    const contorno = e.puntos.map(([x, y]) => proy(x, y, (nivel ?? alturaEn(x, y)) + (e.tipo === 'invernadero' ? 0.18 : 0.02)));
    dibujos.push({
      d: profundidadEn(cxA, cyA) + 0.015,
      nodo: <polygon key={`a${n}`} className={`mapa3d-area area-${e.tipo}`} points={contorno.map(pt).join(' ')} fill={ESTILO[e.tipo].color} aria-hidden />,
    });
  }

  // Puntos: casas, bodegas, pozos, tanques y nacientes, de pie sobre el terreno.
  for (const [n, e] of (p.elementos ?? []).entries()) {
    if (!esPunto(e)) continue;
    const [x, y] = e.en;
    const q = proy(x, y, alturaEn(x, y));
    const color = ESTILO[e.tipo].color;
    const s = 0.34;
    const nodo = e.tipo === 'casa' || e.tipo === 'bodega' ? (
      <g key={`p${n}`} className="mapa3d-punto" aria-hidden>
        <rect x={q.X - s} y={q.Y - s * 1.3} width={s * 2} height={s * 1.3} fill={tono(color, 1)} />
        <polygon points={`${q.X - s * 1.25},${q.Y - s * 1.25} ${q.X},${q.Y - s * 2.3} ${q.X + s * 1.25},${q.Y - s * 1.25}`} fill={e.tipo === 'casa' ? '#7a2f1f' : '#4b5159'} />
      </g>
    ) : (
      <g key={`p${n}`} className="mapa3d-punto" aria-hidden>
        <line x1={q.X} y1={q.Y} x2={q.X} y2={q.Y - 0.45} />
        <circle cx={q.X} cy={q.Y - 0.6} r={0.2} fill={color} />
      </g>
    );
    dibujos.push({ d: profundidadEn(x, y) + 0.02, nodo });
  }
  dibujos.sort((m, n) => m.d - n.d);

  // Paredes de tierra solo en los bordes que miran hacia quien ve.
  const paredes: { puntos: string; d: number; k: number }[] = [];
  const borde = (x1: number, y1: number, h1: number, x2: number, y2: number, h2: number, nx: number, ny: number) => {
    const nxr = nx * cos - ny * sin, nyr = nx * sin + ny * cos;
    if (nxr + nyr <= 0) return;
    const p1 = proy(x1, y1, h1), p2 = proy(x2, y2, h2), p3 = proy(x2, y2, -BASE), p4 = proy(x1, y1, -BASE);
    paredes.push({ puntos: [p1, p2, p3, p4].map(pt).join(' '), d: (p1.d + p2.d) / 2, k: nxr > nyr ? 0.78 : 0.62 });
  };
  for (let c = 0; c < p.columnas; c++) {
    borde(c, 0, z[0][c], c + 1, 0, z[0][c + 1], 0, -1);
    borde(c, p.filas, z[p.filas][c], c + 1, p.filas, z[p.filas][c + 1], 0, 1);
  }
  for (let f = 0; f < p.filas; f++) {
    borde(0, f, z[f][0], 0, f + 1, z[f + 1][0], -1, 0);
    borde(p.columnas, f, z[f][p.columnas], p.columnas, f + 1, z[f + 1][p.columnas], 1, 0);
  }
  paredes.sort((m, n) => m.d - n.d);

  // Nombres de filas (A, B…) y columnas (1, 2…); en fincas grandes, uno sí y otro no (o cada 4).
  const pasoC = p.columnas > 20 ? 4 : p.columnas > 12 ? 2 : 1;
  const pasoF = p.filas > 20 ? 4 : p.filas > 12 ? 2 : 1;
  const ejes = [
    ...Array.from({ length: p.filas }, (_, f) => f).filter((f) => f % pasoF === 0).map((f) => ({ t: p.nombreFila(f), q: proy(-0.55, f + 0.5, z[f][0]) })),
    ...Array.from({ length: p.columnas }, (_, c) => c).filter((c) => c % pasoC === 0).map((c) => ({ t: String(c + 1), q: proy(c + 0.5, -0.55, z[0][c]) })),
  ];

  function girar(delta: number) {
    cancelAnimationFrame(animacion.current);
    const desde = angulo, hasta = angulo + delta;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return setAngulo(hasta);
    const t0 = performance.now();
    const paso = (t: number) => {
      const k = Math.min(1, (t - t0) / 320);
      setAngulo(desde + (hasta - desde) * (1 - (1 - k) ** 3));
      if (k < 1) animacion.current = requestAnimationFrame(paso);
    };
    animacion.current = requestAnimationFrame(paso);
  }

  // Arrastrar de lado gira el mapa (solo sin acercar: acercado, el dedo mueve el mapa).
  const alBajar = (e: PointerEvent<SVGSVGElement>) => { if (!acercado) arrastre.current = { x: e.clientX, a: angulo, movio: false }; };
  const alMover = (e: PointerEvent<SVGSVGElement>) => {
    const r = arrastre.current;
    if (!r) return;
    const dx = e.clientX - r.x;
    if (Math.abs(dx) > 6) {
      if (!r.movio) e.currentTarget.setPointerCapture(e.pointerId);
      r.movio = true;
    }
    if (r.movio) {
      cancelAnimationFrame(cuadro.current);
      cuadro.current = requestAnimationFrame(() => setAngulo(r.a + dx * 0.45));
    }
  };
  const alSoltar = () => { setTimeout(() => { arrastre.current = null; }, 0); };
  function elegir(f: number, c: number) { if (!arrastre.current?.movio) p.alElegir(f, c); }
  function teclado(e: KeyboardEvent, f: number, c: number) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.alElegir(f, c); }
  }

  const sel = p.elegida ? celdas.find((x) => x.f === p.elegida![0] && x.c === p.elegida![1]) : undefined;

  return (
    <div className="mapa3d">
      <div ref={lienzo} className={`mapa3d-lienzo${acercado ? ' acercado' : ''}`}>
        <svg
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          role="group"
          aria-label={p.textos.mapa}
          style={acercado ? { width: `${ZOOM[zoom] * 100}%` } : undefined}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        >
          {paredes.map((w, i) => <polygon key={`w${i}`} points={w.puntos} fill={tono(SUELO, w.k)} />)}
          {dibujos.map((x) => x.nodo)}
          {ejes.map((e) => (
            <text key={`e${e.t}`} x={e.q.X} y={e.q.Y} className="mapa3d-eje" style={{ fontSize: 0.4 }}>{e.t}</text>
          ))}
          {sel && (
            <g className="mapa3d-marca" aria-hidden>
              <polygon points={sel.esquinas.map(pt).join(' ')} />
              <text x={sel.centro.X} y={sel.centro.Y - 0.75} style={{ fontSize: 0.5 }}>{p.nombreFila(sel.f)}{sel.c + 1}</text>
            </g>
          )}
        </svg>
      </div>
      <div className="mapa3d-controles">
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => girar(-45)} aria-label={p.textos.girarIzq}>↺</button>
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => girar(-35 - angulo)}>{p.textos.centrar}</button>
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => girar(45)} aria-label={p.textos.girarDer}>↻</button>
        {grande && (
          <>
            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setZoom((v) => Math.max(0, v - 1))} disabled={zoom === 0} aria-label={p.textos.alejar}>−</button>
            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setZoom((v) => Math.min(ZOOM.length - 1, v + 1))} disabled={zoom === ZOOM.length - 1} aria-label={p.textos.acercar}>+</button>
          </>
        )}
        <span className="mapa3d-ayuda">{acercado ? p.textos.moverse : p.textos.arrastrar}</span>
      </div>
    </div>
  );
}
