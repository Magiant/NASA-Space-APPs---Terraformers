// Tarjeta "El tiempo": cómo está ahora, si va a llover en las próximas horas y los próximos días.
// - TarjetaPronostico: el pronóstico de un punto. Resumida (7 días en una fila) o `detalle`
//   (hora por hora y una lista Hoy / Mañana / …), que es la que usa la página del tiempo.
// - PronosticoZona: el tiempo del lugar elegido (provincia → cantón → distrito, el mismo de Sembrar).
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../contexto/PreferenciasContext';
import { catalogo } from '../servicios/algolia';
import { aproximar, cieloDe, pedirPronostico, type Pronostico } from '../servicios/tiempo';
import { useCargar } from '../utilidades';
import { Cargando } from './Estados';
import { Icono, type NombreIcono } from './Iconos';
import SelectorUbicacion, { useSeleccionUbicacion } from './SelectorUbicacion';

type Textos = ReturnType<typeof useT>;

/** Ícono del estado del cielo (de noche, la luna en vez del sol). */
function iconoCielo(codigo: number, esDia: boolean): NombreIcono {
  switch (cieloDe(codigo, esDia)) {
    case 'soleado': return 'sol';
    case 'despejado': return 'luna';
    case 'pocoNublado': return esDia ? 'nubeSol' : 'nube';
    case 'nublado': return 'nube';
    case 'niebla': return 'niebla';
    case 'tormenta': return 'tormenta';
    default: return 'lluvia';
  }
}

/** Color del ícono: amarillo con sol, azul con lluvia, el de siempre lo demás. */
function tonoCielo(codigo: number, esDia: boolean): string {
  const c = cieloDe(codigo, esDia);
  if (c === 'soleado' || (c === 'pocoNublado' && esDia)) return 'tono-sol';
  if (c === 'llovizna' || c === 'lluvia' || c === 'lluviaFuerte' || c === 'aguaceros' || c === 'tormenta') return 'tono-lluvia';
  return '';
}

const grados = (n: number | null) => (n === null ? '—' : `${Math.round(n)}°`);
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** '2026-11-20T14:00' (hora local del lugar) → '2:00 p. m.' */
const horaCorta = (t: Textos, iso: string) => new Date(iso).toLocaleTimeString(t.locale, { hour: 'numeric', minute: '2-digit' });

/** Nombre del día. Corto (Hoy, Sáb, Dom…) para la fila; largo (Hoy, Mañana, Domingo 23…) para la lista. */
function nombreDia(t: Textos, fecha: string, i: number, largo = false): string {
  if (i === 0) return t.tiempo.hoy;
  if (largo && i === 1) return t.tiempo.manana;
  const d = new Date(`${fecha}T12:00`);
  const n = largo
    ? d.toLocaleDateString(t.locale, { weekday: 'long', day: 'numeric' }).replace(',', '')
    : d.toLocaleDateString(t.locale, { weekday: 'short' }).replace('.', '');
  return mayuscula(n);
}

/** La frase de las próximas 12 horas: desde qué hora es probable que llueva (50 % o más). */
function avisoLluvia(t: Textos, p: Pronostico): { texto: string; llueve: boolean } | null {
  const horas = p.horas.slice(0, 12);
  if (!horas.length) return null;
  const i = horas.findIndex((h) => (h.lluviaProb ?? 0) >= 50);
  if (i === 0) return { texto: t.tiempo.lluviaAhora, llueve: true };
  if (i > 0) return { texto: t.tiempo.lluviaDesde(horaCorta(t, horas[i].hora)), llueve: true };
  return { texto: t.tiempo.sinLluvia(Math.max(0, ...horas.map((h) => h.lluviaProb ?? 0))), llueve: false };
}

/** Probabilidad de lluvia (y mm si se esperan) con texto para lectores de pantalla. */
function Lluvia({ t, prob, mm }: { t: Textos; prob: number | null; mm?: number | null }) {
  if (prob === null) return null;
  const milimetros = mm != null && mm >= 0.5 ? ` · ${Math.round(mm)} mm` : '';
  return (
    <span className="pronostico-prob" title={t.tiempo.probLluvia(prob)}>
      {/* Correccion - Poll: en la fila de cada dia se leia "96% · 2 mm" sin decir que es lluvia; ahora dice "Lluvia". */}
      <Icono nombre="gota" tam={12} /> {mm !== undefined && <span aria-hidden>{t.tiempo.lluviaCorta} </span>}{prob} %{milimetros}<span className="oculto"> {t.tiempo.probLluvia(prob)}</span>
    </span>
  );
}

/** Próximas 24 horas en una fila que se desliza de lado (dentro de la tarjeta). */
function PorHora({ t, p }: { t: Textos; p: Pronostico }) {
  const hoy = p.dias[0]?.fecha;
  return (
    <section aria-labelledby="pronostico-por-hora">
      <h3 id="pronostico-por-hora" className="pronostico-subtitulo">{t.tiempo.porHora}</h3>
      <ol className="pronostico-horas">
        {p.horas.map((hora, i) => {
          // Correccion - Poll: arriba decia "Nublado" (cielo de ahora) y en la columna "Ahora" decia "Llovizna"
          // (cielo de la hora en punto); ahora la columna "Ahora" usa el mismo cielo que la cabecera.
          // Correccion - Poll: tambien la temperatura de "Ahora" es la de la cabecera (antes 21° abajo y 20° arriba).
          const h = i === 0 ? { ...hora, codigo: p.ahora.codigo, esDia: p.ahora.esDia, temp: p.ahora.temp } : hora;
          const fecha = h.hora.slice(0, 10);
          const cambiaDia = i > 0 && fecha !== p.horas[i - 1].hora.slice(0, 10);
          return (
            <li key={h.hora} className={`pronostico-hora${cambiaDia ? ' pronostico-hora-nuevo-dia' : ''}`}>
              <span className="pronostico-hora-dia">{cambiaDia && fecha > (hoy ?? '') ? t.tiempo.manana : ''}</span>
              <span className="pronostico-hora-nombre">
                {i === 0 ? t.tiempo.ahoraCorto : new Date(h.hora).toLocaleTimeString(t.locale, { hour: 'numeric' })}
              </span>
              <span className={`pronostico-dia-icono ${tonoCielo(h.codigo, h.esDia)}`} title={t.tiempo.cielo[cieloDe(h.codigo, h.esDia)]}>
                <Icono nombre={iconoCielo(h.codigo, h.esDia)} tam={24} />
              </span>
              <span className="oculto">{t.tiempo.cielo[cieloDe(h.codigo, h.esDia)]}</span>
              <strong>{grados(h.temp)}</strong>
              <Lluvia t={t} prob={h.lluviaProb} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Hoy, mañana y los próximos días: una fila por día con el cielo, máxima/mínima y lluvia. */
function PorDia({ t, p }: { t: Textos; p: Pronostico }) {
  return (
    <section aria-labelledby="pronostico-por-dia">
      <h3 id="pronostico-por-dia" className="pronostico-subtitulo">{t.tiempo.porDia}</h3>
      <ol className="pronostico-lista">
        {p.dias.map((dia, i) => (
          <li key={dia.fecha} className="pronostico-fila">
            <span className="pronostico-fila-dia">{nombreDia(t, dia.fecha, i, true)}</span>
            <span className={`pronostico-dia-icono ${tonoCielo(dia.codigo, true)}`} aria-hidden>
              <Icono nombre={iconoCielo(dia.codigo, true)} tam={28} />
            </span>
            <span className="pronostico-fila-cielo">{t.tiempo.cielo[cieloDe(dia.codigo)]}</span>
            <span className="pronostico-fila-temps"><strong>{grados(dia.max)}</strong> <span className="pronostico-min">/ {grados(dia.min)}</span></span>
            <span className="pronostico-fila-lluvia"><Lluvia t={t} prob={dia.lluviaProb} mm={dia.lluviaMm} /></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Los 7 días en una fila compacta (Inicio y página del distrito). */
function SieteDias({ t, p }: { t: Textos; p: Pronostico }) {
  return (
    <ol className="pronostico-dias" aria-label={t.tiempo.semana}>
      {p.dias.map((dia, i) => (
        <li key={dia.fecha} className="pronostico-dia">
          <span className="pronostico-dia-nombre">{nombreDia(t, dia.fecha, i)}</span>
          <span className={`pronostico-dia-icono ${tonoCielo(dia.codigo, true)}`} title={t.tiempo.cielo[cieloDe(dia.codigo)]}>
            <Icono nombre={iconoCielo(dia.codigo, true)} tam={26} />
          </span>
          <span className="oculto">{t.tiempo.cielo[cieloDe(dia.codigo)]}</span>
          <strong>{grados(dia.max)}</strong>
          <span className="pronostico-min">{grados(dia.min)}</span>
          <Lluvia t={t} prob={dia.lluviaProb} />
        </li>
      ))}
    </ol>
  );
}

/** Pronóstico de un punto. `extra` va en el pie (por ejemplo, el botón de usar la ubicación). */
export function TarjetaPronostico({ lat, lng, lugar, extra, detalle = false }: {
  lat: number; lng: number; lugar: string; extra?: ReactNode; detalle?: boolean;
}) {
  const t = useT();
  const tt = t.tiempo;
  const p = useCargar(() => pedirPronostico(lat, lng), [aproximar(lat), aproximar(lng)]);

  const cabeza = (
    <header className="pronostico-cabeza">
      <h2>{detalle ? tt.ahoraEn : tt.titulo}</h2>
      <p className="pronostico-lugar"><Icono nombre="pin" tam={16} /> {lugar}</p>
    </header>
  );

  if (!p.datos) {
    return (
      <section className="tarjeta pronostico" aria-live="polite">
        {cabeza}
        {p.error ? (
          <>
            <p className="pronostico-aviso pronostico-aviso-error"><Icono nombre="sinsenal" tam={18} /> {tt.error}</p>
            <div className="pronostico-pie">
              <button type="button" className="boton boton-secundario boton-pequeno" onClick={p.recargar}>{t.comun.reintentar}</button>
              {extra}
            </div>
          </>
        ) : <Cargando texto={tt.cargando} />}
      </section>
    );
  }

  const d = p.datos;
  const hoy = d.dias[0];
  const cielo = tt.cielo[cieloDe(d.ahora.codigo, d.ahora.esDia)];
  const lluvia = avisoLluvia(t, d);
  // Correccion - Poll: solo decia la hora ("3:33 p. m."); un pronostico guardado de ayer en la tarde parecia de hoy.
  // Ahora, si no es de hoy, lleva el dia; y si es de hoy, dice "hoy".
  const esHoy = new Date(d.pedido).toDateString() === new Date().toDateString();
  const pedido = new Date(d.pedido).toLocaleString(t.locale, { hour: 'numeric', minute: '2-digit', ...(esHoy ? {} : { day: 'numeric', month: 'short' }) });

  return (
    <section className={`tarjeta pronostico${detalle ? ' pronostico-detalle' : ''}`}>
      {cabeza}

      {d.guardado && <p className="pronostico-aviso pronostico-aviso-error"><Icono nombre="sinsenal" tam={18} /> {tt.guardado(pedido)}</p>}

      <div className="pronostico-ahora">
        <span className={`pronostico-icono ${tonoCielo(d.ahora.codigo, d.ahora.esDia)}`} aria-hidden>
          <Icono nombre={iconoCielo(d.ahora.codigo, d.ahora.esDia)} tam={52} />
        </span>
        <div>
          <p className="pronostico-temp">{grados(d.ahora.temp)}<span>C</span></p>
          <p className="pronostico-cielo">{cielo}</p>
        </div>
        <ul className="pronostico-detalles">
          {hoy && <li><strong>{tt.maxMin(grados(hoy.max), grados(hoy.min))}</strong></li>}
          {d.ahora.sensacion !== null && <li>{tt.sensacion(Math.round(d.ahora.sensacion))}</li>}
          {d.ahora.humedad !== null && <li>{tt.humedad(Math.round(d.ahora.humedad))}</li>}
          {d.ahora.viento !== null && <li>{tt.viento(Math.round(d.ahora.viento))}</li>}
        </ul>
      </div>

      {lluvia && (
        <p className={`pronostico-aviso${lluvia.llueve ? ' pronostico-aviso-lluvia' : ''}`}>
          <Icono nombre={lluvia.llueve ? 'lluvia' : 'check'} tam={18} /> {lluvia.texto}
        </p>
      )}

      {detalle ? (
        <>
          {d.horas.length > 1 && <PorHora t={t} p={d} />}
          <PorDia t={t} p={d} />
        </>
      ) : <SieteDias t={t} p={d} />}

      <div className="pronostico-pie">
        <span>{tt.fuente(pedido, esHoy)}</span>
        {extra}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------
// El tiempo del lugar elegido
// ------------------------------------------------------------------

/**
 * El tiempo del distrito elegido (el mismo de Sembrar: provincia → cantón → distrito).
 * - Sin `detalle` (Inicio, Sembrar): si todavía no hay distrito, no muestra nada.
 * - Con `detalle` y `alCambiar` (pestaña Tiempo): si no hay distrito, muestra las listas y el pronóstico
 *   aparece solo al elegir el distrito; con distrito, deja ver otro lugar.
 * El estado de las listas vive aquí, así no se pierde la provincia elegida mientras cambia la tarjeta.
 */
export function PronosticoZona({ codigo, alCambiar, detalle = false }: {
  codigo: string | null; alCambiar?: (codigo: string | null) => void; detalle?: boolean;
}) {
  const t = useT();
  const tt = t.tiempo;
  const sel = useSeleccionUbicacion(codigo, alCambiar ?? (() => {}));
  const u = codigo ? sel.lista.find((x) => x.codigo_distrito === codigo) : undefined;
  const z = codigo && !u ? catalogo.zona(codigo) : undefined;
  const punto = u
    ? { lat: u.lat, lng: u.lng, nombre: `${u.distrito}, ${u.canton}` }
    : z ? { lat: z._geoloc.lat, lng: z._geoloc.lng, nombre: `${z.distrito}, ${z.canton}` } : null;
  const puedeElegir = detalle && !!alCambiar;
  const selector = puedeElegir ? <SelectorUbicacion valor={codigo} alCambiar={alCambiar!} seleccion={sel} /> : null;

  if (!punto) {
    if (!puedeElegir) return null;
    return (
      <section className="tarjeta pronostico pronostico-sin-lugar">
        <header className="pronostico-cabeza"><h2>{tt.titulo}</h2></header>
        {codigo && sel.cargando ? <Cargando texto={tt.cargando} /> : (
          <>
            <p className="pronostico-elegir">{tt.eligeLugar}</p>
            {selector}
          </>
        )}
      </section>
    );
  }

  const pie = puedeElegir
    ? <details className="pronostico-cambiar"><summary>{tt.otroLugar}</summary>{selector}</details>
    : detalle ? null : <Link to="/alertas" className="pronostico-ver-mas">{tt.verMas} →</Link>;
  return <TarjetaPronostico lat={punto.lat} lng={punto.lng} lugar={punto.nombre} extra={pie} detalle={detalle} />;
}
