import { useT } from '../contexto/PreferenciasContext';
import { fecha } from '../utilidades';

interface Punto {
  fecha: string;
  valor: number;
}

/** Gráfico de línea simple (SVG, sin librerías) para precios y temperatura. */
export default function GraficoLinea({ puntos, formato, etiqueta }: { puntos: Punto[]; formato: (n: number) => string; etiqueta: string }) {
  const t = useT();
  if (puntos.length < 2) return null;
  const an = 320;
  const al = 120;
  const m = { izq: 4, der: 4, arr: 10, aba: 10 };
  const valores = puntos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const x = (i: number) => m.izq + (i / (puntos.length - 1)) * (an - m.izq - m.der);
  const y = (v: number) => m.arr + (1 - (v - min) / rango) * (al - m.arr - m.aba);
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(puntos.length - 1)},${al - m.aba} L${x(0)},${al - m.aba} Z`;
  const ultimo = puntos[puntos.length - 1];

  return (
    <figure className="grafico">
      <svg viewBox={`0 0 ${an} ${al}`} role="img" aria-label={`${etiqueta}: ${formato(puntos[0].valor)} → ${formato(ultimo.valor)}`}>
        <path d={area} className="grafico-area" />
        <path d={linea} className="grafico-linea" />
        <circle cx={x(puntos.length - 1)} cy={y(ultimo.valor)} r="4" className="grafico-punto" />
      </svg>
      <figcaption>
        <span>{fecha(puntos[0].fecha)}</span>
        <span>
          {t.precios.min} {formato(min)} · {t.precios.max} {formato(max)}
        </span>
        <span>{fecha(ultimo.fecha)}</span>
      </figcaption>
    </figure>
  );
}
