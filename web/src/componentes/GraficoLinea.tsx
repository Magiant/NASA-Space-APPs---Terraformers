import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { fecha } from '../utilidades';

interface Punto {
  fecha: string;
  valor: number;
}

/**
 * Gráfico de línea (SVG, sin librerías) para precios y temperatura.
 *
 * Interactivo: al pasar el mouse o arrastrar el dedo, una línea vertical se acomoda al día más cercano
 * (no hace falta atinarle a la línea) y un recuadro muestra el valor y la fecha de ese día.
 * Con el teclado: Tab para entrar, flechas para moverse, Inicio/Fin para los extremos, Esc para salir.
 * Los mismos datos están en una tabla plegable, para quien no puede o no quiere usar el gráfico.
 */
export default function GraficoLinea({ puntos, formato, etiqueta }: { puntos: Punto[]; formato: (n: number) => string; etiqueta: string }) {
  const t = useT();
  const lienzo = useRef<SVGSVGElement>(null);
  const [activo, setActivo] = useState<number | null>(null);
  const n = puntos.length;
  if (n < 2) return null;

  const an = 320;
  const al = 120;
  const m = { izq: 4, der: 4, arr: 12, aba: 10 };
  const valores = puntos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const x = (i: number) => m.izq + (i / (n - 1)) * (an - m.izq - m.der);
  const y = (v: number) => m.arr + (1 - (v - min) / rango) * (al - m.arr - m.aba);
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(n - 1)},${al - m.aba} L${x(0)},${al - m.aba} Z`;
  const ultimo = puntos[n - 1];
  const resumen = `${etiqueta}: ${formato(puntos[0].valor)} → ${formato(ultimo.valor)}`;
  const limitar = (i: number) => Math.max(0, Math.min(n - 1, i));

  /** El día más cercano al puntero (solo importa la posición horizontal). */
  function alPuntero(e: PointerEvent<SVGSVGElement>) {
    const r = lienzo.current!.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * an;
    setActivo(limitar(Math.round(((vx - m.izq) / (an - m.izq - m.der)) * (n - 1))));
  }

  function alTeclado(e: KeyboardEvent) {
    if (e.key === 'Escape') return setActivo(null);
    const actual = activo ?? n - 1;
    const teclas: Record<string, number> = { ArrowLeft: actual - 1, ArrowRight: actual + 1, Home: 0, End: n - 1 };
    const destino = teclas[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    setActivo(limitar(destino));
  }

  // Si cambian los datos (otro producto), el índice puede quedar fuera: se ajusta.
  const sel = activo === null ? null : limitar(activo);
  const p = sel === null ? null : puntos[sel];

  // Recuadro del valor: arriba del punto (abajo si el punto está muy arriba) y sin salirse por los lados.
  let estiloDato: CSSProperties | undefined;
  if (sel !== null && p) {
    const izq = (x(sel) / an) * 100;
    const arr = (y(p.valor) / al) * 100;
    const tx = izq < 18 ? '-10px' : izq > 82 ? 'calc(-100% + 10px)' : '-50%';
    const ty = arr < 38 ? '14px' : 'calc(-100% - 14px)';
    estiloDato = { left: `${izq}%`, top: `${arr}%`, transform: `translate(${tx}, ${ty})` };
  }
  const diaLargo = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T12:00`).toLocaleDateString(t.locale, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <figure className="grafico">
      <div
        className="grafico-lienzo" role="group" tabIndex={0} aria-label={`${resumen}. ${t.grafico.pista}`}
        onKeyDown={alTeclado} onFocus={() => setActivo((a) => a ?? n - 1)} onBlur={() => setActivo(null)}
      >
        <svg
          ref={lienzo} viewBox={`0 0 ${an} ${al}`} aria-hidden
          onPointerDown={alPuntero} onPointerMove={alPuntero}
          // Con mouse, al salir se esconde; con el dedo queda el último día tocado.
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActivo(null)}
        >
          <path d={area} className="grafico-area" />
          <path d={linea} className="grafico-linea" />
          {sel !== null && p ? (
            <>
              <line x1={x(sel)} x2={x(sel)} y1={2} y2={al - m.aba} className="grafico-guia" />
              <circle cx={x(sel)} cy={y(p.valor)} r="4.5" className="grafico-punto grafico-punto-activo" />
            </>
          ) : (
            <circle cx={x(n - 1)} cy={y(ultimo.valor)} r="4" className="grafico-punto" />
          )}
        </svg>
        {p && (
          <div className="grafico-dato" style={estiloDato} aria-live="polite">
            <strong>{formato(p.valor)}</strong>
            <span>{diaLargo(p.fecha)}</span>
          </div>
        )}
      </div>
      <figcaption>
        <span>{fecha(puntos[0].fecha)}</span>
        <span>
          {t.precios.min} {formato(min)} · {t.precios.max} {formato(max)}
        </span>
        <span>{fecha(ultimo.fecha)}</span>
      </figcaption>
      <p className="grafico-pista">{t.grafico.pista}</p>
      <details className="plegable grafico-tabla">
        <summary>{t.grafico.verTabla}</summary>
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr><th>{t.grafico.fecha}</th><th>{etiqueta}</th></tr>
            </thead>
            <tbody>
              {[...puntos].reverse().map((d) => (
                <tr key={d.fecha}><td>{fecha(d.fecha)}</td><td>{formato(d.valor)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
