// Tarjeta "El tiempo": cómo está ahora, si va a llover en las próximas horas y los próximos 7 días.
// - TarjetaPronostico: el pronóstico de un punto (los 7 días en una fila).
// - PronosticoZona: el tiempo del lugar elegido (provincia → cantón → distrito, el mismo de Sembrar).
import { useT } from '../contexto/PreferenciasContext';
import { catalogo } from '../servicios/algolia';
import { aproximar, cieloDe, pedirPronostico, type Pronostico } from '../servicios/tiempo';
import { useUbicaciones } from '../servicios/ubicaciones';
import { useCargar } from '../utilidades';
import { Cargando } from './Estados';
import { Icono, type NombreIcono } from './Iconos';

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

/** Nombre corto del día: Hoy, Sáb, Dom… */
function nombreDia(t: Textos, fecha: string, i: number): string {
  if (i === 0) return t.tiempo.hoy;
  return mayuscula(new Date(`${fecha}T12:00`).toLocaleDateString(t.locale, { weekday: 'short' }).replace('.', ''));
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

/** Probabilidad de lluvia con texto para lectores de pantalla. */
function Lluvia({ t, prob }: { t: Textos; prob: number | null }) {
  if (prob === null) return null;
  return (
    <span className="pronostico-prob" title={t.tiempo.probLluvia(prob)}>
      <Icono nombre="gota" tam={12} /> {prob}%<span className="oculto"> {t.tiempo.probLluvia(prob)}</span>
    </span>
  );
}

/** Los 7 días en una fila compacta. */
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

/** Pronóstico de un punto. */
export function TarjetaPronostico({ lat, lng, lugar }: { lat: number; lng: number; lugar: string }) {
  const t = useT();
  const tt = t.tiempo;
  const p = useCargar(() => pedirPronostico(lat, lng), [aproximar(lat), aproximar(lng)]);

  const cabeza = (
    <header className="pronostico-cabeza">
      <h2>{tt.titulo}</h2>
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
  const pedido = new Date(d.pedido).toLocaleString(t.locale, { hour: 'numeric', minute: '2-digit', ...(Date.now() - d.pedido > 864e5 ? { day: 'numeric', month: 'short' } : {}) });

  return (
    <section className="tarjeta pronostico">
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

      <SieteDias t={t} p={d} />

      <div className="pronostico-pie">
        <span>{tt.fuente(pedido)}</span>
      </div>
    </section>
  );
}

/** El tiempo del distrito elegido (el mismo de Sembrar). Si todavía no hay distrito, no muestra nada. */
export function PronosticoZona({ codigo }: { codigo: string | null }) {
  const { lista } = useUbicaciones();
  const u = codigo ? lista.find((x) => x.codigo_distrito === codigo) : undefined;
  const z = codigo && !u ? catalogo.zona(codigo) : undefined;
  const punto = u
    ? { lat: u.lat, lng: u.lng, nombre: `${u.distrito}, ${u.canton}` }
    : z ? { lat: z._geoloc.lat, lng: z._geoloc.lng, nombre: `${z.distrito}, ${z.canton}` } : null;
  if (!punto) return null;
  return <TarjetaPronostico lat={punto.lat} lng={punto.lng} lugar={punto.nombre} />;
}
