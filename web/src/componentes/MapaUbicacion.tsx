import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import type { SeleccionUbicacion } from './SelectorUbicacion';

/**
 * Mapa de la portada: Costa Rica por provincias → se acerca a los cantones de la provincia elegida →
 * distritos del cantón sobre el relieve de NASA (ASTER GDEM por GIBS, sin cuenta ni llave).
 * Comparte el estado con SelectorUbicacion: tocar el mapa o usar la lista da lo mismo, y la lista
 * sigue siendo el camino principal (los distritos de ciudad son diminutos en el mapa).
 * Formas: ./mapas/*.json (extractores/scripts/mapas-web.ts). Dibujo en SVG, sin librerías.
 */

type Anillo = number[][];
interface Rasgo { properties: { c: string; n: string; p?: string; l: [number, number] }; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: Anillo[] | Anillo[][] } }
interface Forma { c: string; n: string; p?: string; d: string; etiqueta: [number, number]; caja: Caja }
type Caja = [number, number, number, number]; // x0, y0, x1, y1 en unidades Web Mercator (mundo = 256)

const RELIEVE = (z: number, x: number, y: number) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/ASTER_GDEM_Color_Shaded_Relief/default/GoogleMapsCompatible_Level12/${z}/${y}/${x}.jpg`;
const DURACION_MS = 450;
const MAX_TESELAS = 60;

/** Web Mercator, igual que las teselas de GIBS: así el relieve calza exacto con los límites. */
function proyectar(lng: number, lat: number): [number, number] {
  const s = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * 256, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 256];
}

function aFormas(rasgos: Rasgo[]): Forma[] {
  return rasgos.map(({ properties: p, geometry: g }) => {
    const partes = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates) as Anillo[][];
    const caja: Caja = [Infinity, Infinity, -Infinity, -Infinity];
    const d = partes.map((poligono) => poligono.map((anillo) => 'M' + anillo.map(([lng, lat]) => {
      const [x, y] = proyectar(lng, lat);
      if (x < caja[0]) caja[0] = x;
      if (y < caja[1]) caja[1] = y;
      if (x > caja[2]) caja[2] = x;
      if (y > caja[3]) caja[3] = y;
      return `${x.toFixed(4)} ${y.toFixed(4)}`;
    }).join('L') + 'Z').join('')).join('');
    return { c: p.c, n: p.n, p: p.p, d, etiqueta: proyectar(p.l[0], p.l[1]), caja };
  });
}

const memoria = new Map<string, Promise<Forma[]>>();
function cargarFormas(archivo: string): Promise<Forma[]> {
  let p = memoria.get(archivo);
  if (!p) {
    p = fetch(`./mapas/${archivo}`)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((j: { features: Rasgo[] }) => aFormas(j.features));
    p.catch(() => memoria.delete(archivo));
    memoria.set(archivo, p);
  }
  return p;
}

function useFormas(archivo: string | null) {
  const [estado, setEstado] = useState<{ archivo: string | null; formas: Forma[] | null; error: boolean }>({ archivo: null, formas: null, error: false });
  useEffect(() => {
    if (!archivo) return;
    let vivo = true;
    cargarFormas(archivo).then(
      (formas) => vivo && setEstado({ archivo, formas, error: false }),
      () => vivo && setEstado({ archivo, formas: null, error: true }),
    );
    return () => { vivo = false; };
  }, [archivo]);
  return estado.archivo === archivo ? estado : { archivo, formas: null, error: false };
}

function unir(formas: Forma[]): Caja | null {
  if (!formas.length) return null;
  return formas.reduce<Caja>((a, { caja: b }) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])], [Infinity, Infinity, -Infinity, -Infinity]);
}

/**
 * viewBox con la misma proporción que el recuadro, que deja la forma dentro de la zona libre:
 * sin quedar debajo de las migas (arriba) ni de la ayuda (abajo).
 */
function encuadrar(c: Caja, ancho: number, alto: number): Caja {
  const ARRIBA = 64, ABAJO = 56, LADO = 14, AIRE = 1.04;
  const util = [Math.max(ancho - 2 * LADO, 60), Math.max(alto - ARRIBA - ABAJO, 60)];
  const u = Math.max((c[2] - c[0]) / util[0], (c[3] - c[1]) / util[1]) * AIRE; // unidades por píxel
  const cx = (c[0] + c[2]) / 2, cy = (c[1] + c[3]) / 2;
  const x0 = cx - (ancho / 2) * u, y0 = cy - (ARRIBA + util[1] / 2) * u;
  return [x0, y0, x0 + ancho * u, y0 + alto * u];
}

/**
 * Caja del distrito elegido, nunca más chica que un 15 % del cantón: los distritos de ciudad miden
 * menos de 1 km y acercarse tanto deja el relieve borroso y sin referencias.
 */
function acercar(d: Caja, canton: Caja): Caja {
  const minimo = Math.max((canton[2] - canton[0]) * 0.15, 0.015);
  const w = Math.max(d[2] - d[0], minimo), h = Math.max(d[3] - d[1], minimo);
  const cx = (d[0] + d[2]) / 2, cy = (d[1] + d[3]) / 2;
  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
}

interface Tesela { url: string; x: number; y: number; lado: number; z: number }
/** Teselas de relieve que cubren una vista, al zoom que corresponde a su tamaño en pantalla (máximo 12). */
function teselasPara(v: Caja, anchoPx: number): Tesela[] {
  const pxPorUnidad = anchoPx / (v[2] - v[0]);
  let z = Math.min(12, Math.max(6, Math.ceil(Math.log2(pxPorUnidad * Math.min(window.devicePixelRatio || 1, 2)))));
  const rango = (zz: number) => {
    const n = 2 ** zz / 256;
    return [Math.floor(v[0] * n), Math.floor(v[1] * n), Math.floor(v[2] * n), Math.floor(v[3] * n)];
  };
  let r = rango(z);
  while (z > 6 && (r[2] - r[0] + 1) * (r[3] - r[1] + 1) > MAX_TESELAS) r = rango(--z);
  const lado = 256 / 2 ** z;
  const lista: Tesela[] = [];
  for (let x = r[0]; x <= r[2]; x++) for (let y = r[1]; y <= r[3]; y++) lista.push({ url: RELIEVE(z, x, y), x: x * lado, y: y * lado, lado, z });
  return lista;
}

const pocoMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export default function MapaUbicacion({ s }: { s: SeleccionUbicacion }) {
  const t = useT();
  const caja = useRef<HTMLDivElement>(null);
  const [tam, setTam] = useState({ ancho: 600, alto: 480 });
  const nivel: 'provincias' | 'cantones' | 'distritos' = !s.provincia ? 'provincias' : !s.canton ? 'cantones' : 'distritos';

  const provincias = useFormas('provincias.json');
  const cantones = useFormas(nivel === 'provincias' ? null : 'cantones.json');
  // Los distritos vienen por provincia: se bajan al elegir la provincia, así que al tocar el cantón ya están.
  const distritosProvincia = useFormas(nivel === 'provincias' ? null : `distritos-${s.provincia}.json`);
  const distritosCanton = useMemo(
    () => (nivel === 'distritos' && distritosProvincia.formas ? distritosProvincia.formas.filter((f) => f.p === s.canton) : null),
    [nivel, distritosProvincia.formas, s.canton],
  );
  const distritos = { formas: distritosCanton?.length ? distritosCanton : null, error: distritosProvincia.error };

  // Tamaño real del recuadro: define la proporción del encuadre, el tamaño de letra y el zoom de las teselas.
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTam({ ancho: e.contentRect.width, alto: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cantonesProvincia = useMemo(() => (cantones.formas ?? []).filter((f) => f.p === s.provincia), [cantones.formas, s.provincia]);
  // Cantón completo (para el relieve de fondo) y, si ya hay distrito, acercamiento a ese distrito.
  const vistaCanton = useMemo<Caja | null>(() => {
    if (nivel !== 'distritos') return null;
    const base = unir(distritos.formas ?? []) ?? unir(cantonesProvincia.filter((f) => f.c === s.canton));
    return base ? encuadrar(base, tam.ancho, tam.alto) : null;
  }, [nivel, distritos.formas, cantonesProvincia, s.canton, tam.ancho, tam.alto]);
  const elegida = nivel === 'distritos' && s.distrito ? distritos.formas?.find((f) => f.c === s.distrito) : undefined;
  const objetivo = useMemo<Caja | null>(() => {
    if (nivel === 'distritos') {
      if (!elegida || !vistaCanton) return vistaCanton;
      return encuadrar(acercar(elegida.caja, vistaCanton), tam.ancho, tam.alto);
    }
    const base = nivel === 'provincias' ? unir(provincias.formas ?? []) : unir(cantonesProvincia);
    return base ? encuadrar(base, tam.ancho, tam.alto) : null;
  }, [nivel, provincias.formas, cantonesProvincia, vistaCanton, elegida, tam.ancho, tam.alto]);

  // Acercamiento animado del viewBox (corto y sin animación si la persona pidió menos movimiento).
  const [vista, setVista] = useState<Caja | null>(null);
  const vistaRef = useRef<Caja | null>(null);
  useEffect(() => {
    if (!objetivo) return;
    const desde = vistaRef.current;
    if (!desde || pocoMovimiento()) { vistaRef.current = objetivo; setVista(objetivo); return; }
    const inicio = performance.now();
    let cuadro = 0;
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - inicio) / DURACION_MS);
      const e = 1 - (1 - k) ** 3;
      const v = desde.map((a, i) => a + (objetivo[i] - a) * e) as Caja;
      vistaRef.current = v;
      setVista(v);
      if (k < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [objetivo]);

  // Relieve: una capa que cubre todo el cantón y, al acercarse a un distrito, una capa más nítida encima.
  // Así, durante el acercamiento, el fondo nunca queda vacío.
  const teselas = useMemo(() => {
    if (!vistaCanton) return [];
    const base = teselasPara(vistaCanton, tam.ancho);
    if (!objetivo || objetivo === vistaCanton) return base;
    const zBase = base[0]?.z ?? 0;
    return [...base, ...teselasPara(objetivo, tam.ancho).filter((ts) => ts.z > zBase)];
  }, [vistaCanton, objetivo, tam.ancho]);

  const v = vista ?? objetivo;
  const ppu = v ? tam.ancho / (v[2] - v[0]) : 1; // píxeles por unidad del mapa
  // Un poco más grande en mapas grandes; en celular (mapa angosto) baja a 11 px para que los nombres no se encimen.
  const letra = Math.min(18, Math.max(tam.ancho < 480 ? 11 : 13, tam.ancho / 60)) / ppu;

  const nombreProvincia = s.provincias.find((p) => p.codigo === s.provincia)?.nombre ?? '';
  const nombreCanton = s.cantones.find((c) => c.codigo === s.canton)?.nombre ?? '';
  const error = provincias.error || cantones.error || distritos.error;

  const tocable = (f: Forma, elegir: (c: string) => void, clase: string, elegida = false) => ({
    d: f.d,
    className: `${clase}${elegida ? ' elegida' : ''}`,
    role: 'button',
    tabIndex: 0,
    'aria-label': f.n,
    'aria-pressed': elegida,
    onClick: () => elegir(f.c),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(f.c); }
    },
  });

  const etiqueta = (f: Forma, forzar = false) => {
    const anchoPx = (f.caja[2] - f.caja[0]) * ppu;
    if (!forzar && anchoPx < Math.max(36, f.n.length * 6)) return null; // muy chica: el nombre está en la lista
    // El nombre del distrito elegido manda: se ocultan los vecinos que quedarían encima.
    if (elegida && f !== elegida) {
      const dx = Math.abs(f.etiqueta[0] - elegida.etiqueta[0]) * ppu, dy = Math.abs(f.etiqueta[1] - elegida.etiqueta[1]) * ppu;
      if (dy < 26 && dx < (f.n.length + elegida.n.length) * 4.5) return null;
    }
    return (
      <text key={'t' + f.c} x={f.etiqueta[0]} y={f.etiqueta[1]} className="mapa-etiqueta" style={{ fontSize: letra, strokeWidth: 3 / ppu }}>
        {f.n}
      </text>
    );
  };

  const ayuda = nivel === 'provincias' ? t.mapa.toqueProvincia : nivel === 'cantones' ? t.mapa.toqueCanton : t.mapa.toqueDistrito;

  return (
    <div className="mapa-ubicacion" ref={caja}>
      {v && (
        <svg
          viewBox={`${v[0]} ${v[1]} ${v[2] - v[0]} ${v[3] - v[1]}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={`${t.mapa.titulo}. ${ayuda}`}
        >
          {nivel === 'provincias' && provincias.formas?.map((f, i) => (
            <path key={f.c} {...tocable(f, s.elegirProvincia, `mapa-forma tono-${i % 4}`)} />
          ))}
          {nivel === 'provincias' && provincias.formas?.map((f) => etiqueta(f, true))}

          {nivel !== 'provincias' && cantones.formas?.map((f, i) => (
            nivel === 'cantones' && f.p === s.provincia
              ? <path key={f.c} {...tocable(f, s.elegirCanton, `mapa-forma tono-${i % 4}`)} />
              : <path key={f.c} d={f.d} className="mapa-forma apagada" aria-hidden />
          ))}
          {nivel === 'cantones' && cantonesProvincia.map((f) => etiqueta(f))}

          {nivel === 'distritos' && distritos.formas && (
            <>
              <defs>
                <clipPath id="mapa-recorte" clipPathUnits="userSpaceOnUse">
                  {distritos.formas.map((f) => <path key={f.c} d={f.d} />)}
                </clipPath>
              </defs>
              {vistaCanton && (
                <rect className="mapa-relieve-fondo" x={vistaCanton[0]} y={vistaCanton[1]} width={vistaCanton[2] - vistaCanton[0]} height={vistaCanton[3] - vistaCanton[1]} clipPath="url(#mapa-recorte)" />
              )}
              <g clipPath="url(#mapa-recorte)" aria-hidden>
                {teselas.map((ts) => (
                  <image key={ts.url} href={ts.url} x={ts.x} y={ts.y} width={ts.lado} height={ts.lado} preserveAspectRatio="none" />
                ))}
              </g>
              {distritos.formas.map((f) => (
                <path key={f.c} {...tocable(f, (c) => s.elegirDistrito(c), 'mapa-distrito', f.c === s.distrito)} />
              ))}
              {distritos.formas.map((f) => etiqueta(f, f.c === s.distrito))}
            </>
          )}
        </svg>
      )}

      {/* Con 4 niveles, en celular se esconde "Costa Rica" para que las migas quepan en una fila. */}
      <nav className={`mapa-migas${elegida ? ' largo' : ''}`} aria-label={t.mapa.migas}>
        {nivel === 'provincias' ? (
          <span className="mapa-miga actual">Costa Rica</span>
        ) : (
          <>
            <button type="button" className="mapa-miga miga-pais" onClick={() => s.elegirProvincia('')}>Costa Rica</button>
            <span className="miga-pais" aria-hidden>›</span>
            {nivel === 'cantones' ? (
              <span className="mapa-miga actual">{nombreProvincia}</span>
            ) : (
              <>
                <button type="button" className="mapa-miga" onClick={() => s.elegirCanton('')}>{nombreProvincia}</button>
                <span aria-hidden>›</span>
                {elegida ? (
                  <>
                    <button type="button" className="mapa-miga" onClick={() => s.elegirDistrito(null)}>{nombreCanton}</button>
                    <span aria-hidden>›</span>
                    <span className="mapa-miga actual">{elegida.n}</span>
                  </>
                ) : (
                  <span className="mapa-miga actual">{nombreCanton}</span>
                )}
              </>
            )}
          </>
        )}
      </nav>

      <p className="mapa-pie">
        {error ? t.mapa.error : !v || (nivel === 'distritos' && !distritos.formas) ? t.mapa.cargando : ayuda}
        {nivel === 'distritos' && distritos.formas && <><br /><small>{t.mapa.fuenteRelieve}</small></>}
      </p>
    </div>
  );
}
