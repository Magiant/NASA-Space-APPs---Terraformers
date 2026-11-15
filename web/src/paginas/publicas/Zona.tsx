import { Link, useParams } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import GraficoLinea from '../../componentes/GraficoLinea';
import TarjetaCultivo from '../../componentes/TarjetaCultivo';
import { usePreferencias } from '../../contexto/PreferenciasContext';
import { algolia } from '../../servicios/algolia';
import { series } from '../../servicios/supabase';
import type { RegistroZona } from '../../tipos';
import { mes, nombreCultivo, useCargar } from '../../utilidades';

function Ficha({ icono, titulo, valor, detalle }: { icono: string; titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="ficha">
      <span className="ficha-icono" aria-hidden>{icono}</span>
      <span className="ficha-titulo">{titulo}</span>
      <strong className="ficha-valor">{valor}</strong>
      {detalle && <span className="ficha-detalle">{detalle}</span>}
    </div>
  );
}

function Contenido({ z }: { z: RegistroZona }) {
  const { t } = usePreferencias();
  const tz = t.zona;
  const aptitud = useCargar(() => algolia.aptitudDeZona(z.codigo_distrito), [z.codigo_distrito]);
  const alertas = useCargar(() => algolia.alertas(z.codigo_distrito), [z.codigo_distrito]);
  const sembrado = useCargar(() => algolia.siembrasZona(z.codigo_distrito), [z.codigo_distrito]);
  const temp = useCargar(() => series.temperatura(z.codigo_distrito, z.clima.temp_media_c), [z.codigo_distrito]);
  const mejores = (aptitud.datos ?? []).filter((a) => a.nivel !== 'descartado').slice(0, 6);

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{z.distrito}</h1>
        <p>{z.canton}, {z.provincia} · {tz.altura(z.altitud_m.toLocaleString(t.locale))}</p>
        <AvisoActualizado cuando={z.actualizado} />
      </header>

      {(alertas.datos ?? []).map((a) => (
        <div key={a.objectID} className={`alerta alerta-${a.nivel}`}>
          <strong>⚠️ {a.titulo}</strong>
          <p>{a.descripcion}</p>
        </div>
      ))}

      <div className="columnas">
        <div className="col-principal">
          <h2>{tz.comoEsta}</h2>
          <div className="fichas">
            <Ficha icono="🌡️" titulo={tz.temperatura} valor={`${z.clima.temp_media_c} °C`} detalle={tz.entre(z.clima.temp_min_c, z.clima.temp_max_c)} />
            <Ficha icono="🌧️" titulo={tz.lluviaMes} valor={`${z.clima.lluvia_mes_mm} mm`} detalle={tz.humedadAire(z.clima.humedad_relativa_pct)} />
            <Ficha icono="💧" titulo={tz.humedadSuelo} valor={`${z.humedad_suelo.pct} %`} detalle={tz.humedad[z.humedad_suelo.estado]} />
            <Ficha icono="🚰" titulo={tz.agua} valor={tz.aguaEstado[z.agua.estado]} detalle={`${tz.balance} ${z.agua.balance_mm > 0 ? '+' : ''}${z.agua.balance_mm} mm`} />
            <Ficha icono="🟫" titulo={tz.suelo} valor={z.suelo.textura} detalle={`pH ${z.suelo.ph} · ${tz.materiaOrganica} ${tz.mo[z.suelo.materia_organica]}`} />
            <Ficha icono="🌋" titulo={tz.riesgos} valor={z.riesgos.map((r) => r.tipo).join(', ')} detalle={z.riesgos.map((r) => `${r.tipo}: ${tz.riesgo[r.nivel]}`).join(' · ')} />
          </div>
          {z.area_protegida_pct > 0 && <p className="ayuda">{tz.protegida(z.area_protegida_pct)}</p>}

          <h2>{tz.tempMes}</h2>
          <div className="tarjeta">
            {temp.datos ? <GraficoLinea puntos={temp.datos} formato={(n) => `${n} °C`} etiqueta={tz.tempMedia} /> : <Cargando />}
          </div>

          {(sembrado.datos ?? []).length > 0 && (
            <>
              <h2>{tz.vecinos}</h2>
              <p className="ayuda">{tz.vecinosAyuda}</p>
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead>
                    <tr><th>{tz.tabla.cultivo}</th><th>{tz.tabla.hectareas}</th><th>{tz.tabla.fincas}</th><th>{tz.tabla.cosecha}</th></tr>
                  </thead>
                  <tbody>
                    {sembrado.datos!.map((s) => (
                      <tr key={s.cultivo_id}>
                        <td>{nombreCultivo(t, s.cultivo_id, s.cultivo)}</td><td>{s.hectareas}</td><td>{s.fincas}</td><td>{mes(t, s.mes_cosecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <aside className="col-lateral">
          <h2>{tz.mejores}</h2>
          {aptitud.cargando && <Cargando />}
          <div className="lista-tarjetas" style={{ gridTemplateColumns: '1fr' }}>
            {mejores.map((a, i) => <TarjetaCultivo key={a.objectID} a={a} posicion={i + 1} />)}
          </div>
        </aside>
      </div>
    </>
  );
}

export default function Zona() {
  const { t } = usePreferencias();
  const { codigo = '' } = useParams();
  const zona = useCargar(() => algolia.zona(codigo), [codigo]);
  if (zona.cargando) return <Cargando />;
  if (zona.error) return <ErrorCarga mensaje={zona.error} reintentar={zona.recargar} />;
  if (!zona.datos) return <Vacio icono="🗺️" titulo={t.zona.noExiste}><Link className="boton" to="/">{t.zona.elegirOtra}</Link></Vacio>;
  return <Contenido z={zona.datos} />;
}
