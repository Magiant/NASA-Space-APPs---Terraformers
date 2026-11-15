import { Link } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import SelectorUbicacion from '../../componentes/SelectorUbicacion';
import TarjetaCultivo from '../../componentes/TarjetaCultivo';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { algolia, catalogo } from '../../servicios/algolia';
import { useCargar, useZonaElegida } from '../../utilidades';

export default function Inicio() {
  const t = useT();
  const [codigo, setCodigo] = useZonaElegida();
  const { usuario } = useAuth();
  const zona = codigo ? catalogo.zona(codigo) : undefined;
  const aptitud = useCargar(() => (codigo ? algolia.aptitudDeZona(codigo) : Promise.resolve([])), [codigo]);
  const alertas = useCargar(() => (codigo ? algolia.alertas(codigo) : Promise.resolve([])), [codigo]);

  const lista = aptitud.datos ?? [];
  const buenos = lista.filter((a) => a.nivel === 'excelente' || a.nivel === 'bueno');
  const otros = lista.filter((a) => a.nivel === 'no_recomendado' || a.nivel === 'descartado');

  const accesos = [
    { a: '/reportar-plaga', icono: '🐛', texto: t.inicio.reportar, privado: true },
    { a: '/mi-finca', icono: '🏡', texto: t.inicio.fincas, privado: true },
    { a: '/dron', icono: '🛰️', texto: t.inicio.dron, privado: true },
    { a: '/precios', icono: '💰', texto: t.inicio.preciosHoy, privado: false },
  ];

  return (
    <>
      <section className="portada">
        <div className="portada-texto">
          <span className="portada-sello">🌎 NASA Space Apps · Costa Rica</span>
          <h1>{t.inicio.titulo}</h1>
          <p>{t.inicio.subtitulo}</p>
        </div>
        <SelectorUbicacion valor={codigo} alCambiar={setCodigo} conGps />
      </section>

      {zona && (
        <>
          {(alertas.datos ?? []).map((a) => (
            <Link key={a.objectID} to="/alertas" className={`alerta-corta alerta-${a.nivel}`}>
              ⚠️ <strong>{a.titulo}</strong>
            </Link>
          ))}

          <div className="titulo-seccion">
            <h2>
              {t.inicio.mejores(zona.distrito)}
              <small>{zona.canton}, {zona.provincia}</small>
            </h2>
            <Link to={`/zona/${zona.codigo_distrito}`} className="boton boton-secundario boton-pequeno">
              {t.inicio.verZona} →
            </Link>
          </div>
          <AvisoActualizado cuando={zona.actualizado} />

          {aptitud.cargando && <Cargando texto={t.inicio.buscando} />}
          {aptitud.error && <ErrorCarga mensaje={aptitud.error} reintentar={aptitud.recargar} />}

          <div className="lista-tarjetas rejilla-productos">
            {buenos.map((a, i) => <TarjetaCultivo key={a.objectID} a={a} posicion={i + 1} />)}
          </div>
          {!aptitud.cargando && buenos.length === 0 && <p>{t.inicio.ninguno}</p>}

          {otros.length > 0 && (
            <details className="plegable">
              <summary>{t.inicio.noConviene(otros.length)}</summary>
              <div className="lista-tarjetas rejilla-productos">
                {otros.map((a) => <TarjetaCultivo key={a.objectID} a={a} />)}
              </div>
            </details>
          )}
        </>
      )}

      <section>
        <h2>{t.inicio.paraFinca}</h2>
        <div className="accesos">
          {accesos.map((x) => (
            <Link key={x.a} to={x.a} className="acceso">
              <span aria-hidden>{x.icono}</span>
              {x.texto}
              {x.privado && !usuario && <small>{t.comun.pideEntrar}</small>}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
