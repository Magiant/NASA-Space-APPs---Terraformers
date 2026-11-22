import { useAvisar, useAvisoSinGuardar, useConfirmar } from '../../componentes/Confirmar';
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
  const confirmar = useConfirmar();
  const avisar = useAvisar();
  useAvisoSinGuardar(!!resultado || !!cantidad || !!motivo.trim());

  if (siembra.cargando) return <Cargando />;
  if (siembra.error || !siembra.datos) return <ErrorCarga mensaje={siembra.error ?? '—'} />;
  const nombre = nombreCultivo(t, siembra.datos.cultivo_id);

  // Correccion - Poll: el resumen decia "1 unidades"; con una sola se usa el singular ("1 unidad", "1 saco").
  // Correccion - Poll: si la siembra se perdio, la cantidad es lo que se perdio ("Perdio 3 sacos"), no lo cosechado.
  // Sin cantidad se guarda vacia (antes se guardaba 0 y se mostraba "Cosecho 0 sacos").
  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!resultado) return void avisar({ titulo: t.avisos.revisarDato, texto: tc.elija, tono: 'error' });
    // Cerrar no tiene vuelta atrás: se confirma mostrando lo que se va a guardar.
    const tcs = t.confirmar.cerrarSiembra;
    const hay = Number(cantidad) > 0;
    const cuanto = hay ? tc.cantidadFue(resultado === 'perdida', `${cantidad} ${(Number(cantidad) === 1 ? tc.unidadesUna : tc.unidades)[unidad] ?? unidad}`) : '';
    const ok = await confirmar({
      titulo: tcs.titulo(nombre.toLowerCase()),
      texto: <><p><strong>{tcs.resumen(tc.opciones[resultado], cuanto)}</strong></p><p>{tcs.texto}</p></>,
      aceptar: tcs.aceptar,
      tono: 'peligro',
      icono: 'check',
    });
    if (!ok) return;
    try {
      await datos.cerrarSiembra(id, { resultado, cantidad: hay ? Number(cantidad) : null, unidad: hay ? unidad : null, motivo: motivo.trim() || null });
      navegar(`/siembras/${id}`, { replace: true });
    } catch (err) {
      avisar({ titulo: t.avisos.noSeGuardo, texto: (err as Error).message, tono: 'error' });
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

        {/* La pregunta aparece al elegir cómo le fue, y cambia con la respuesta (cosechó, alcanzó a cosechar, perdió). */}
        {resultado && (
          <div>
            <div className="fila-campos">
              <label>
                {tc.cuanto[resultado]}
                <input type="number" inputMode="decimal" min="0" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
              </label>
              <label>
                {tc.unidad}
                <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
                  {Object.entries(tc.unidades).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
            <small className="ayuda">{tc.cuantoAyuda[resultado]}</small>
          </div>
        )}

        {resultado && resultado !== 'exitosa' && (
          <label>
            {tc.quePaso}
            <textarea rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={tc.ejemplo} />
          </label>
        )}

        <button className="boton boton-ancho">{tc.guardar}</button>
      </form>
    </section>
  );
}
