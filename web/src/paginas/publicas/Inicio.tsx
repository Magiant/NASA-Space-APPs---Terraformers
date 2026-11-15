import { Link } from 'react-router-dom';
import { TarjetaDescargaApp } from '../../componentes/DescargarApp';
import { Icono, Tx } from '../../componentes/Iconos';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { catalogo } from '../../servicios/algolia';
import { useZonaElegida } from '../../utilidades';

/**
 * Página principal: los mismos módulos del encabezado (mismo ícono y mismo nombre), como botones
 * grandes con foto y una frase que dice para qué sirve cada uno. Sembrar va primero y más grande
 * porque es la tarea principal. Si ya eligió su zona antes, un atajo lleva directo a sus cultivos.
 */
export default function Inicio() {
  const t = useT();
  const { usuario } = useAuth();
  const [codigo] = useZonaElegida();
  const zona = codigo ? catalogo.zona(codigo) : undefined;

  const modulos = [
    { a: '/sembrar', icono: 'sembrar', titulo: t.nav.sembrar, texto: t.portal.sembrar, foto: 'cr-campos.jpg', destacado: true },
    { a: '/precios', icono: 'precios', titulo: t.nav.precios, texto: t.portal.precios, foto: 'mercado.jpg' },
    { a: '/alertas', icono: 'alertas', titulo: t.nav.alertas, texto: t.portal.alertas, foto: 'alertas/lluvia.jpg' },
    { a: '/capacitaciones', icono: 'cursos', titulo: t.nav.cursos, texto: t.portal.cursos, foto: 'agricultor.jpg' },
    { a: '/mi-finca', icono: 'finca', titulo: t.nav.miFinca, texto: t.portal.miFinca, foto: 'trabajadores.jpg', privado: true },
  ] as const;

  const rapidos = [
    { a: '/reportar-plaga', icono: 'plaga', texto: t.inicio.reportar },
    { a: '/dron', icono: 'dron', texto: t.inicio.dron },
  ] as const;

  return (
    <>
      <section className="portada portada-inicio">
        <img className="portada-foto" src="./imagenes/cr-colinas.jpg" alt="" aria-hidden />
        <div className="portada-texto">
          <span className="portada-sello"><Icono nombre="globo" tam={16} /> NASA Space Apps · Costa Rica</span>
          <h1>{t.portal.titulo}</h1>
          <p>{t.portal.subtitulo}</p>
          {zona && (
            <Link to="/sembrar" className="portada-zona">
              <Icono nombre="pin" tam={20} />
              <span>{t.portal.suZona(zona.distrito)}</span>
              <strong>{t.portal.verSembrar} →</strong>
            </Link>
          )}
        </div>
      </section>

      <section aria-labelledby="titulo-modulos">
        <h2 id="titulo-modulos" className="oculto">{t.portal.modulos}</h2>
        <div className="modulos">
          {modulos.map((m) => (
            <Link key={m.a} to={m.a} className={`modulo${'destacado' in m ? ' modulo-destacado' : ''}`}>
              <img className="modulo-foto" src={`./imagenes/${m.foto}`} alt="" aria-hidden loading={'destacado' in m ? 'eager' : 'lazy'} />
              <span className="modulo-cuerpo">
                <span className="modulo-icono" aria-hidden><Icono nombre={m.icono} tam={28} /></span>
                <span className="modulo-titulo">{m.titulo}</span>
                <span className="modulo-texto">{m.texto}</span>
                <span className="modulo-ir">
                  {t.portal.abrir} →
                  {'privado' in m && !usuario && <span className="modulo-nota"><Tx>{t.comun.pideEntrar}</Tx></span>}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-rapido">
        <h2 id="titulo-rapido">{t.portal.rapido}</h2>
        <div className="accesos">
          {rapidos.map((x) => (
            <Link key={x.a} to={x.a} className="acceso">
              <span className="acceso-icono" aria-hidden><Icono nombre={x.icono} tam={28} /></span>
              {x.texto}
              {!usuario && <small><Tx>{t.comun.pideEntrar}</Tx></small>}
            </Link>
          ))}
        </div>
      </section>

      <TarjetaDescargaApp />
    </>
  );
}
