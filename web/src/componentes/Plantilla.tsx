import { useEffect, useRef, useState } from 'react';
import type { Idioma } from '../idiomas';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { cola } from '../offline/cola';
import { useEnLinea } from '../utilidades';
import { BanderaCostaRica, BanderaEstadosUnidos } from './Iconos';

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

const OPCIONES_IDIOMA: { valor: Idioma; nombre: string; Bandera: () => JSX.Element }[] = [
  { valor: 'es', nombre: 'Español', Bandera: BanderaCostaRica },
  { valor: 'en', nombre: 'English', Bandera: BanderaEstadosUnidos },
];

/** Botón "Idioma ▾" que despliega la lista de idiomas. */
function MenuIdioma({ actual, etiqueta, ayuda, alElegir }: { actual: Idioma; etiqueta: string; ayuda: string; alElegir: (i: Idioma) => void }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Cerrar al tocar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('pointerdown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('pointerdown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  return (
    <div className="menu-idioma" ref={caja}>
      <button type="button" className="boton-idioma" aria-haspopup="menu" aria-expanded={abierto} title={ayuda} onClick={() => setAbierto(!abierto)}>
        <span aria-hidden>🌐</span>
        <span className="boton-idioma-texto">{etiqueta}</span>
        <span aria-hidden className={`flecha${abierto ? ' flecha-arriba' : ''}`}>▾</span>
      </button>
      {abierto && (
        <ul className="menu-idioma-lista" role="menu" aria-label={ayuda}>
          {OPCIONES_IDIOMA.map(({ valor, nombre, Bandera }) => (
            <li key={valor} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={actual === valor}
                lang={valor}
                onClick={() => {
                  alElegir(valor);
                  setAbierto(false);
                }}
              >
                <Bandera />
                <span>{nombre}</span>
                {actual === valor && <span className="marca-elegido" aria-hidden>✔</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Herramientas() {
  const { t, idioma, tema, cambiarIdioma, cambiarTema } = usePreferencias();
  return (
    <>
      <MenuIdioma actual={idioma} etiqueta={t.comun.idioma} ayuda={t.comun.cambiarIdioma} alElegir={cambiarIdioma} />
      <button
        type="button"
        className="boton-icono"
        onClick={() => cambiarTema(tema === 'crema' ? 'azul' : 'crema')}
        aria-label={tema === 'crema' ? t.comun.temaOscuro : t.comun.temaClaro}
        title={tema === 'crema' ? t.comun.temaOscuro : t.comun.temaClaro}
      >
        <span aria-hidden>{tema === 'crema' ? '🌙' : '☀️'}</span>
      </button>
    </>
  );
}

export default function Plantilla() {
  const { usuario, salir } = useAuth();
  const { t } = usePreferencias();
  const enLinea = useEnLinea();
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const enInicio = pathname === '/';
  const [enCola, setEnCola] = useState(() => cola.pendientes().length);
  const [aviso, setAviso] = useState<number | null>(null);

  const pestanas = [
    { a: '/', icono: '🌱', texto: t.nav.sembrar, fin: true },
    { a: '/precios', icono: '💰', texto: t.nav.precios },
    { a: '/alertas', icono: '⚠️', texto: t.nav.alertas },
    { a: '/capacitaciones', icono: '🎓', texto: t.nav.cursos },
    { a: '/mi-finca', icono: '🏡', texto: t.nav.miFinca },
  ];

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
              <NavLink key={p.a} to={p.a} end={p.fin}>
                <span aria-hidden>{p.icono}</span> {p.texto}
              </NavLink>
            ))}
          </nav>

          <div className="herramientas">
            <Herramientas />
            {usuario?.rol === 'admin' && (
              <NavLink to="/admin" className="boton boton-pequeno boton-secundario enlace-admin">{t.nav.administracion}</NavLink>
            )}
            {usuario ? (
              <details className="menu-cuenta">
                <summary aria-label={t.nav.miCuenta}>
                  <span className="avatar" aria-hidden>{usuario.nombre.charAt(0)}</span>
                </summary>
                <div className="menu-cuenta-panel">
                  <p>
                    <strong>{usuario.nombre}</strong>
                    <br />
                    <small>{usuario.correo} · {usuario.rol}</small>
                  </p>
                  <Link to="/mi-finca">{t.nav.misFincas}</Link>
                  <Link to="/historial">{t.nav.miHistorial}</Link>
                  {usuario.rol === 'admin' && <Link to="/admin">{t.nav.administracion}</Link>}
                  <button
                    className="boton boton-secundario"
                    onClick={async () => {
                      await salir();
                      navegar('/');
                    }}
                  >
                    {t.nav.salir}
                  </button>
                </div>
              </details>
            ) : (
              <Link to="/ingresar" className="boton boton-pequeno">{t.nav.entrar}</Link>
            )}
          </div>
        </div>
      </header>

      {!enLinea && (
        <p className="banda banda-sin-senal" role="status">
          📵 {t.conexion.sinSenal}{enCola ? ` · ${t.conexion.porEnviar(enCola)}` : ''}.
        </p>
      )}
      {aviso !== null && (
        <p className="banda banda-ok" role="status" onClick={() => setAviso(null)}>
          ✅ {t.conexion.enviados(aviso)}
        </p>
      )}
      <p className="banda banda-ejemplo">{t.comun.datosEjemplo}</p>

      <main className="contenido">
        {!enInicio && <BotonVolver />}
        <Outlet />
      </main>

      <footer className="pie">
        <div className="pie-interior">
          <span>© 2026 Terraformes · NASA Space Apps</span>
          <span>{t.comun.pie}</span>
        </div>
      </footer>

      <nav className="pestanas" aria-label={t.nav.secciones}>
        {pestanas.map((p) => (
          <NavLink key={p.a} to={p.a} end={p.fin}>
            <span aria-hidden>{p.icono}</span>
            {p.texto}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
