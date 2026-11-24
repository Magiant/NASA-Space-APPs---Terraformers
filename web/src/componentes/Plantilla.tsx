import BotonVolver from './BotonVolver';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { usePreferencias } from '../contexto/PreferenciasContext';
import { cola } from '../offline/cola';
import { useEnLinea } from '../utilidades';
import { EnlaceDescargaApp } from './DescargarApp';
import { useAvisar } from './Confirmar';
import { Icono } from './Iconos';
import MenuAjustes from './MenuAjustes';
import { modoReal } from '../servicios/cliente';

export default function Plantilla() {
  const { usuario } = useAuth();
  const { t } = usePreferencias();
  const enLinea = useEnLinea();
  const { pathname } = useLocation();
  const [enCola, setEnCola] = useState(() => cola.pendientes(usuario?.id).length);
  const avisar = useAvisar();

  const pestanas = [
    // Inicio va primero: reemplaza al antiguo botón "Volver" (siempre se puede regresar a los módulos).
    { a: '/', icono: 'inicio', texto: t.nav.inicio, fin: true },
    { a: '/sembrar', icono: 'sembrar', texto: t.nav.sembrar },
    { a: '/precios', icono: 'precios', texto: t.nav.precios },
    { a: '/alertas', icono: 'nubeSol', texto: t.nav.alertas }, // pestaña "Tiempo": pronóstico + alertas
    { a: '/capacitaciones', icono: 'cursos', texto: t.nav.cursos },
    { a: '/mi-finca', icono: 'finca', texto: t.nav.miFinca },
  ] as const;

  // Correccion - Poll: el candado de "Mi finca" era un emoji de 11 px y solo estaba en la barra de abajo; ahora es el
  // icono de candado, mas grande, y tambien va en el menu de computadora y en el pie. El lector de pantalla dice
  // "Necesita cuenta".
  const candado = usuario ? null : (
    <>
      <span className="pestana-candado" aria-hidden><Icono nombre="candado" tam={14} /></span>
      <span className="oculto">{t.comun.pideEntrar.replace('🔒', '')}</span>
    </>
  );

  // Al cambiar de pantalla, volver arriba.
  // (Con llaves: en Chrome reciente scrollTo devuelve una promesa y un efecto no puede devolverla.)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Reportes guardados sin señal (solo los de la cuenta abierta): se envían solos al volver la conexión.
  useEffect(() => {
    const actualizar = () => setEnCola(cola.pendientes(usuario?.id).length);
    actualizar();
    window.addEventListener('tf-cola', actualizar);
    return () => window.removeEventListener('tf-cola', actualizar);
  }, [usuario]);

  useEffect(() => {
    if (enLinea && usuario && cola.pendientes(usuario.id).length) {
      // Reportes que estaban guardados sin señal y ya se enviaron: aviso flotante con "Aceptar".
      // Correccion - Poll: si el servidor rechazaba un reporte varias veces, se perdia sin avisar; ahora se avisa.
      cola.enviar(usuario.id).then(({ enviados, rechazados }) => {
        if (enviados) avisar({ titulo: t.avisos.reportesEnviados, texto: t.conexion.enviados(enviados), tono: 'exito' });
        if (rechazados) avisar({ titulo: t.avisos.noSeEnvio, texto: t.conexion.rechazados(rechazados), tono: 'error' });
      });
    }
  }, [enLinea, usuario, avisar, t]);

  return (
    <div className="app">
      <header className="encabezado">
        <div className="encabezado-interior">
          <Link to="/" className="marca">
            <img src="./icono.svg" alt="" width="34" height="34" />
            <span className="marca-texto">TerraFarm<small>Together we grow</small></span>
          </Link>

          <nav className="nav-principal" aria-label={t.nav.secciones}>
            {pestanas.map((p) => (
              <NavLink key={p.a} to={p.a} end={'fin' in p}>
                <Icono nombre={p.icono} tam={20} /> {p.texto}
                {p.a === '/mi-finca' && candado}
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

      <main className="contenido">
        <BotonVolver />
        <Outlet />
      </main>

      <footer className="pie">
        <div className="pie-interior">
          <div className="pie-marca">
            <Link to="/" className="marca">
              <img src="./icono.svg" alt="" width="34" height="34" />
              <span className="marca-texto">TerraFarm<small>Together we grow</small></span>
            </Link>
            <p>{t.comun.pieLema}</p>
            <p className="pie-aviso">{t.comun.pieAviso}</p>
            <EnlaceDescargaApp />
          </div>
          <nav className="pie-columna" aria-label={t.comun.pieSecciones}>
            <strong>{t.comun.pieSecciones}</strong>
            {pestanas.map((p) => <Link key={p.a} to={p.a}>{p.texto}{p.a === '/mi-finca' && candado}</Link>)}
          </nav>
          <div className="pie-columna">
            <strong>{t.comun.pieFuentes}</strong>
            <span>{t.comun.pie.replace(/^[^:]+:\s*/, '')}</span>
            <Link to="/creditos">{t.creditos.enlace}</Link>
          </div>
        </div>
        <div className="pie-final">© 2026 TerraFarm · Together we grow · NASA Space Apps Challenge · Costa Rica</div>
      </footer>

      {usuario && !pathname.startsWith('/reportar-plaga') && (
        // Correccion - Poll: en el celular la pildora de 245 px tapaba botones y texto; el nombre va en su propio
        // span para que el CSS deje solo el icono en pantallas chicas (el lector de pantalla lo sigue leyendo).
        <Link to="/reportar-plaga" className="boton-flotante">
          <Icono nombre="plaga" tam={22} /> <span className="boton-flotante-texto">{t.inicio.reportar}</span>
        </Link>
      )}

      <nav className="pestanas" aria-label={t.nav.secciones}>
        {/* Correccion - Poll: la pestana "Mi finca" se veia igual que las demas sin sesion y el aviso llegaba
            despues de tocarla; ahora lleva un candado y el lector de pantalla dice que necesita cuenta. */}
        {pestanas.map((p) => (
          <NavLink key={p.a} to={p.a} end={'fin' in p}>
            <Icono nombre={p.icono} tam={26} />
            {p.texto}
            {p.a === '/mi-finca' && candado}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
