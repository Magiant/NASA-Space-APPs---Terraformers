import { Icono } from './Iconos';
import { useEffect, useMemo, useState } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { masCercana, useUbicaciones, type Ubicacion } from '../servicios/ubicaciones';

export interface Opcion { codigo: string; nombre: string }

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
  const [gps, setGps] = useState<'listo' | 'buscando' | 'error'>('listo');
  const sinLista = s.lista.length === 0;
  const siguiente = !s.provincia ? 'provincia' : !s.canton ? 'canton' : !s.distrito ? 'distrito' : null;

  function usarGps() {
    if (!('geolocation' in navigator) || sinLista) return setGps('error');
    setGps('buscando');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps('listo');
        s.elegirDistrito(masCercana(s.lista, pos.coords.latitude, pos.coords.longitude).codigo_distrito);
      },
      () => setGps('error'),
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  const cargandoOpcion = <option value="">{t.ubicacion.cargando}</option>;

  return (
    <div className="selector-ubicacion">
      {conGps && (
        <>
          <button type="button" className="boton boton-ancho" onClick={usarGps} disabled={gps === 'buscando' || sinLista}>
            <Icono nombre="pin" tam={20} /> {gps === 'buscando' ? t.ubicacion.buscando : t.ubicacion.usarMia}
          </button>
          {gps === 'error' && <p className="ayuda" role="alert">{t.ubicacion.errorGps}</p>}
          <p className="separador"><span>{conMapa ? t.ubicacion.oMapaLista : t.ubicacion.oLista}</span></p>
        </>
      )}
      {s.error && <p className="ayuda" role="alert">{t.ubicacion.errorLista}</p>}
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
