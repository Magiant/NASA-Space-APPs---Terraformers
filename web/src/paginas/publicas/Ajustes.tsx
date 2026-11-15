import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BanderaCostaRica, BanderaEstadosUnidos, Icono, type NombreIcono } from '../../componentes/Iconos';
import { useAuth } from '../../contexto/AuthContext';
import { usePreferencias, type Tema } from '../../contexto/PreferenciasContext';
import type { Idioma } from '../../idiomas';

const IDIOMAS: { valor: Idioma; nombre: string; Bandera: () => JSX.Element }[] = [
  { valor: 'es', nombre: 'Español', Bandera: BanderaCostaRica },
  { valor: 'en', nombre: 'English', Bandera: BanderaEstadosUnidos },
];

/** Grupo de filas, como la pantalla de Ajustes del teléfono. */
function Grupo({ id, titulo, children, radio }: { id: string; titulo: string; children: ReactNode; radio?: boolean }) {
  return (
    <section className="ajustes-grupo" aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      <div className="ajustes-lista" role={radio ? 'radiogroup' : undefined} aria-labelledby={radio ? id : undefined}>
        {children}
      </div>
    </section>
  );
}

function Opcion({ elegida, alElegir, icono, children, lang }: { elegida: boolean; alElegir: () => void; icono: ReactNode; children: ReactNode; lang?: string }) {
  return (
    <button type="button" role="radio" aria-checked={elegida} className="ajustes-fila" onClick={alElegir} lang={lang}>
      <span className="ajustes-icono" aria-hidden>{icono}</span>
      <span className="ajustes-texto">{children}</span>
      {elegida && <Icono nombre="marca" tam={22} />}
    </button>
  );
}

function Enlace({ a, icono, children }: { a: string; icono: NombreIcono; children: ReactNode }) {
  return (
    <Link to={a} className="ajustes-fila">
      <span className="ajustes-icono" aria-hidden><Icono nombre={icono} tam={22} /></span>
      <span className="ajustes-texto">{children}</span>
      <Icono nombre="flecha" tam={20} />
    </Link>
  );
}

export default function Ajustes() {
  const { t, idioma, tema, cambiarIdioma, cambiarTema } = usePreferencias();
  const ta = t.ajustes;
  const { usuario, salir } = useAuth();
  const navegar = useNavigate();
  const temas: { valor: Tema; icono: NombreIcono; nombre: string }[] = [
    { valor: 'crema', icono: 'sol', nombre: ta.claro },
    { valor: 'azul', icono: 'luna', nombre: ta.oscuro },
  ];

  return (
    <div className="ajustes">
      <header className="cabecera-pagina">
        <h1>{ta.titulo}</h1>
        <p>{ta.ayuda}</p>
      </header>

      <Grupo id="aj-apariencia" titulo={ta.apariencia} radio>
        {temas.map((x) => (
          <Opcion key={x.valor} elegida={tema === x.valor} alElegir={() => cambiarTema(x.valor)} icono={<Icono nombre={x.icono} tam={22} />}>
            {x.nombre}
          </Opcion>
        ))}
      </Grupo>

      <Grupo id="aj-idioma" titulo={ta.idioma} radio>
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
            <Enlace a="/mi-finca" icono="finca">{t.nav.misFincas}</Enlace>
            <Enlace a="/historial" icono="libro">{t.nav.miHistorial}</Enlace>
            {usuario.rol === 'admin' && <Enlace a="/admin" icono="usuarios">{t.nav.administracion}</Enlace>}
            <button
              type="button"
              className="ajustes-fila ajustes-peligro"
              onClick={async () => {
                await salir();
                navegar('/');
              }}
            >
              <span className="ajustes-icono" aria-hidden><Icono nombre="salir" tam={22} /></span>
              <span className="ajustes-texto">{t.nav.salir}</span>
            </button>
          </>
        ) : (
          <Enlace a="/ingresar" icono="candado">{t.nav.entrar}</Enlace>
        )}
      </Grupo>

      <Grupo id="aj-acerca" titulo={ta.acerca}>
        <div className="ajustes-fila ajustes-fila-fija">
          <span className="ajustes-icono" aria-hidden><Icono nombre="sembrar" tam={22} /></span>
          <span className="ajustes-texto">
            Terraformes · NASA Space Apps
            <small>{t.comun.datosEjemplo}</small>
          </span>
        </div>
        <div className="ajustes-fila ajustes-fila-fija">
          <span className="ajustes-icono" aria-hidden><Icono nombre="globo" tam={22} /></span>
          <span className="ajustes-texto">
            {ta.fuentes}
            <small>{t.comun.pie}</small>
          </span>
        </div>
      </Grupo>
    </div>
  );
}
