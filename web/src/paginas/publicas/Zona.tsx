import { FotoFranja, Icono, NombreIcono, Tx } from '../../componentes/Iconos';
import { Link, useParams } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import GraficoLinea from '../../componentes/GraficoLinea';
import { TarjetaPronostico } from '../../componentes/Pronostico';
import TarjetaCultivo from '../../componentes/TarjetaCultivo';
import { usePreferencias } from '../../contexto/PreferenciasContext';
import { algolia } from '../../servicios/algolia';
import { series } from '../../servicios/supabase';
import type { RegistroZona } from '../../tipos';
import { mes, nombreCultivo, useCargar } from '../../utilidades';

function Ficha({ icono, titulo, valor, detalle }: { icono: NombreIcono; titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="ficha">
      <span className="ficha-icono" aria-hidden><Icono nombre={icono} tam={24} /></span>
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
  const temp = useCargar(() => series.temperatura(z.codigo_distrito, z.clima.temp_media_c ?? 20), [z.codigo_distrito]);
  /** Valor con formato, o "Sin dato" si la fuente todavía no lo tiene. */
  const sd = <T,>(v: T | null | undefined, f: (x: T) => string) => (v === null || v === undefined ? t.comun.sinDato : f(v));
  const mejores = (aptitud.datos ?? []).filter((a) => a.nivel !== 'descartado').slice(0, 8);

  return (
    <>
      <header className="cabecera-pagina">
        <h1>{z.distrito}</h1>
        <p>{z.canton}, {z.provincia}{z.altitud_m !== null && <> · {tz.altura(Math.round(z.altitud_m).toLocaleString(t.locale))}</>}</p>
        <AvisoActualizado cuando={z.actualizado} />
      </header>
      <FotoFranja foto="cr-campos" />

      {(alertas.datos ?? []).map((a) => (
        <div key={a.objectID} className={`alerta alerta-${a.nivel}`}>
          <strong><Icono nombre="alertas" tam={18} /> {a.titulo}</strong>
          <p>{a.descripcion}</p>
        </div>
      ))}

      {/* Lo más importante primero y a todo el ancho: los mejores cultivos, de 4 en 4 en computadora. */}
      <h2>{tz.mejores}</h2>
      {aptitud.cargando && <Cargando />}
      <div className="lista-tarjetas rejilla-productos">
        {mejores.map((a, i) => <TarjetaCultivo key={a.objectID} a={a} posicion={i + 1} />)}
      </div>

      <div className="columnas columnas-mitad">
        <div className="col-principal">
          <TarjetaPronostico lat={z._geoloc.lat} lng={z._geoloc.lng} lugar={`${z.distrito}, ${z.canton}`} />
          <h2>{tz.comoEsta}</h2>
          <div className="fichas">
            <Ficha icono="termometro" titulo={tz.temperatura} valor={sd(z.clima.temp_media_c, (v) => `${v} °C`)} detalle={z.clima.temp_min_c !== null && z.clima.temp_max_c !== null ? tz.entre(z.clima.temp_min_c, z.clima.temp_max_c) : undefined} />
            <Ficha icono="lluvia" titulo={tz.lluviaMes} valor={sd(z.clima.lluvia_mes_mm, (v) => `${v} mm`)} detalle={z.clima.humedad_relativa_pct !== null ? tz.humedadAire(z.clima.humedad_relativa_pct) : undefined} />
            <Ficha icono="gota" titulo={tz.humedadSuelo} valor={sd(z.humedad_suelo.pct, (v) => `${v} %`)} detalle={z.humedad_suelo.estado ? tz.humedad[z.humedad_suelo.estado] : undefined} />
            <Ficha icono="grifo" titulo={tz.agua} valor={z.agua.estado ? tz.aguaEstado[z.agua.estado] : t.comun.sinDato} detalle={z.agua.balance_mm !== null ? `${tz.balance} ${z.agua.balance_mm > 0 ? '+' : ''}${z.agua.balance_mm} mm` : undefined} />
            <Ficha icono="tierra" titulo={tz.suelo} valor={z.suelo.textura ?? t.comun.sinDato} detalle={z.suelo.ph !== null ? `pH ${z.suelo.ph}${z.suelo.materia_organica ? ` · ${tz.materiaOrganica} ${tz.mo[z.suelo.materia_organica]}` : ''}` : undefined} />
            <Ficha icono="volcan" titulo={tz.riesgos} valor={z.riesgos.length ? z.riesgos.map((r) => r.tipo).join(', ') : t.comun.sinDato} detalle={z.riesgos.map((r) => `${r.tipo}: ${tz.riesgo[r.nivel]}`).join(' · ')} />
          </div>
          {(z.area_protegida_pct ?? 0) > 0 && <p className="ayuda"><Tx>{tz.protegida(z.area_protegida_pct ?? 0)}</Tx></p>}
        </div>

        <div className="col-principal">
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
  if (!zona.datos) return <Vacio icono={<Icono nombre="mapa" tam={48} />} titulo={t.zona.noExiste}><Link className="boton" to="/sembrar">{t.zona.elegirOtra}</Link></Vacio>;
  return <Contenido z={zona.datos} />;
}
