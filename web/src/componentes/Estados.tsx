import { Icono } from './Iconos';
import type { ReactNode } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { fecha } from '../utilidades';

export function Cargando({ texto }: { texto?: string }) {
  const t = useT();
  return (
    <p className="cargando" role="status">
      <span className="girando" aria-hidden /> {texto ?? t.comun.cargando}
    </p>
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
