import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import { useT } from '../../contexto/PreferenciasContext';
import { algolia, catalogo } from '../../servicios/algolia';
import { fecha, useCargar, useZonaElegida } from '../../utilidades';

export default function Alertas() {
  const t = useT();
  const ta = t.alertas;
  const [zona] = useZonaElegida();
  const [soloMiZona, setSoloMiZona] = useState(!!zona);
  const alertas = useCargar(() => algolia.alertas(soloMiZona && zona ? zona : undefined), [soloMiZona, zona]);
  const nombreZona = zona ? catalogo.zona(zona)?.distrito : null;

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{ta.titulo}</h1>
        <p>{ta.subtitulo}</p>
      </header>

      {nombreZona && (
        <div className="interruptor" role="tablist">
          <button role="tab" aria-selected={soloMiZona} onClick={() => setSoloMiZona(true)}>{ta.en(nombreZona)}</button>
          <button role="tab" aria-selected={!soloMiZona} onClick={() => setSoloMiZona(false)}>{ta.todoPais}</button>
        </div>
      )}

      {alertas.cargando && <Cargando />}
      {alertas.error && <ErrorCarga mensaje={alertas.error} reintentar={alertas.recargar} />}
      {alertas.datos?.length === 0 && (
        <Vacio icono="☀️" titulo={ta.noHay}>
          <p>{ta.noHayTexto(soloMiZona)}</p>
        </Vacio>
      )}

      <div className="lista-alertas">
        {alertas.datos?.map((a) => (
          <article key={a.objectID} className={`alerta alerta-${a.nivel}`}>
            <p className="alerta-nivel">
              {ta.nivel[a.nivel]} · {a.fuente} · {a.tipo}
            </p>
            <h2>{a.titulo}</h2>
            <p>{a.descripcion}</p>
            <p className="ayuda">
              {ta.desde} {fecha(a.inicio)}{a.fin ? ` ${ta.hasta} ${fecha(a.fin)}` : ''} ·{' '}
              {a.codigos_distrito.map((c) => catalogo.zona(c)).filter(Boolean).map((z, i) => (
                <span key={z!.codigo_distrito}>
                  {i > 0 && ', '}
                  <Link to={`/zona/${z!.codigo_distrito}`}>{z!.distrito}</Link>
                </span>
              ))}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
