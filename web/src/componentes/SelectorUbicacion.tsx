import { Icono } from './Iconos';
import { useEffect, useMemo, useState } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { algolia, catalogo } from '../servicios/algolia';

/**
 * Provincia → cantón → distrito, con selects grandes.
 * Con Algolia se alimenta de ubicacion.lvl0/lvl1/lvl2 (HierarchicalMenu).
 */
export default function SelectorUbicacion({
  valor, alCambiar, conGps = false,
}: { valor: string | null; alCambiar: (codigo: string | null) => void; conGps?: boolean }) {
  const t = useT();
  const zonas = catalogo.zonas;
  const actual = zonas.find((z) => z.codigo_distrito === valor);
  const [provincia, setProvincia] = useState(actual?.provincia ?? '');
  const [canton, setCanton] = useState(actual?.canton ?? '');
  const [gps, setGps] = useState<'listo' | 'buscando' | 'error'>('listo');

  // Si el valor cambia desde fuera (por ejemplo, con el GPS), seguirlo.
  useEffect(() => {
    if (actual) {
      setProvincia(actual.provincia);
      setCanton(actual.canton);
    }
  }, [valor]); // eslint-disable-line react-hooks/exhaustive-deps

  const provincias = useMemo(() => [...new Set(zonas.map((z) => z.provincia))].sort(), [zonas]);
  const cantones = useMemo(() => [...new Set(zonas.filter((z) => z.provincia === provincia).map((z) => z.canton))].sort(), [zonas, provincia]);
  const distritos = zonas.filter((z) => z.provincia === provincia && z.canton === canton);

  function usarGps() {
    if (!('geolocation' in navigator)) return setGps('error');
    setGps('buscando');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const z = await algolia.zonaCercana(pos.coords.latitude, pos.coords.longitude);
        setGps('listo');
        alCambiar(z.codigo_distrito);
      },
      () => setGps('error'),
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div className="selector-ubicacion">
      {conGps && (
        <>
          <button type="button" className="boton boton-ancho" onClick={usarGps} disabled={gps === 'buscando'}>
            <Icono nombre="pin" tam={20} /> {gps === 'buscando' ? t.ubicacion.buscando : t.ubicacion.usarMia}
          </button>
          {gps === 'error' && <p className="ayuda">{t.ubicacion.errorGps}</p>}
          <p className="separador"><span>{t.ubicacion.oLista}</span></p>
        </>
      )}
      <label>
        {t.ubicacion.provincia}
        <select
          value={provincia}
          onChange={(e) => {
            setProvincia(e.target.value);
            setCanton('');
            alCambiar(null);
          }}
        >
          <option value="">{t.ubicacion.eligeProvincia}</option>
          {provincias.map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label>
        {t.ubicacion.canton}
        <select
          value={canton}
          disabled={!provincia}
          onChange={(e) => {
            setCanton(e.target.value);
            alCambiar(null);
          }}
        >
          <option value="">{t.ubicacion.eligeCanton}</option>
          {cantones.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>
        {t.ubicacion.distrito}
        <select value={valor ?? ''} disabled={!canton} onChange={(e) => alCambiar(e.target.value || null)}>
          <option value="">{t.ubicacion.eligeDistrito}</option>
          {distritos.map((d) => (
            <option key={d.codigo_distrito} value={d.codigo_distrito}>{d.distrito}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
