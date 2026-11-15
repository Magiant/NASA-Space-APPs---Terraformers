import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { cola } from '../offline/cola';
import { useEnLinea } from '../utilidades';
import { Icono } from './Iconos';
import MenuAjustes from './MenuAjustes';
import { modoReal } from '../servicios/cliente';

/** A dónde lleva "Volver" si no hay pantalla anterior (enlace abierto directo). */
function pantallaPadre(ruta: string): string {
  const siembra = ruta.match(/^\/siembras\/([^/]+)\/cerrar$/);
  if (siembra) return `/siembras/${siembra[1]}`;
  if (/^\/(siembras|fincas|dron)\b/.test(ruta)) return '/mi-finca';
  return '/';
}

function BotonVolver() {
  const { t } = usePreferencias();
  const navegar = useNavigate();
  const { pathname, key } = useLocation();
  // key === 'default' → es la primera pantalla abierta: no hay historial dentro de la app.
  const volver = () => (key === 'default' ? navegar(pantallaPadre(pathname), { replace: true }) : navegar(-1));
  return (
    <button type="button" className="boton-volver" onClick={() => void volver()} aria-label={t.comun.volverAria}>
      <span aria-hidden>←</span> {t.comun.volver}
    </button>
  );
}

export default function Plantilla() {
  const { usuario } = useAuth();
  const { t } = usePreferencias();
  const enLinea = useEnLinea();
  const { pathname } = useLocation();
  // En la app de iPhone cada pestaña es una raíz: ahí no hace falta "Volver".
  const raizNativa = !!document.documentElement.dataset.nativo && ['/precios', '/alertas', '/capacitaciones', '/mi-finca'].includes(pathname);
  const enInicio = pathname === '/' || raizNativa;
  const [enCola, setEnCola] = useState(() => cola.pendientes().length);
  const [aviso, setAviso] = useState<number | null>(null);

  const pestanas = [
    { a: '/', icono: 'sembrar', texto: t.nav.sembrar, fin: true },
    { a: '/precios', icono: 'precios', texto: t.nav.precios },
    { a: '/alertas', icono: 'alertas', texto: t.nav.alertas },
    { a: '/capacitaciones', icono: 'cursos', texto: t.nav.cursos },
    { a: '/mi-finca', icono: 'finca', texto: t.nav.miFinca },
  ] as const;

  // Al cambiar de pantalla, volver arriba.
  // (Con llaves: en Chrome reciente scrollTo devuelve una promesa y un efecto no puede devolverla.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Reportes guardados sin señal: se envían solos al volver la conexión.
  useEffect(() => {
    const actualizar = () => setEnCola(cola.pendientes().length);
    window.addEventListener('tf-cola', actualizar);
    return () => window.removeEventListener('tf-cola', actualizar);
  }, []);

  useEffect(() => {
    if (enLinea && usuario && cola.pendientes().length) {
      cola.enviar().then((n) => n && setAviso(n));
    }
  }, [enLinea, usuario]);

  return (
    <div className="app">
      <header className="encabezado">
        <div className="encabezado-interior">
          <Link to="/" className="marca">
            <img src="./icono.svg" alt="" width="34" height="34" />
            <span>Terraformes</span>
          </Link>

          <nav className="nav-principal" aria-label={t.nav.secciones}>
            {pestanas.map((p) => (
              <NavLink key={p.a} to={p.a} end={'fin' in p}>
                <Icono nombre={p.icono} tam={20} /> {p.texto}
              </NavLink>
            ))}
          </nav>

          <div className="herramientas">
            <span className={`estado-red ${enLinea ? 'estado-red-ok' : 'estado-red-sin'}`} role="status">
              <Icono nombre={enLinea ? 'senal' : 'sinsenal'} tam={18} />
              {enLinea ? (enCola ? t.conexion.porEnviar(enCola) : t.conexion.conSenal) : `${t.conexion.sinSenalCorto}${enCola ? ` · ${enCola}` : ''}`}
            </span>
            {usuario?.rol === 'admin' && (
              <NavLink to="/admin" className="boton boton-pequeno boton-secundario enlace-admin">{t.nav.administracion}</NavLink>
            )}
            {!usuario && <Link to="/ingresar" className="boton boton-pequeno">{t.nav.entrar}</Link>}
            {/* Ajustes y cuenta en un desplegable pegado a la esquina (ya no es otra pantalla). */}
            <MenuAjustes />
          </div>
        </div>
      </header>

      {!enLinea && (
        <p className="banda banda-sin-senal" role="status">
          <Icono nombre="sinsenal" tam={18} /> {t.conexion.sinSenal}{enCola ? ` · ${t.conexion.porEnviar(enCola)}` : ''}.
        </p>
      )}
      {aviso !== null && (
        <p className="banda banda-ok" role="status" onClick={() => setAviso(null)}>
          <Icono nombre="check" tam={18} /> {t.conexion.enviados(aviso)}
        </p>
      )}
      <p className="banda banda-ejemplo">{modoReal ? t.comun.datosReales : t.comun.datosEjemplo}</p>

      <main className="contenido">
        {!enInicio && <BotonVolver />}
        <Outlet />
      </main>

      <footer className="pie">
        <div className="pie-interior">
          <div className="pie-marca">
            <Link to="/" className="marca">
              <img src="./icono.svg" alt="" width="34" height="34" />
              <span>Terraformes</span>
            </Link>
            <p>{t.comun.pieLema}</p>
            <p className="pie-aviso">{t.comun.pieAviso}</p>
          </div>
          <nav className="pie-columna" aria-label={t.comun.pieSecciones}>
            <strong>{t.comun.pieSecciones}</strong>
            {pestanas.map((p) => <Link key={p.a} to={p.a}>{p.texto}</Link>)}
          </nav>
          <div className="pie-columna">
            <strong>{t.comun.pieFuentes}</strong>
            <span>{t.comun.pie.replace(/^[^:]+:\s*/, '')}</span>
          </div>
        </div>
        <div className="pie-final">© 2026 Terraformes · NASA Space Apps Challenge · Costa Rica</div>
      </footer>

      {usuario && !pathname.startsWith('/reportar-plaga') && (
        <Link to="/reportar-plaga" className="boton-flotante">
          <Icono nombre="plaga" tam={22} /> {t.inicio.reportar}
        </Link>
      )}

      <nav className="pestanas" aria-label={t.nav.secciones}>
        {pestanas.map((p) => (
          <NavLink key={p.a} to={p.a} end={'fin' in p}>
            <Icono nombre={p.icono} tam={26} />
            {p.texto}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
