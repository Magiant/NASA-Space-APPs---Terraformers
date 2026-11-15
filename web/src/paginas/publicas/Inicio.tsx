import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { Cargando, ErrorCarga } from '../../componentes/Estados';
import { Icono, Tx } from '../../componentes/Iconos';
import SeccionFondo from '../../componentes/SeccionFondo';
import MapaUbicacion from '../../componentes/MapaUbicacion';
import SelectorUbicacion, { useSeleccionUbicacion } from '../../componentes/SelectorUbicacion';
import TarjetaCultivo from '../../componentes/TarjetaCultivo';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { algolia, catalogo } from '../../servicios/algolia';
import { useCargar, useZonaElegida } from '../../utilidades';

export default function Inicio() {
  const t = useT();
  const [codigo, setCodigo] = useZonaElegida();
  const { usuario } = useAuth();
  const zona = codigo ? catalogo.zona(codigo) : undefined; // datos de ejemplo (solo algunos distritos)

  // Mapa y lista comparten la misma selección. Al elegir un distrito, la página baja sola al
  // resultado y el foco pasa al título (en celular el resultado queda fuera de la pantalla).
  const desplazar = useRef(false);
  const elegir = (c: string | null) => {
    if (c) desplazar.current = true;
    setCodigo(c);
  };
  const sel = useSeleccionUbicacion(codigo, elegir);
  const lugar = sel.lista.find((u) => u.codigo_distrito === codigo) ?? zona;
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!desplazar.current || !lugar) return;
    desplazar.current = false;
    const suave = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // Primero se ve el acercamiento del mapa al distrito (450 ms) y luego baja al resultado.
    const reloj = setTimeout(() => {
      titulo.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' });
      titulo.current?.focus({ preventScroll: true });
    }, suave ? 900 : 0);
    return () => clearTimeout(reloj);
  }, [codigo, lugar]);
  const aptitud = useCargar(() => (codigo ? algolia.aptitudDeZona(codigo) : Promise.resolve([])), [codigo]);
  const alertas = useCargar(() => (codigo ? algolia.alertas(codigo) : Promise.resolve([])), [codigo]);

  const lista = aptitud.datos ?? [];
  const buenos = lista.filter((a) => a.nivel === 'excelente' || a.nivel === 'bueno');
  const otros = lista.filter((a) => a.nivel === 'no_recomendado' || a.nivel === 'descartado');

  const accesos = [
    { a: '/reportar-plaga', icono: 'plaga', texto: t.inicio.reportar, privado: true, foto: 'cultivos/tomate.jpg' },
    { a: '/mi-finca', icono: 'finca', texto: t.inicio.fincas, privado: true, foto: 'trabajadores.jpg' },
    { a: '/dron', icono: 'dron', texto: t.inicio.dron, privado: true, foto: 'fondos/dron.jpg' },
    { a: '/precios', icono: 'precios', texto: t.inicio.preciosHoy, privado: false, foto: 'mercado.jpg' },
  ] as const;

  return (
    <>
      <section className="portada con-mapa">
        <img className="portada-foto" src="./imagenes/cr-colinas.jpg" alt="" aria-hidden />
        <div className="portada-texto">
          <span className="portada-sello"><Icono nombre="globo" tam={16} /> NASA Space Apps · Costa Rica</span>
          <h1>{t.inicio.titulo}</h1>
          <p>{t.inicio.subtitulo}</p>
        </div>
        <MapaUbicacion s={sel} />
        <SelectorUbicacion valor={codigo} alCambiar={elegir} seleccion={sel} conGps conMapa />
      </section>

      {codigo && lugar && (
        <section className="escenario">
          <div className="escenario-fondo" aria-hidden>
            <img className="escenario-foto" src="./imagenes/cr-campos.jpg" alt="" loading="lazy" />
          </div>
          {(alertas.datos ?? []).map((a) => (
            <Link key={a.objectID} to="/alertas" className={`alerta-corta alerta-${a.nivel}`}>
              <Icono nombre="alertas" tam={18} /> <strong>{a.titulo}</strong>
            </Link>
          ))}

          <div className="titulo-seccion">
            <h2 ref={titulo} tabIndex={-1} className="titulo-resultado">
              {t.inicio.mejores(lugar.distrito)}
              <small>{lugar.canton}, {lugar.provincia}</small>
            </h2>
            {zona && (
              <Link to={`/zona/${codigo}`} className="boton boton-secundario boton-pequeno">
                {t.inicio.verZona} →
              </Link>
            )}
          </div>
          {zona ? <AvisoActualizado cuando={zona.actualizado} /> : <p className="aviso">{t.inicio.sinDatos(lugar.distrito)}</p>}

          {aptitud.cargando && <Cargando texto={t.inicio.buscando} />}
          {aptitud.error && <ErrorCarga mensaje={aptitud.error} reintentar={aptitud.recargar} />}

          <div className="lista-tarjetas rejilla-productos">
            {buenos.map((a, i) => <TarjetaCultivo key={a.objectID} a={a} posicion={i + 1} />)}
            {buenos.length > 0 && (
              <Link to={`/zona/${codigo}`} className="tarjeta tarjeta-cta">
                <img src="./imagenes/fondos/satelite.jpg" alt="" aria-hidden loading="lazy" />
                <span className="tarjeta-cta-texto">
                  <Icono nombre="mapa" tam={28} />
                  <strong>{t.inicio.cta.titulo(lugar.distrito)}</strong>
                  <span>{t.inicio.cta.texto}</span>
                  <span className="tarjeta-cta-boton">{t.inicio.verZona} →</span>
                </span>
              </Link>
            )}
          </div>
          {zona && !aptitud.cargando && buenos.length === 0 && <p>{t.inicio.ninguno}</p>}

          {otros.length > 0 && (
            <details className="plegable">
              <summary>{t.inicio.noConviene(otros.length)}</summary>
              <div className="lista-tarjetas rejilla-productos">
                {otros.map((a) => <TarjetaCultivo key={a.objectID} a={a} />)}
              </div>
            </details>
          )}
        </section>
      )}

      <SeccionFondo foto="satelite" titulo={t.fondos.satelite.titulo} etiquetaCredito={t.fondos.credito}>
        <p>{t.fondos.satelite.texto}</p>
        <ul className="cifras">
          {t.fondos.satelite.cifras.map((c) => (
            <li key={c.texto}><strong>{c.numero}</strong> {c.texto}</li>
          ))}
        </ul>
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
            <Link key={x.a} to={x.a} className="acceso acceso-con-foto">
              <img className="acceso-foto" src={`./imagenes/${x.foto}`} alt="" aria-hidden loading="lazy" />
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
