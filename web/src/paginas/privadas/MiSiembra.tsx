import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { catalogo } from '../../servicios/algolia';
import { datos } from '../../servicios/supabase';
import type { Seguimiento } from '../../tipos';
import { fecha, hoy, nombreCultivo, useCargar } from '../../utilidades';
import { FotoCultivo, Tx } from '../../componentes/Iconos';

export default function MiSiembra() {
  const t = useT();
  const ts = t.siembra;
  const { id = '' } = useParams();
  const siembra = useCargar(() => datos.siembra(id), [id]);
  const notas = useCargar(() => datos.seguimiento(id), [id]);
  const [tipo, setTipo] = useState<Seguimiento['tipo']>('riego');
  const [nota, setNota] = useState('');

  if (siembra.cargando) return <Cargando />;
  if (siembra.error || !siembra.datos) return <ErrorCarga mensaje={siembra.error ?? '—'} />;
  const s = siembra.datos;
  const c = catalogo.cultivo(s.cultivo_id);
  const total = (new Date(s.cosecha_esperada).getTime() - new Date(s.fecha_siembra).getTime()) / 864e5;
  const pasados = (new Date(hoy()).getTime() - new Date(s.fecha_siembra).getTime()) / 864e5;
  const avance = Math.max(0, Math.min(100, Math.round((pasados / total) * 100)));

  async function agregar(e: FormEvent) {
    e.preventDefault();
    await datos.agregarSeguimiento({ siembra_id: id, tipo, nota: nota.trim() });
    setNota('');
    notas.recargar();
  }

  return (
    <>
      <header className="cabecera-pagina">
        <h1 className="titulo-con-foto"><span className="icono-cultivo" aria-hidden><FotoCultivo id={s.cultivo_id} prioridad /></span> {nombreCultivo(t, s.cultivo_id, c?.nombre)}</h1>
        <p>{s.area_ha} ha · {ts.sembrado(fecha(s.fecha_siembra))}</p>
      </header>

      <div className="columnas">
        <div className="col-principal">
          {s.estado === 'activa' ? (
            <section className="tarjeta">
              <p>{ts.cosechaEsperada} <strong>{fecha(s.cosecha_esperada)}</strong></p>
              <div className="barra barra-grande" role="progressbar" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100} aria-label={ts.avance}>
                <span style={{ width: `${avance}%` }} className="media" />
              </div>
              <p className="ayuda">{ts.lleva(avance)}</p>
              <div className="acciones">
                <Link to={`/reportar-plaga?siembra=${s.id}`} className="boton boton-secundario"><Tx>{ts.reportar}</Tx></Link>
                <Link to={`/siembras/${s.id}/cerrar`} className="boton"><Tx>{ts.yaCoseche}</Tx></Link>
              </div>
            </section>
          ) : (
            <section className="tarjeta">
              <p><strong>{s.resultado && <Tx>{ts.resultado[s.resultado]}</Tx>}</strong> · {ts.cerradaEl(fecha(s.fecha_cierre))}</p>
              {s.cantidad !== null && <p>{ts.cosecho(s.cantidad, t.cerrar.unidades[s.unidad ?? ''] ?? s.unidad ?? '')}</p>}
              {s.motivo && <p className="ayuda">{s.motivo}</p>}
              <Link to={`/siembras/nueva?finca=${s.finca_id}`} className="boton">{ts.queAhora}</Link>
            </section>
          )}

          {s.estado === 'activa' && (
            <form className="formulario tarjeta" onSubmit={agregar} style={{ marginTop: 16 }}>
              <div className="chips" role="radiogroup" aria-label={ts.tipoNota}>
                {(Object.keys(ts.tipos) as Seguimiento['tipo'][]).map((k) => (
                  <button type="button" key={k} role="radio" aria-checked={tipo === k} className="chip" onClick={() => setTipo(k)}>
                    <Tx>{ts.tipos[k]}</Tx>
                  </button>
                ))}
              </div>
              <label>
                {ts.quePaso}
                <textarea rows={2} required value={nota} onChange={(e) => setNota(e.target.value)} />
              </label>
              <button className="boton">{ts.agregar}</button>
            </form>
          )}
        </div>

        <aside className="col-lateral">
          <h2>{ts.seguimiento}</h2>
          {notas.datos?.length === 0 && <p>{ts.sinNotas}</p>}
          <ol className="linea-tiempo">
            {notas.datos?.map((g) => (
              <li key={g.id}>
                <small>{fecha(g.fecha)} · <Tx>{ts.tipos[g.tipo]}</Tx></small>
                <p>{g.nota}</p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </>
  );
}
