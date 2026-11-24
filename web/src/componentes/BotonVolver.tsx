import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useT } from '../contexto/PreferenciasContext';
import { Icono } from './Iconos';

// Correccion - Poll: las subpaginas (una zona, un cultivo, una siembra, cerrar siembra, nueva finca, reportar plaga,
// historial, dron, creditos, ajustes…) no tenian boton de volver: solo se salia con las pestañas de abajo o con el
// boton "atras" del telefono. Ahora la plantilla pone "Volver" arriba de cada subpagina.
//
// Es un enlace a la pagina "de arriba" (por ejemplo, de una siembra a Mi finca). Si la persona llego navegando dentro
// de la app, vuelve a la pantalla anterior; si llego desde afuera (un enlace compartido), va a la de arriba. Al ser un
// enlace, respeta el aviso "¿Salir sin guardar?" de los formularios.

/** Pestañas principales: ahí no hace falta "Volver". */
const PRINCIPALES = ['/', '/sembrar', '/precios', '/alertas', '/capacitaciones', '/mi-finca'];

/** Página "de arriba" de cada subpágina. */
function paginaDeArriba(ruta: string): string {
  if (ruta.startsWith('/zona/') || ruta.startsWith('/cultivo/')) return '/sembrar';
  if (/^\/siembras\/[^/]+\/cerrar$/.test(ruta)) return ruta.replace(/\/cerrar$/, '');
  if (ruta.startsWith('/siembras/') || ruta.startsWith('/fincas/') || ruta.startsWith('/dron')) return '/mi-finca';
  if (ruta === '/historial' || ruta === '/reportar-plaga') return '/mi-finca';
  if (ruta === '/registrarse' || ruta === '/nueva-clave') return '/ingresar';
  return '/';
}

export default function BotonVolver() {
  const t = useT();
  const { pathname, key } = useLocation();
  const navegar = useNavigate();
  if (PRINCIPALES.includes(pathname)) return null;
  const arriba = paginaDeArriba(pathname);

  // "default" es la primera pantalla que se abrió: no hay una anterior dentro de la app.
  const alTocar = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || key === 'default') return; // el aviso de "sin guardar" ya se encargó, o no hay historia
    e.preventDefault();
    navegar(-1);
  };

  return (
    <Link to={arriba} className="boton-volver" onClick={alTocar} aria-label={t.comun.volverAria}>
      <Icono nombre="flecha" tam={20} /> {t.comun.volver}
    </Link>
  );
}
