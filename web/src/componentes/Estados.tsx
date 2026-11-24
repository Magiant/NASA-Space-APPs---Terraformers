import { Icono } from './Iconos';
import type { ReactNode } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { fecha } from '../utilidades';

export function Cargando({ texto }: { texto?: string }) {
  const t = useT();
  return (
    <div className="esqueleto-cargando" role="status" aria-busy="true">
      <span className="oculto">{texto ?? t.comun.cargando}</span>
      <span className="esqueleto-bloque esqueleto-cargando-titulo" aria-hidden="true" />
      <span className="esqueleto-bloque esqueleto-cargando-linea" aria-hidden="true" />
      <div className="esqueleto-cargando-tarjetas" aria-hidden="true">
        <span className="esqueleto-bloque" />
        <span className="esqueleto-bloque" />
        <span className="esqueleto-bloque" />
      </div>
    </div>
  );
}

/** Esqueleto del inicio mientras termina la carga previa a montar la aplicación. */
export function EsqueletoInicio() {
  const t = useT();
  return (
    <div className="app esqueleto-inicio" role="status" aria-busy="true">
      <span className="oculto">{t.comun.cargando}</span>
      <header className="encabezado" aria-hidden="true">
        <div className="encabezado-interior">
          <div className="marca">
            <img src="./icono.svg" alt="" width="34" height="34" />
            <span>TerraFarm</span>
          </div>
          <div className="esqueleto-nav">
            <span className="esqueleto-bloque" />
            <span className="esqueleto-bloque" />
            <span className="esqueleto-bloque" />
            <span className="esqueleto-bloque" />
          </div>
          <div className="esqueleto-herramientas">
            <span className="esqueleto-bloque" />
            <span className="esqueleto-bloque" />
          </div>
        </div>
      </header>

      <main className="contenido esqueleto-inicio-contenido" aria-hidden="true">
        <section className="esqueleto-portada">
          <span className="esqueleto-bloque esqueleto-sello" />
          <span className="esqueleto-bloque esqueleto-titulo" />
          <span className="esqueleto-bloque esqueleto-texto" />
          <span className="esqueleto-bloque esqueleto-texto esqueleto-texto-corto" />
        </section>
        <div className="esqueleto-modulos">
          {[0, 1, 2, 3, 4].map((n) => (
            <div className={`esqueleto-modulo${n === 0 ? ' esqueleto-modulo-destacado' : ''}`} key={n}>
              <span className="esqueleto-bloque esqueleto-modulo-imagen" />
              <span className="esqueleto-bloque esqueleto-modulo-icono" />
              <span className="esqueleto-bloque esqueleto-modulo-titulo" />
              <span className="esqueleto-bloque esqueleto-modulo-texto" />
            </div>
          ))}
        </div>
        <section className="esqueleto-rapidos">
          <span className="esqueleto-bloque esqueleto-rapidos-titulo" />
          <div>
            <span className="esqueleto-bloque" />
            <span className="esqueleto-bloque" />
          </div>
        </section>
      </main>

      <nav className="esqueleto-pestanas" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((n) => (
          <span key={n}>
            <i className="esqueleto-bloque" />
            <i className="esqueleto-bloque" />
          </span>
        ))}
      </nav>
    </div>
  );
}

// Correccion - Poll: si la pagina no pasaba "reintentar", el error quedaba sin ninguna accion; ahora siempre hay boton
// (si no hay forma de reintentar solo esa parte, recarga la pagina).
export function ErrorCarga({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  const t = useT();
  return (
    <div className="aviso aviso-error" role="alert">
      <p><Icono nombre="alertas" tam={20} /> {mensaje}</p>
      <button className="boton boton-secundario" onClick={reintentar ?? (() => window.location.reload())}>
        {t.comun.reintentar}
      </button>
    </div>
  );
}

/** Sin señal: lo que se ve es la copia guardada en el teléfono, de esta fecha. */
export function AvisoCopia({ cuando }: { cuando: number | null }) {
  const t = useT();
  if (!cuando) return null;
  // Correccion - Poll: la fecha salia con barras ("20/11/2026"); ahora con el mismo formato del resto ("20-11-2026").
  const d = new Date(cuando);
  const texto = `${fecha(d.toLocaleDateString('en-CA'))} ${d.toLocaleTimeString(t.locale, { hour: 'numeric', minute: '2-digit' })}`;
  return (
    <p className="aviso" role="status">
      <Icono nombre="sinsenal" tam={18} /> {t.conexion.copia(texto)}
    </p>
  );
}

export function Vacio({ icono, titulo, children }: { icono: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <section className="vacio">
      <p className="vacio-icono" aria-hidden>{icono}</p>
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}
