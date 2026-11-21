import { useConfirmar } from '../../componentes/Confirmar';
import { Icono, NombreIcono } from '../../componentes/Iconos';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { datos } from '../../servicios/supabase';
import type { ResultadoSiembra } from '../../tipos';
import { nombreCultivo, useCargar } from '../../utilidades';

const OPCIONES: { valor: ResultadoSiembra; icono: NombreIcono }[] = [
  { valor: 'exitosa', icono: 'feliz' },
  { valor: 'regular', icono: 'normal' },
  { valor: 'perdida', icono: 'triste' },
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
  const confirmar = useConfirmar();

  if (siembra.cargando) return <Cargando />;
  if (siembra.error || !siembra.datos) return <ErrorCarga mensaje={siembra.error ?? '—'} />;
  const nombre = nombreCultivo(t, siembra.datos.cultivo_id);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!resultado) return setError(tc.elija);
    // Cerrar no tiene vuelta atrás: se confirma mostrando lo que se va a guardar.
    const tcs = t.confirmar.cerrarSiembra;
    const cuanto = cantidad ? `${cantidad} ${(tc.unidades as Record<string, string>)[unidad] ?? unidad}` : '';
    const ok = await confirmar({
      titulo: tcs.titulo(nombre.toLowerCase()),
      texto: <><p><strong>{tcs.resumen(tc.opciones[resultado], cuanto)}</strong></p><p>{tcs.texto}</p></>,
      aceptar: tcs.aceptar,
      tono: 'peligro',
      icono: 'check',
    });
    if (!ok) return;
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
              <span aria-hidden><Icono nombre={o.icono} tam={36} /></span>
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
            <textarea rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tc.ejemplo} />
          </label>
        )}

        {error && <p className="aviso aviso-error" role="alert">{error}</p>}
        <button className="boton boton-ancho">{tc.guardar}</button>
      </form>
    </section>
  );
}
