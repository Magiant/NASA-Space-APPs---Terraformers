import type { ReactNode } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { Icono, type NombreIcono } from './Iconos';

/** Íconos de los tres beneficios del panel (mismo orden que t.auth.beneficios). */
const ICONOS_BENEFICIOS: NombreIcono[] = ['finca', 'sembrar', 'plaga'];

/**
 * Marco de las pantallas de cuenta (Entrar y Crear una cuenta). En computadora, dos columnas: a la izquierda para qué
 * sirve la cuenta (con foto del campo) y a la derecha el formulario; en celular el panel queda arriba y más corto.
 * El formulario va en una .tarjeta: en el tema claro conserva letras oscuras aunque la página sea verde.
 */
export default function MarcoCuenta({ idTitulo, children }: { idTitulo: string; children: ReactNode }) {
  const ta = useT().auth;
  return (
    <div className="cuenta">
      <aside className="cuenta-panel">
        <img src="./imagenes/cr-campos.jpg" alt="" aria-hidden />
        <span className="cuenta-marca"><img src="./icono.svg" alt="" width="34" height="34" /> TerraFarm</span>
        <div className="cuenta-presentacion">
          <span className="cuenta-sello"><Icono nombre="check" tam={16} /> {ta.registroSello}</span>
          <h2>{ta.registroPanelTitulo}</h2>
          <p>{ta.registroPanelTexto}</p>
        </div>
        <ul className="cuenta-beneficios">
          {ta.beneficios.map((b, i) => (
            <li key={b.titulo}>
              <span className="cuenta-beneficio-icono" aria-hidden><Icono nombre={ICONOS_BENEFICIOS[i]} tam={22} /></span>
              <strong>{b.titulo}</strong>
              <span>{b.texto}</span>
            </li>
          ))}
        </ul>
        <p className="cuenta-privacidad"><Icono nombre="candado" tam={18} /> <span>{ta.privacidad}</span></p>
      </aside>

      <section className="tarjeta cuenta-formulario" aria-labelledby={idTitulo}>
        {children}
      </section>
    </div>
  );
}
