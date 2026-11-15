import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { datos } from '../../servicios/supabase';
import type { ResultadoSiembra } from '../../tipos';
import { nombreCultivo, useCargar } from '../../utilidades';

const OPCIONES: { valor: ResultadoSiembra; icono: string }[] = [
  { valor: 'exitosa', icono: '😀' },
  { valor: 'regular', icono: '😐' },
  { valor: 'perdida', icono: '😞' },
];

export default function CerrarSiembra() {
  const t = useT();
  const tc = t.cerrar;
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const siembra = useCargar(() => datos.siembra(id), [id]);
  const [resultado, setResultado] = useState<ResultadoSiembra | null>(null);
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('sacos');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (siembra.cargando) return <Cargando />;
  if (siembra.error || !siembra.datos) return <ErrorCarga mensaje={siembra.error ?? '—'} />;
  const nombre = nombreCultivo(t, siembra.datos.cultivo_id);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!resultado) return setError(tc.elija);
    try {
      await datos.cerrarSiembra(id, { resultado, cantidad: cantidad ? Number(cantidad) : 0, unidad, motivo: motivo.trim() || null });
      navegar(`/siembras/${id}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <section className="formulario-centrado">
      <h1>{tc.titulo(nombre.toLowerCase())}</h1>
      <p className="ayuda">{tc.ayuda}</p>

      <form className="formulario" onSubmit={enviar}>
        <div className="opciones-cara" role="radiogroup">
          {OPCIONES.map((o) => (
            <button type="button" key={o.valor} role="radio" aria-checked={resultado === o.valor} onClick={() => setResultado(o.valor)}>
              <span aria-hidden>{o.icono}</span>
              {tc.opciones[o.valor]}
            </button>
          ))}
        </div>

        <div className="fila-campos">
          <label>
            {tc.cuanto}
            <input type="number" inputMode="decimal" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>
          <label>
            {tc.unidad}
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {Object.entries(tc.unidades).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        {resultado && resultado !== 'exitosa' && (
          <label>
            {tc.quePaso}
            <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tc.ejemplo} />
          </label>
        )}

        {error && <p className="aviso aviso-error" role="alert">{error}</p>}
        <button className="boton boton-ancho">{tc.guardar}</button>
      </form>
    </section>
  );
}
