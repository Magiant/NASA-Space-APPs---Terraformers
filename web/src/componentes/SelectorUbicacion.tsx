import { useAvisar } from './Confirmar';
import { Icono } from './Iconos';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { masCercana, useUbicaciones, type Ubicacion } from '../servicios/ubicaciones';

export interface Opcion { codigo: string; nombre: string }

/** Por qué no se pudo usar "Usar mi ubicación" (cada motivo tiene su texto en idiomas → ubicacion.errorGps). */
type MotivoErrorGps = 'permiso' | 'noDisponible' | 'fuera' | 'noSoportado';

/** Estado compartido provincia → cantón → distrito (lo usan la lista y el mapa a la vez). */
export interface SeleccionUbicacion {
  lista: Ubicacion[];
  cargando: boolean;
  error: boolean;
  provincia: string; // código, '' si no hay
  canton: string;
  distrito: string | null;
  provincias: Opcion[];
  cantones: Opcion[];
  distritos: Opcion[];
  elegirProvincia: (codigo: string) => void;
  elegirCanton: (codigo: string) => void;
  elegirDistrito: (codigo: string | null) => void;
}

const porNombre = (a: Opcion, b: Opcion) => a.nombre.localeCompare(b.nombre, 'es');
function unicos(lista: Ubicacion[], codigo: keyof Ubicacion, nombre: keyof Ubicacion): Opcion[] {
  const m = new Map<string, string>();
  for (const u of lista) m.set(String(u[codigo]), String(u[nombre]));
  return [...m].map(([c, n]) => ({ codigo: c, nombre: n })).sort(porNombre);
}

export function useSeleccionUbicacion(valor: string | null, alCambiar: (codigo: string | null) => void): SeleccionUbicacion {
  const { lista, cargando, error } = useUbicaciones();
  const actual = valor ? lista.find((u) => u.codigo_distrito === valor) : undefined;
  const [provincia, setProvincia] = useState(actual?.codigo_provincia ?? '');
  const [canton, setCanton] = useState(actual?.codigo_canton ?? '');

  // Si el distrito cambia desde fuera (GPS, mapa, copia guardada) o la lista termina de cargar, seguirlo.
  useEffect(() => {
    if (actual) {
      setProvincia(actual.codigo_provincia);
      setCanton(actual.codigo_canton);
    }
  }, [actual]);

  const provincias = useMemo(() => unicos(lista, 'codigo_provincia', 'provincia'), [lista]);
  const cantones = useMemo(() => unicos(lista.filter((u) => u.codigo_provincia === provincia), 'codigo_canton', 'canton'), [lista, provincia]);
  const distritos = useMemo(() => unicos(lista.filter((u) => u.codigo_canton === canton), 'codigo_distrito', 'distrito'), [lista, canton]);

  return {
    lista, cargando, error, provincia, canton, distrito: actual ? valor : null,
    provincias, cantones, distritos,
    elegirProvincia: (c) => { setProvincia(c); setCanton(''); alCambiar(null); },
    elegirCanton: (c) => { setCanton(c); alCambiar(null); },
    elegirDistrito: (c) => alCambiar(c),
  };
}

/**
 * Provincia → cantón → distrito, con selects grandes y "Usar mi ubicación".
 * Los 492 distritos vienen de Supabase (tabla `distritos`) o del respaldo en ./mapas/.
 * Si se le pasa `seleccion`, comparte el estado con otro componente (el mapa de la portada).
 */
export default function SelectorUbicacion({
  valor, alCambiar, conGps = false, seleccion, conMapa = false,
}: {
  valor: string | null;
  alCambiar: (codigo: string | null) => void;
  conGps?: boolean;
  seleccion?: SeleccionUbicacion;
  conMapa?: boolean;
}) {
  const t = useT();
  const propia = useSeleccionUbicacion(valor, alCambiar);
  const s = seleccion ?? propia;
  const [buscando, setBuscando] = useState(false);
  const avisar = useAvisar();
  const intento = useRef(0); // para ignorar una respuesta que llega después de darse por perdida
  const sinLista = s.lista.length === 0;
  const siguiente = !s.provincia ? 'provincia' : !s.canton ? 'canton' : !s.distrito ? 'distrito' : null;

  // Correccion - Poll: cuando no se encontraba la ubicacion, el aviso era un texto gris que casi no se
  // veia, y si el permiso quedaba sin respuesta el boton se quedaba en "Buscando..." para siempre.
  function usarGps() {
    // Correccion - Poll: el aviso de "no encontramos su ubicación" quedaba dentro de la página y, sin permiso, no decía
    // cómo darlo. Ahora es una ventana flotante con "Aceptar" y, si falta el permiso, los pasos para darlo (distintos en
    // la app y en el navegador).
    const fallar = (motivo: MotivoErrorGps) => {
      intento.current++;
      setBuscando(false);
      const te = t.ubicacion.errorGps;
      const enApp = !!document.documentElement.dataset.nativo;
      const pasos = motivo === 'permiso' ? (enApp ? te.pasosApp : te.pasosNavegador) : null;
      avisar({
        titulo: te.titulo, tono: 'error', icono: 'pin',
        texto: <>
          <p>{te[motivo]}</p>
          {pasos && <><p><strong>{te.comoPermitir}</strong></p><ol>{pasos.map((p) => <li key={p}>{p}</li>)}</ol></>}
        </>,
      });
    };
    if (!('geolocation' in navigator)) return fallar('noSoportado');
    if (sinLista) return;
    const n = ++intento.current;
    setBuscando(true);
    // Si la persona no responde la pregunta del permiso, el navegador nunca avisa: a los 20 s se da por perdida.
    const reloj = setTimeout(() => intento.current === n && fallar('noDisponible'), 20000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (intento.current !== n) return;
        clearTimeout(reloj);
        const { latitude: lat, longitude: lng } = pos.coords;
        const u = masCercana(s.lista, lat, lng);
        // Más de ~55 km del distrito más cercano: el punto no está en Costa Rica (o el GPS se equivocó).
        const k = Math.cos((lat * Math.PI) / 180);
        if (Math.hypot((u.lng - lng) * k, u.lat - lat) > 0.5) return fallar('fuera');
        setBuscando(false);
        s.elegirDistrito(u.codigo_distrito);
      },
      (e) => {
        if (intento.current !== n) return;
        clearTimeout(reloj);
        fallar(e.code === e.PERMISSION_DENIED ? 'permiso' : 'noDisponible');
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  // Correccion - Poll: si la lista de lugares no cargaba, los selectores seguian diciendo "Cargando la lista…" para
  // siempre y no habia como reintentar; ahora dicen que no se pudo cargar y hay un boton "Intentar de nuevo".
  const cargandoOpcion = <option value="">{s.error ? t.ubicacion.noCargo : t.ubicacion.cargando}</option>;

  return (
    <div className="selector-ubicacion">
      {conGps && (
        <>
          <button type="button" className="boton boton-ancho" onClick={usarGps} disabled={buscando || sinLista}>
            <Icono nombre="pin" tam={20} /> {buscando ? t.ubicacion.buscando : t.ubicacion.usarMia}
          </button>
          <p className="separador"><span>{conMapa ? t.ubicacion.oMapaLista : t.ubicacion.oLista}</span></p>
        </>
      )}
      {s.error && (
        <div className="aviso aviso-error" role="alert">
          <p>{t.ubicacion.errorLista}</p>
          <button type="button" className="boton boton-secundario" onClick={() => window.location.reload()}>{t.comun.reintentar}</button>
        </div>
      )}
      <label className={siguiente === 'provincia' ? 'campo-siguiente' : undefined}>
        {t.ubicacion.provincia}
        <select value={s.provincia} disabled={sinLista} onChange={(e) => s.elegirProvincia(e.target.value)}>
          {sinLista ? cargandoOpcion : <option value="">{t.ubicacion.eligeProvincia}</option>}
          {s.provincias.map((p) => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
        </select>
      </label>
      <label className={siguiente === 'canton' ? 'campo-siguiente' : undefined}>
        {t.ubicacion.canton}
        <select value={s.canton} disabled={!s.provincia} onChange={(e) => s.elegirCanton(e.target.value)}>
          <option value="">{t.ubicacion.eligeCanton}</option>
          {s.cantones.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
        </select>
      </label>
      <label className={siguiente === 'distrito' ? 'campo-siguiente' : undefined}>
        {t.ubicacion.distrito}
        <select value={s.distrito ?? ''} disabled={!s.canton} onChange={(e) => s.elegirDistrito(e.target.value || null)}>
          <option value="">{t.ubicacion.eligeDistrito}</option>
          {s.distritos.map((d) => <option key={d.codigo} value={d.codigo}>{d.nombre}</option>)}
        </select>
      </label>
    </div>
  );
}
