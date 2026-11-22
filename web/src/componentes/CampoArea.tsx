import { useId, useState, type ReactNode } from 'react';
import { useT } from '../contexto/PreferenciasContext';

/**
 * Área de una finca o de una siembra, en la unidad que la persona use: hectáreas, metros cuadrados o manzanas
 * (en Costa Rica 1 manzana = 6 987 m² = 0,6987 ha). La base guarda siempre hectáreas: `alCambiar` las entrega.
 */
export type UnidadArea = 'ha' | 'm2' | 'mz';
const HA_POR: Record<UnidadArea, number> = { ha: 1, m2: 0.0001, mz: 0.6987 };

/** Hectáreas con hasta 4 decimales (1 m² = 0,0001 ha). */
const redondear = (ha: number) => Math.round(ha * 10000) / 10000;

/** "0,5" / "12" / "0,035": hectáreas como se leen en Costa Rica. */
export function formatoHa(ha: number, locale = 'es-CR'): string {
  return ha.toLocaleString(locale, { maximumFractionDigits: 4 });
}

export default function CampoArea({ etiqueta, alCambiar, ayuda }: {
  etiqueta: string;
  alCambiar: (ha: number | null) => void;
  /** Texto de ayuda debajo (por ejemplo, cuánto mide la finca). */
  ayuda?: ReactNode;
}) {
  const t = useT();
  const tu = t.area;
  const id = useId();
  const [texto, setTexto] = useState('');
  const [unidad, setUnidad] = useState<UnidadArea>('ha');
  const n = Number(texto);
  const ha = texto.trim() && n > 0 ? redondear(n * HA_POR[unidad]) : null;

  const cambiar = (nuevoTexto: string, nuevaUnidad: UnidadArea) => {
    setTexto(nuevoTexto);
    setUnidad(nuevaUnidad);
    const v = Number(nuevoTexto);
    alCambiar(nuevoTexto.trim() && v > 0 ? redondear(v * HA_POR[nuevaUnidad]) : null);
  };

  return (
    <div className="campo-area">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="campo-area-fila">
        <input
          id={id} type="number" inputMode="decimal" min="0.0001" step="any" required
          value={texto} onChange={(e) => cambiar(e.target.value, unidad)}
        />
        <select aria-label={tu.unidad} value={unidad} onChange={(e) => cambiar(texto, e.target.value as UnidadArea)}>
          <option value="ha">{tu.ha}</option>
          <option value="m2">{tu.m2}</option>
          <option value="mz">{tu.mz}</option>
        </select>
      </div>
      {/* En otra unidad, cuánto es en hectáreas (lo que se guarda y lo que usan las recomendaciones). */}
      {unidad !== 'ha' && ha !== null && <small className="ayuda campo-area-equivale">= {formatoHa(ha, t.locale)} ha</small>}
      {ayuda && <small className="ayuda">{ayuda}</small>}
    </div>
  );
}
