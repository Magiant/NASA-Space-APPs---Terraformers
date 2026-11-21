import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConfirmar } from '../../componentes/Confirmar';
import { BanderaCostaRica, BanderaEstadosUnidos, Icono, type NombreIcono } from '../../componentes/Iconos';
import { useAuth } from '../../contexto/AuthContext';
import { cola } from '../../offline/cola';
import { usePreferencias, type Tema } from '../../contexto/PreferenciasContext';
import type { Idioma } from '../../idiomas';

const IDIOMAS: { valor: Idioma; nombre: string; Bandera: () => JSX.Element }[] = [
  { valor: 'es', nombre: 'Español', Bandera: BanderaCostaRica },
  { valor: 'en', nombre: 'English', Bandera: BanderaEstadosUnidos },
];

/** Grupo de filas, como la pantalla de Ajustes del teléfono. */
function Grupo({ id, titulo, children, radio, segmentado }: { id: string; titulo: string; children: ReactNode; radio?: boolean; segmentado?: boolean }) {
  return (
    <section className="ajustes-grupo" aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      <div className={segmentado ? 'ajustes-segmentado' : 'ajustes-lista'} role={radio ? 'radiogroup' : undefined} aria-labelledby={radio ? id : undefined}>
        {children}
      </div>
    </section>
  );
}

function Opcion({ elegida, alElegir, icono, children, lang }: { elegida: boolean; alElegir: () => void; icono: ReactNode; children: ReactNode; lang?: string }) {
  return (
    <button type="button" role="radio" aria-checked={elegida} className="ajustes-opcion" onClick={alElegir} lang={lang}>
      <span className="ajustes-icono" aria-hidden>{icono}</span>
      <span>{children}</span>
    </button>
  );
}

function Enlace({ a, icono, children, alNavegar }: { a: string; icono: NombreIcono; children: ReactNode; alNavegar?: () => void }) {
  return (
    <Link to={a} className="ajustes-fila" onClick={alNavegar}>
      <span className="ajustes-icono" aria-hidden><Icono nombre={icono} tam={22} /></span>
      <span className="ajustes-texto">{children}</span>
      <Icono nombre="flecha" tam={20} />
    </Link>
  );
}

/**
 * Contenido de Ajustes: apariencia, idioma, cuenta y acerca de.
 * Se usa en el desplegable del engranaje (arriba a la derecha) y en la pantalla /ajustes
 * (la usa la app de iPhone como pestaña). `alNavegar` cierra el desplegable al ir a otra pantalla.
 */
export function PanelAjustes({ alNavegar }: { alNavegar?: () => void }) {
  const { t, idioma, tema, cambiarIdioma, cambiarTema } = usePreferencias();
  const ta = t.ajustes;
  const { usuario, salir } = useAuth();
  const navegar = useNavigate();
  const confirmar = useConfirmar();

  /** Cerrar sesión pide confirmación, y avisa si quedan reportes de plaga sin enviar en este teléfono. */
  async function cerrarSesion() {
    if (!usuario) return;
    const tc = t.confirmar.salir;
    const pendientes = cola.pendientes(usuario.id).length;
    const ok = await confirmar({
      titulo: tc.titulo,
      texto: (
        <>
          <p>{tc.texto}</p>
          {pendientes > 0 && <p className="confirmar-importante">{tc.pendientes(pendientes)}</p>}
        </>
      ),
      aceptar: tc.aceptar,
      tono: 'peligro',
      icono: 'salir',
    });
    if (!ok) return;
    await salir();
    alNavegar?.();
    navegar('/');
  }
  const temas: { valor: Tema; icono: NombreIcono; nombre: string }[] = [
    { valor: 'crema', icono: 'sol', nombre: ta.claro },
    { valor: 'azul', icono: 'luna', nombre: ta.oscuro },
  ];

  return (
    <>
      <Grupo id="aj-apariencia" titulo={ta.apariencia} radio segmentado>
        {temas.map((x) => (
          <Opcion key={x.valor} elegida={tema === x.valor} alElegir={() => cambiarTema(x.valor)} icono={<Icono nombre={x.icono} tam={20} />}>
            {x.nombre}
          </Opcion>
        ))}
      </Grupo>

      <Grupo id="aj-idioma" titulo={ta.idioma} radio segmentado>
        {IDIOMAS.map(({ valor, nombre, Bandera }) => (
          <Opcion key={valor} elegida={idioma === valor} alElegir={() => cambiarIdioma(valor)} icono={<Bandera />} lang={valor}>
            {nombre}
          </Opcion>
        ))}
      </Grupo>

      <Grupo id="aj-cuenta" titulo={ta.cuenta}>
        {usuario ? (
          <>
            <div className="ajustes-fila ajustes-fila-fija">
              <span className="avatar" aria-hidden>{usuario.nombre.charAt(0)}</span>
              <span className="ajustes-texto">
                {usuario.nombre}
                <small>{usuario.correo}</small>
              </span>
            </div>
            <Enlace a="/mi-finca" icono="finca" alNavegar={alNavegar}>{t.nav.misFincas}</Enlace>
            <Enlace a="/historial" icono="libro" alNavegar={alNavegar}>{t.nav.miHistorial}</Enlace>
            {usuario.rol === 'admin' && <Enlace a="/admin" icono="usuarios" alNavegar={alNavegar}>{t.nav.administracion}</Enlace>}
            <button
              type="button"
              className="ajustes-fila ajustes-peligro"
              onClick={cerrarSesion}
            >
              <span className="ajustes-icono" aria-hidden><Icono nombre="salir" tam={22} /></span>
              <span className="ajustes-texto">{t.nav.salir}</span>
            </button>
          </>
        ) : (
          <Enlace a="/ingresar" icono="candado" alNavegar={alNavegar}>{t.nav.entrar}</Enlace>
        )}
      </Grupo>

      <Grupo id="aj-acerca" titulo={ta.acerca}>
        <div className="ajustes-fila ajustes-fila-fija">
          <span className="ajustes-icono" aria-hidden><Icono nombre="globo" tam={22} /></span>
          <span className="ajustes-texto">
            TerraFarm · Together we grow
            <small>{ta.fuentes}: {t.comun.pie.replace(/^[^:]+:\s*/, '')}</small>
          </span>
        </div>
      </Grupo>
    </>
  );
}

/** Pantalla completa de Ajustes (enlace directo y pestaña de la app de iPhone). */
export default function Ajustes() {
  const { t } = usePreferencias();
  return (
    <div className="ajustes">
      <header className="cabecera-pagina">
        <h1>{t.ajustes.titulo}</h1>
        <p>{t.ajustes.ayuda}</p>
      </header>
      <PanelAjustes />
    </div>
  );
}
