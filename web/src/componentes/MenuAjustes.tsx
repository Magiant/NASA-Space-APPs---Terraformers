import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { PanelAjustes } from '../paginas/publicas/Ajustes';
import { Icono } from './Iconos';

/**
 * Botón de ajustes en la esquina superior derecha. Abre un panel desplegable pegado a esa esquina
 * (no otra pantalla) con apariencia, idioma y cuenta. Si hay sesión, el botón muestra también la inicial.
 * Se cierra al tocar fuera, con Escape o al cambiar de pantalla.
 */
export default function MenuAjustes() {
  const { t } = usePreferencias();
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        boton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  return (
    <div className="menu-ajustes" ref={caja}>
      <button
        ref={boton}
        type="button"
        className={`boton-ajustes${usuario ? ' con-sesion' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-label={t.ajustes.abrir}
        title={t.ajustes.titulo}
        onClick={() => setAbierto(!abierto)}
      >
        <Icono nombre="ajustes" tam={22} />
        {usuario && <span className="avatar avatar-chico" aria-hidden>{usuario.nombre.charAt(0)}</span>}
      </button>
      {abierto && (
        <div className="panel-ajustes" role="dialog" aria-label={t.ajustes.titulo}>
          <PanelAjustes alNavegar={() => setAbierto(false)} />
        </div>
      )}
    </div>
  );
}
