import { FotoFranja, Icono, NombreIcono, Tx } from '../../componentes/Iconos';
import { Link, useParams } from 'react-router-dom';
import AvisoActualizado from '../../componentes/AvisoActualizado';
import { AvisoCopia, Cargando, ErrorCarga, Vacio } from '../../componentes/Estados';
import GraficoLinea from '../../componentes/GraficoLinea';
import { TarjetaPronostico } from '../../componentes/Pronostico';
import CultivosPorTemporada from '../../componentes/CultivosPorTemporada';
import { usePreferencias } from '../../contexto/PreferenciasContext';
import { algolia } from '../../servicios/algolia';
import { series } from '../../servicios/supabase';
import type { RegistroZona } from '../../tipos';
import { mes, nombreCultivo, numero, traducirDato, useCargar } from '../../utilidades';

// Correccion - Poll: la tabla de vecinos decia "cosecha octubre" estando en noviembre, sin aclarar si ya paso; ahora
// los meses de los ultimos 5 meses llevan "(ya paso)".
function yaPaso(m: number): boolean {
  const atras = (new Date().getMonth() + 1 - m + 12) % 12;
  return atras >= 1 && atras <= 5;
}

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

// Correccion - Poll: el grafico de temperatura se quedaba en "Cargando" para siempre si la carga fallaba, y no decia
// nada si el distrito no tenia datos; ahora muestra el error con "Intentar de nuevo" o avisa que falta el dato.
// Correccion - Poll: temperatura, lluvia, balance y pH salian con punto decimal ("19.5 °C"); ahora con la coma
// del idioma ("19,5 °C").
function Contenido({ z }: { z: RegistroZona }) {
  const { t } = usePreferencias();
  const tz = t.zona;
  // Correccion - Poll: sin senal, la ficha de la zona quedaba vacia aunque se hubiera visto antes, y si fallaba la
  // recomendacion no se decia nada; ahora usa la copia guardada y, si no hay, muestra el error.
  const aptitud = useCargar(() => algolia.aptitudDeZona(z.codigo_distrito), [z.codigo_distrito], `tf-copia-aptitud-${z.codigo_distrito}`);
  const alertas = useCargar(() => algolia.alertas(z.codigo_distrito), [z.codigo_distrito], `tf-copia-alertas-${z.codigo_distrito}`);
  const sembrado = useCargar(() => algolia.siembrasZona(z.codigo_distrito), [z.codigo_distrito], `tf-copia-vecinos-${z.codigo_distrito}`);
  const temp = useCargar(() => series.temperatura(z.codigo_distrito, z.clima.temp_media_c ?? 20), [z.codigo_distrito]);
  /** Valor con formato, o "Sin dato" si la fuente todavía no lo tiene. */
  const sd = <T,>(v: T | null | undefined, f: (x: T) => string) => (v === null || v === undefined ? t.comun.sinDato : f(v));
  // Los mismos que en Sembrar: solo los que se dan bien (para no recomendar "sembrar ahora" uno de 47 puntos).
  const posibles = (aptitud.datos ?? []).filter((a) => a.nivel === 'excelente' || a.nivel === 'bueno');
  // Cultivos recomendados de los que los vecinos ya tienen mucha área sembrada (20 ha o más en el distrito).
  const recomendados = new Set(posibles.map((a) => a.cultivo_id));
  const saturados = (sembrado.datos ?? []).filter((s) => recomendados.has(s.cultivo_id) && s.hectareas >= 20);

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
      {aptitud.error && <ErrorCarga mensaje={aptitud.error} reintentar={aptitud.recargar} />}
      <AvisoCopia cuando={aptitud.guardadoEl} />
      {/* Correccion - Poll: igual que en Sembrar, primero lo que se siembra ahora (los 8 mejores); "Todos los cultivos" muestra todos. */}
      {/* Correccion - Poll: se recomendaba tomate como numero 1 sin decir que los vecinos ya tienen 64 ha sembradas;
          ahora el aviso de posible sobreoferta va dentro de la tarjeta de ese cultivo, donde se decide. */}
      <CultivosPorTemporada
        cultivos={posibles}
        limite={8}
        avisos={Object.fromEntries(saturados.map((s) => [s.cultivo_id, tz.muchaOferta(nombreCultivo(t, s.cultivo_id, s.cultivo).toLowerCase(), numero(s.hectareas, t.locale))]))}
      />
      {!aptitud.cargando && !aptitud.error && posibles.length === 0 && <p>{t.inicio.ninguno}</p>}

      <div className="columnas columnas-mitad">
        <div className="col-principal">
          <TarjetaPronostico lat={z._geoloc.lat} lng={z._geoloc.lng} lugar={`${z.distrito}, ${z.canton}`} />
          <h2>{tz.comoEsta}</h2>
          <div className="fichas">
            <Ficha icono="termometro" titulo={tz.temperatura} valor={sd(z.clima.temp_media_c, (v) => `${numero(v, t.locale)} °C`)} detalle={z.clima.temp_min_c !== null && z.clima.temp_max_c !== null ? tz.entre(z.clima.temp_min_c, z.clima.temp_max_c) : undefined} />
            <Ficha icono="lluvia" titulo={tz.lluviaMes} valor={sd(z.clima.lluvia_mes_mm, (v) => `${numero(v, t.locale)} mm`)} detalle={z.clima.humedad_relativa_pct !== null ? tz.humedadAire(z.clima.humedad_relativa_pct) : undefined} />
            <Ficha icono="gota" titulo={tz.humedadSuelo} valor={sd(z.humedad_suelo.pct, (v) => `${numero(v, t.locale)} %`)} detalle={z.humedad_suelo.estado ? tz.humedad[z.humedad_suelo.estado] : undefined} />
            <Ficha icono="grifo" titulo={tz.agua} valor={z.agua.estado ? tz.aguaEstado[z.agua.estado] : t.comun.sinDato} detalle={z.agua.balance_mm !== null && z.agua.balance_mm !== 0 ? tz.balanceTexto(numero(Math.abs(z.agua.balance_mm), t.locale), z.agua.balance_mm > 0) : undefined} />
            <Ficha icono="tierra" titulo={tz.suelo} valor={z.suelo.textura ? traducirDato(t, z.suelo.textura) : t.comun.sinDato} detalle={z.suelo.ph !== null ? `${tz.phTexto(numero(z.suelo.ph, t.locale))}${z.suelo.materia_organica ? ` · ${tz.materiaOrganica} ${tz.mo[z.suelo.materia_organica]}` : ''}` : undefined} />
            <Ficha icono="volcan" titulo={tz.riesgos} valor={z.riesgos.length ? z.riesgos.map((r) => traducirDato(t, r.tipo)).join(', ') : tz.sinRiesgos} detalle={z.riesgos.length ? `${z.riesgos.map((r) => `${traducirDato(t, r.tipo)}: ${tz.riesgo[r.nivel]}`).join(' · ')}. ${tz.riesgosQueHacer}` : undefined} />
          </div>
          {(z.area_protegida_pct ?? 0) > 0 && <p className="ayuda"><Tx>{tz.protegida(z.area_protegida_pct ?? 0)}</Tx></p>}
        </div>

        <div className="col-principal">
          <h2>{tz.tempMes}</h2>
          <div className="tarjeta">
            {temp.error ? (
              <ErrorCarga mensaje={temp.error} reintentar={temp.recargar} />
            ) : !temp.datos ? (
              <Cargando />
            ) : temp.datos.length < 2 ? (
              <p className="ayuda">{tz.sinTemp}</p>
            ) : (
              <GraficoLinea puntos={temp.datos} formato={(n) => `${numero(n, t.locale)} °C`} etiqueta={tz.tempMedia} />
            )}
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
                        <td>{nombreCultivo(t, s.cultivo_id, s.cultivo)}</td><td>{numero(s.hectareas, t.locale)}</td><td>{s.fincas}</td><td>{mes(t, s.mes_cosecha)}{yaPaso(s.mes_cosecha) ? ` ${tz.yaPaso}` : ''}</td>
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
  const zona = useCargar(() => algolia.zona(codigo), [codigo], `tf-copia-zona-${codigo}`);
  if (zona.cargando) return <Cargando />;
  if (zona.error) return <ErrorCarga mensaje={zona.error} reintentar={zona.recargar} />;
  if (!zona.datos) return <Vacio icono={<Icono nombre="mapa" tam={48} />} titulo={t.zona.noExiste}><Link className="boton" to="/sembrar">{t.zona.elegirOtra}</Link></Vacio>;
  return <Contenido z={zona.datos} />;
}
