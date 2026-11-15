import { Icono } from './Iconos';
import type { ReactNode } from 'react';
import { useT } from '../contexto/PreferenciasContext';

export function Cargando({ texto }: { texto?: string }) {
  const t = useT();
  return (
    <p className="cargando" role="status">
      <span className="girando" aria-hidden /> {texto ?? t.comun.cargando}
    </p>
  );
}

export function ErrorCarga({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  const t = useT();
  return (
    <div className="aviso aviso-error" role="alert">
      <p><Icono nombre="alertas" tam={20} /> {mensaje}</p>
      {reintentar && (
        <button className="boton boton-secundario" onClick={reintentar}>
          {t.comun.reintentar}
        </button>
      )}
    </div>
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
