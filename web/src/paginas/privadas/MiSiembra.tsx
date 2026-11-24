import { useState, type FormEvent } from 'react';
import { mensajeError } from '../../errores';
import { Link, useParams } from 'react-router-dom';
import { useAvisar, useAvisoSinGuardar } from '../../componentes/Confirmar';
import { AvisoCopia, Cargando, ErrorCarga } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { catalogo } from '../../servicios/algolia';
import { datos } from '../../servicios/supabase';
import type { Seguimiento } from '../../tipos';
import { copiaPrivada, fecha, hoy, nombreCultivo, useCargar } from '../../utilidades';
import { useAuth } from '../../contexto/AuthContext';
import { formatoHa } from '../../componentes/CampoArea';
import { FotoCultivo, Tx } from '../../componentes/Iconos';

// Correccion - Poll: si la siembra no existia la pagina mostraba solo "—"; ahora lo dice y lleva de vuelta a Mi finca.
export function NoEncontrada() {
  const t = useT();
  return (
    <section className="vacio">
      <h1>{t.errores.no_encontrada}</h1>
      <Link to="/mi-finca" className="boton">{t.nav.miFinca}</Link>
    </section>
  );
}

// Correccion - Poll: con una sola unidad cosechada se muestra en singular ("Cosecho 1 saco").
// Correccion - Poll: si la siembra se perdio dice "Perdio 3 sacos" (no "Cosecho"), y sin cantidad no muestra "Cosecho 0".
// Correccion - Poll: el area de la siembra salia en crudo ("0.5 ha"); ahora usa formatoHa ("0,5 ha").
export default function MiSiembra() {
  const t = useT();
  const ts = t.siembra;
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const siembra = useCargar(() => datos.siembra(id), [id], copiaPrivada(usuario?.id, `siembra-${id}`));
  const notas = useCargar(() => datos.seguimiento(id), [id], copiaPrivada(usuario?.id, `notas-${id}`));
  const [tipo, setTipo] = useState<Seguimiento['tipo']>('riego');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const avisar = useAvisar();
  useAvisoSinGuardar(!!nota.trim()); // nota escrita y sin guardar

  if (siembra.cargando) return <Cargando />;
  if (siembra.error) return <ErrorCarga mensaje={siembra.error} reintentar={siembra.recargar} />;
  if (!siembra.datos) return <NoEncontrada />;
  const s = siembra.datos;
  const c = catalogo.cultivo(s.cultivo_id);
  const total = (new Date(s.cosecha_esperada).getTime() - new Date(s.fecha_siembra).getTime()) / 864e5;
  const pasados = (new Date(hoy()).getTime() - new Date(s.fecha_siembra).getTime()) / 864e5;
  const avance = Math.max(0, Math.min(100, Math.round((pasados / total) * 100)));

  // Correccion - Poll: si guardar la nota fallaba (por ejemplo sin senal) no pasaba nada en pantalla, y un doble
  // toque la guardaba dos veces; ahora el boton dice "Guardando…" mientras tanto y un error se explica sin borrar el texto.
  async function agregar(e: FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      await datos.agregarSeguimiento({ siembra_id: id, tipo, nota: nota.trim() });
      setNota('');
      notas.recargar();
    } catch (err) {
      avisar({ titulo: t.avisos.noSeGuardo, texto: `${mensajeError(t, err)} ${ts.notaSigue}`, tono: 'error' });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <header className="cabecera-pagina">
        <h1 className="titulo-con-foto"><span className="icono-cultivo" aria-hidden><FotoCultivo id={s.cultivo_id} prioridad /></span> {nombreCultivo(t, s.cultivo_id, c?.nombre)}</h1>
        <p>{formatoHa(s.area_ha, t.locale)} ha · {ts.sembrado(fecha(s.fecha_siembra))}</p>
      </header>
      <AvisoCopia cuando={siembra.guardadoEl} />

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
              {!!s.cantidad && <p>{t.cerrar.cantidadFue(s.resultado === 'perdida', `${s.cantidad} ${(s.cantidad === 1 ? t.cerrar.unidadesUna : t.cerrar.unidades)[s.unidad ?? ''] ?? s.unidad ?? ''}`)}</p>}
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
                <textarea rows={2} required maxLength={1000} value={nota} onChange={(e) => setNota(e.target.value)} />
              </label>
              <button className="boton" disabled={guardando}>{guardando ? t.comun.guardando : ts.agregar}</button>
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
