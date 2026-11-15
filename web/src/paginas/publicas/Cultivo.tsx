import { Link, useParams, useSearchParams } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import GraficoLinea from '../../componentes/GraficoLinea';
import InsigniaNivel from '../../componentes/InsigniaNivel';
import { DesgloseNotas } from '../../componentes/TarjetaCultivo';
import { usePreferencias } from '../../contexto/PreferenciasContext';
import { SIGUIENTES } from '../../datos-ejemplo/publicos';
import { algolia, catalogo } from '../../servicios/algolia';
import { series } from '../../servicios/supabase';
import type { RegistroCultivo } from '../../tipos';
import { colones, nombreCultivo, nombrePlaga, useCargar } from '../../utilidades';
import { Tendencia } from './Precios';
import { IconoCultivo } from '../../componentes/Iconos';

function Contenido({ c, zona }: { c: RegistroCultivo; zona: string | null }) {
  const { t } = usePreferencias();
  const tc = t.cultivo;
  const precio = useCargar(() => algolia.precioDeCultivo(c.id), [c.id]);
  const historico = useCargar(
    () => (precio.datos ? series.precio(precio.datos.producto, precio.datos.precio) : Promise.resolve([])),
    [precio.datos?.objectID],
  );
  const zonas = useCargar(() => algolia.aptitudDeCultivo(c.id), [c.id]);
  const cursos = useCargar(() => algolia.capacitaciones(), []);
  const enZona = zona ? (zonas.datos ?? []).find((a) => a.codigo_distrito === zona) : undefined;
  const rotacion = SIGUIENTES[c.familia];
  const plagas = c.plagas.map((id) => catalogo.plaga(id)).filter((p) => !!p);
  const cursosDelCultivo = (cursos.datos ?? []).filter((k) => k.cultivo_id === c.id || (k.plaga_id && c.plagas.includes(k.plaga_id)));
  const nombre = nombreCultivo(t, c.id, c.nombre);
  const num = (n: number) => n.toLocaleString(t.locale);

  return (
    <>
      <header className="cabecera-pagina">
        <h1><span aria-hidden><IconoCultivo id={c.id} /></span> {nombre}</h1>
        <p><em>{c.nombre_cientifico}</em> · {tc.familia} {c.familia}</p>
      </header>

      <div className="columnas">
        <div className="col-principal">
          {enZona && (
            <section className="tarjeta">
              <h2 style={{ marginTop: 0 }}>{tc.en(catalogo.zona(enZona.codigo_distrito)?.distrito ?? '')}</h2>
              <p><InsigniaNivel nivel={enZona.nivel} /> <strong>{enZona.puntaje}/100</strong></p>
              <DesgloseNotas notas={enZona.notas} />
            </section>
          )}

          <h2>{tc.cuando}</h2>
          <div className="calendario" role="list">
            {t.meses.map((m, i) => {
              const si = c.meses_siembra.includes(i + 1);
              return (
                <span key={m} role="listitem" className={si ? 'mes-si' : ''} aria-label={`${m}: ${si ? tc.buenaEpoca : tc.noRecomendado}`}>
                  {m.slice(0, 3)}
                  {si && <span aria-hidden> ✔</span>}
                </span>
              );
            })}
          </div>
          <p className="ayuda">{tc.ciclo(c.ciclo_dias_min, c.ciclo_dias_max)}</p>

          <h2>{tc.necesita}</h2>
          <ul className="lista-simple">
            <li>🌡️ {tc.req.temp(c.temp_opt_min_c, c.temp_opt_max_c)}</li>
            <li>⛰️ {tc.req.altura(num(c.altitud_min_m), num(c.altitud_max_m))}</li>
            <li>🌧️ {tc.req.agua(c.lluvia_opt_min_mm, c.lluvia_opt_max_mm)}</li>
            <li>🟫 {tc.req.ph(c.ph_opt_min, c.ph_opt_max)}</li>
            <li>♻️ {c.efecto_suelo}</li>
          </ul>

          {plagas.length > 0 && (
            <>
              <h2>{tc.plagas}</h2>
              {plagas.map((p) => (
                <details key={p.id} className="plegable">
                  <summary>🐛 {nombrePlaga(t, p.id, p.nombre)}</summary>
                  <p>{p.sintomas}</p>
                  <p><strong>{tc.comoControlar}</strong></p>
                  <ol className="lista-control">
                    <li><strong>{tc.control.cultural}</strong> {p.control.cultural.join(' ')}</li>
                    <li><strong>{tc.control.biologico}</strong> {p.control.biologico.join(' ')}</li>
                    <li><strong>{tc.control.quimico}</strong> {p.control.quimico.join(' ')}</li>
                  </ol>
                </details>
              ))}
            </>
          )}

          {rotacion && (
            <>
              <h2>{tc.despues}</h2>
              <p className="secuencia">
                <IconoCultivo id={c.id} /> {nombre} →{' '}
                {rotacion.recomendados.map((id) => catalogo.cultivo(id)).filter(Boolean).map((k, i) => (
                  <span key={k!.id}>
                    {i > 0 && ` ${tc.o} `}
                    <Link to={`/cultivo/${k!.id}${zona ? `?zona=${zona}` : ''}`}><IconoCultivo id={k!.id} /> {nombreCultivo(t, k!.id, k!.nombre)}</Link>
                  </span>
                ))}
              </p>
              <p className="ayuda">{rotacion.porque}</p>
              {rotacion.evitar.length > 0 && (
                <p className="ayuda">✕ {tc.evite} {rotacion.evitar.map((id) => nombreCultivo(t, id)).join(', ')}.</p>
              )}
            </>
          )}
        </div>

        <aside className="col-lateral">
          <h2>{tc.precio}</h2>
          {precio.cargando && <Cargando />}
          {precio.datos ? (
            <section className="tarjeta">
              <p className="precio-grande">
                {colones(precio.datos.precio)} <small>{t.tarjeta.por} {precio.datos.unidad}</small>
              </p>
              <Tendencia p={precio.datos} />
              {historico.datos && <GraficoLinea puntos={historico.datos} formato={colones} etiqueta={nombre} />}
              <AvisoActualizado que={t.comun.precios} cuando={precio.datos.fecha} fuente={precio.datos.fuente} />
            </section>
          ) : (
            !precio.cargando && <p>{tc.sinPrecio}</p>
          )}

          <h2>{tc.dondeMejor}</h2>
          {zonas.cargando && <Cargando />}
          <ul className="lista-enlaces">
            {(zonas.datos ?? []).slice(0, 5).map((a) => (
              <li key={a.objectID}>
                <Link to={`/zona/${a.codigo_distrito}`}>
                  <span>{a.ubicacion.lvl2.split(' > ').reverse().join(', ')}</span>
                  <InsigniaNivel nivel={a.nivel} />
                </Link>
              </li>
            ))}
          </ul>

          {cursosDelCultivo.length > 0 && (
            <>
              <h2>{tc.cursos}</h2>
              <ul className="lista-enlaces">
                {cursosDelCultivo.map((k) => (
                  <li key={k.objectID}>
                    <a href={k.url} target="_blank" rel="noreferrer">
                      <span>🎓 {k.titulo}</span>
                      <small>{k.institucion} · {k.duracion_horas} h</small>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

export default function Cultivo() {
  const { t } = usePreferencias();
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const cultivo = useCargar(() => algolia.cultivo(id), [id]);
  if (cultivo.cargando) return <Cargando />;
  if (cultivo.error) return <ErrorCarga mensaje={cultivo.error} reintentar={cultivo.recargar} />;
  if (!cultivo.datos) return <Vacio icono="🌱" titulo={t.cultivo.noExiste}><Link className="boton" to="/">{t.comun.irInicio}</Link></Vacio>;
  return <Contenido c={cultivo.datos} zona={params.get('zona')} />;
}
