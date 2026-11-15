import { Link } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono, Tx } from '../../componentes/Iconos';
import SeccionFondo from '../../componentes/SeccionFondo';
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
    { a: '/reportar-plaga', icono: 'plaga', texto: t.inicio.reportar, privado: true },
    { a: '/mi-finca', icono: 'finca', texto: t.inicio.fincas, privado: true },
    { a: '/dron', icono: 'dron', texto: t.inicio.dron, privado: true },
    { a: '/precios', icono: 'precios', texto: t.inicio.preciosHoy, privado: false },
  ] as const;

  return (
    <>
      <section className="portada">
        <img className="portada-foto" src="./imagenes/cr-colinas.jpg" alt="" aria-hidden />
        <div className="portada-texto">
          <span className="portada-sello"><Icono nombre="globo" tam={16} /> NASA Space Apps · Costa Rica</span>
          <h1>{t.inicio.titulo}</h1>
          <p>{t.inicio.subtitulo}</p>
        </div>
        <SelectorUbicacion valor={codigo} alCambiar={setCodigo} conGps />
      </section>

      {zona && (
        <>
          {(alertas.datos ?? []).map((a) => (
            <Link key={a.objectID} to="/alertas" className={`alerta-corta alerta-${a.nivel}`}>
              <Icono nombre="alertas" tam={18} /> <strong>{a.titulo}</strong>
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

      <SeccionFondo foto="satelite" titulo={t.fondos.satelite.titulo} etiquetaCredito={t.fondos.credito}>
        <p>{t.fondos.satelite.texto}</p>
      </SeccionFondo>

      <SeccionFondo foto="dron" titulo={t.fondos.dron.titulo} etiquetaCredito={t.fondos.credito}>
        <p>{t.fondos.dron.texto}</p>
        <Link to="/dron" className="boton">
          <Icono nombre="dron" tam={20} /> {t.fondos.dron.boton}
          {!usuario && <small className="boton-nota"><Tx>{t.comun.pideEntrar}</Tx></small>}
        </Link>
      </SeccionFondo>

      <section>
        <h2>{t.inicio.paraFinca}</h2>
        <div className="accesos">
          {accesos.map((x) => (
            <Link key={x.a} to={x.a} className="acceso">
              <span className="acceso-icono" aria-hidden><Icono nombre={x.icono} tam={28} /></span>
              {x.texto}
              {x.privado && !usuario && <small><Tx>{t.comun.pideEntrar}</Tx></small>}
            </Link>
          ))}
        </div>
      </section>

      <SeccionFondo foto="cafetal" titulo={t.fondos.cafetal.titulo} etiquetaCredito={t.fondos.credito} alto="bajo">
        <p>{t.fondos.cafetal.texto}</p>
      </SeccionFondo>
    </>
  );
}
