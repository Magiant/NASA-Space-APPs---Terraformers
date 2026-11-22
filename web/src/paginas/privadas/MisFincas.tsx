import { Link } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { useAuth } from '../../contexto/AuthContext';
import { usePreferencias } from '../../contexto/PreferenciasContext';
import { catalogo } from '../../servicios/algolia';
import { datos } from '../../servicios/supabase';
import { fecha, nombreCultivo, useCargar, fuentesDeAgua } from '../../utilidades';
import { FotoFranja, Icono, IconoCultivo, Tx } from '../../componentes/Iconos';

export default function MisFincas() {
  const { t } = usePreferencias();
  const tf = t.fincas;
  const { usuario } = useAuth();
  const fincas = useCargar(() => datos.misFincas(), []);
  const siembras = useCargar(() => datos.misSiembras(), []);

  if (fincas.cargando) return <Cargando />;
  if (fincas.error) return <ErrorCarga mensaje={fincas.error} reintentar={fincas.recargar} />;

  const activas = (siembras.datos ?? []).filter((s) => s.estado === 'activa');

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{tf.hola(usuario?.nombre.split(' ')[0] ?? '')}</h1>
        <p>{tf.subtitulo}</p>
      </header>
      <FotoFranja foto="trabajadores" />

      <div className="accesos">
        <Link to="/fincas/nueva" className="acceso"><span className="acceso-icono" aria-hidden><Icono nombre="mas" tam={28} /></span>{tf.nueva}</Link>
        <Link to="/siembras/nueva" className="acceso"><span className="acceso-icono" aria-hidden><Icono nombre="sembrar" tam={28} /></span>{tf.nuevaSiembra}</Link>
        <Link to="/reportar-plaga" className="acceso"><span className="acceso-icono" aria-hidden><Icono nombre="plaga" tam={28} /></span>{tf.reportar}</Link>
        <Link to="/historial" className="acceso"><span className="acceso-icono" aria-hidden><Icono nombre="libro" tam={28} /></span>{tf.historial}</Link>
      </div>

      {fincas.datos!.length === 0 ? (
        <Vacio icono={<Icono nombre="finca" tam={48} />} titulo={tf.sinFincas}>
          <p>{tf.sinFincasTexto}</p>
          <Link to="/fincas/nueva" className="boton">{tf.registrar}</Link>
        </Vacio>
      ) : (
        <div className="lista-tarjetas" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))' }}>
          {fincas.datos!.map((f) => {
            const zona = catalogo.zona(f.codigo_distrito);
            const deLaFinca = activas.filter((s) => s.finca_id === f.id);
            return (
              <section key={f.id} className="tarjeta finca">
                <div className="titulo-seccion">
                  <h2 style={{ margin: '0.2em 0' }}><Icono nombre="finca" tam={24} /> {f.nombre}</h2>
                  <Link to={`/zona/${f.codigo_distrito}`} className="boton boton-pequeno boton-secundario">{tf.verZona}</Link>
                </div>
                <p className="ayuda">
                  {zona ? `${zona.distrito}, ${zona.canton}` : f.codigo_distrito} · {f.area_ha} ha · {tf.agua}: {fuentesDeAgua(f).map((k) => tf.fuenteAgua[k]).join(', ')}
                  {f.riego ? ` · ${tf.conRiego}` : ''}
                </p>

                <h3>{tf.sembradoAhora}</h3>
                {deLaFinca.length === 0 ? (
                  <p>{tf.nada} <Link to={`/siembras/nueva?finca=${f.id}`}>{tf.queSiembro}</Link></p>
                ) : (
                  <ul className="lista-enlaces">
                    {deLaFinca.map((s) => {
                      const c = catalogo.cultivo(s.cultivo_id);
                      return (
                        <li key={s.id}>
                          <Link to={`/siembras/${s.id}`}>
                            <span><IconoCultivo id={s.cultivo_id} /> {nombreCultivo(t, s.cultivo_id, c?.nombre)} · {s.area_ha} ha</span>
                            <small>{tf.cosecha}: {fecha(s.cosecha_esperada)}</small>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="acciones">
                  <Link to={`/siembras/nueva?finca=${f.id}`} className="boton boton-pequeno"><Tx>{tf.sembrarAqui}</Tx></Link>
                  <Link to={`/dron/${f.id}`} className="boton boton-pequeno boton-secundario"><Tx>{tf.dron}</Tx></Link>
                </div>
              </section>
            );
          })}
        </div>
      )}

    </>
  );
}
