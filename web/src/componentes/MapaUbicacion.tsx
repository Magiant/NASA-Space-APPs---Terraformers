import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as EventoPuntero } from 'react';
import { useT } from '../contexto/PreferenciasContext';
import { Icono } from './Iconos';
import type { SeleccionUbicacion } from './SelectorUbicacion';

/**
 * Mapa de la portada: Costa Rica por provincias → se acerca a los cantones de la provincia elegida →
 * distritos del cantón sobre el relieve de NASA (ASTER GDEM por GIBS, sin cuenta ni llave).
 * Comparte el estado con SelectorUbicacion: tocar el mapa o usar la lista da lo mismo, y la lista
 * sigue siendo el camino principal (los distritos de ciudad son diminutos en el mapa).
 * Formas: ./mapas/*.json (extractores/scripts/mapas-web.ts). Dibujo en SVG, sin librerías.
 *
 * En el teléfono se acerca y se mueve con los dedos (y los botones + / − / encuadrar): acercar de más entra a
 * la provincia, cantón o distrito, y alejar de más vuelve al nivel anterior. En la computadora el mapa no se
 * acerca ni se arrastra: la rueda hacia abajo solo vuelve al nivel anterior. Con todo Costa Rica a la vista,
 * la rueda y un dedo siguen moviendo la página. Al pasar el mouse sobre una forma, esta se levanta con sombra
 * y su nombre sale en grande.
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
/** Teléfono o tableta sin mouse: la pista habla de dedos, no de la rueda. */
const soloDedos = () => window.matchMedia?.('(hover: none)').matches ?? false;

const ZOOM_MAX = 8; // cuánto más cerca que el nivel completo se puede llegar
const PASO_BOTON = 1.6; // cada toque de + o −
const BOTON_MS = 240;
// Cambio de nivel con el zoom: alejar más de SALIR veces el nivel completo sube un nivel; con los dedos (o los
// botones en el teléfono), acercar más de ENTRAR veces entra a la forma entre los dedos (provincia → cantones → distritos).
// Entre 1 y ESTIRAR el mapa se deja alejar un poco más, para que se vea que va a salir; si se suelta antes, vuelve.
const ENTRAR = 2.2;
const SALIR = 1.4;
const ESTIRAR = 1.6;
const PAUSA_NIVEL_MS = 650; // tras cambiar de nivel, el gesto que sigue no cuenta (evita saltar dos niveles)

/** Acerca (f > 1) o aleja (f < 1) la vista dejando quieto el punto del mapa que está bajo (px, py). */
function zoomEn(v: Caja, f: number, px: number, py: number, anchoPx: number): Caja {
  const u = (v[2] - v[0]) / anchoPx; // unidades del mapa por píxel
  const x0 = v[0] + px * u - (px * u) / f, y0 = v[1] + py * u - (py * u) / f;
  return [x0, y0, x0 + (v[2] - v[0]) / f, y0 + (v[3] - v[1]) / f];
}

const mover = (v: Caja, dx: number, dy: number): Caja => [v[0] + dx, v[1] + dy, v[2] + dx, v[3] + dy];

/**
 * Ni más de `acercarHasta` veces más cerca que el nivel completo, ni más lejos que `alejarHasta` veces, y sin
 * salirse de él. Más lejos que el nivel completo, el mapa queda centrado.
 */
function limitar(v: Caja, l: Caja, alejarHasta = 1, acercarHasta = ZOOM_MAX): Caja {
  const escala = Math.min(alejarHasta, Math.max(1 / acercarHasta, (v[2] - v[0]) / (l[2] - l[0])));
  const w = (l[2] - l[0]) * escala, h = (l[3] - l[1]) * escala;
  if (escala >= 1) {
    const x0 = (l[0] + l[2] - w) / 2, y0 = (l[1] + l[3] - h) / 2;
    return [x0, y0, x0 + w, y0 + h];
  }
  const cx = (v[0] + v[2]) / 2, cy = (v[1] + v[3]) / 2;
  const x0 = Math.min(Math.max(cx - w / 2, l[0]), l[2] - w);
  const y0 = Math.min(Math.max(cy - h / 2, l[1]), l[3] - h);
  return [x0, y0, x0 + w, y0 + h];
}

type Punto = { x: number; y: number };

const casiIgual = (a: Caja, b: Caja | null) => !!b && a.every((x, i) => Math.abs(x - b[i]) < (b[2] - b[0]) * 0.003);

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

  // Hasta dónde se puede alejar y mover a mano: el nivel completo (con distrito elegido, todo el cantón).
  const limite = nivel === 'distritos' ? vistaCanton : objetivo;
  const limiteRef = useRef(limite);
  limiteRef.current = limite;
  const objetivoRef = useRef(objetivo);
  objetivoRef.current = objetivo;

  // Vista que se dibuja (viewBox). Se anima hacia el encuadre de la selección y la persona la mueve a mano.
  const [vista, setVista] = useState<Caja | null>(null);
  const vistaRef = useRef<Caja | null>(null);
  const cuadro = useRef(0);
  const poner = useCallback((v: Caja) => { vistaRef.current = v; setVista(v); }, []);
  /** Movimiento suave (corto, y sin animación si la persona pidió menos movimiento). */
  const animarA = useCallback((destino: Caja, ms: number) => {
    cancelAnimationFrame(cuadro.current);
    const desde = vistaRef.current;
    if (!desde || pocoMovimiento()) { poner(destino); return; }
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - inicio) / ms);
      const e = 1 - (1 - k) ** 3;
      poner(desde.map((a, i) => a + (destino[i] - a) * e) as Caja);
      if (k < 1) cuadro.current = requestAnimationFrame(paso);
    };
    cuadro.current = requestAnimationFrame(paso);
  }, [poner]);

  // movido: la persona acercó o movió el mapa. quieta: esa vista cuando deja de moverla (para pedir relieve nítido).
  const [movido, setMovido] = useState(false);
  const [usoZoom, setUsoZoom] = useState(false);
  const [quieta, setQuieta] = useState<Caja | null>(null);
  const reloj = useRef(0);
  const punteros = useRef(new Map<number, Punto>());
  /** Al terminar el gesto: si quedó más lejos que el nivel completo (sin llegar a salir), vuelve a él. */
  const asentar = useCallback(() => {
    const v = vistaRef.current, l = limiteRef.current;
    if (!v || !l || punteros.current.size) return;
    if (v[2] - v[0] > (l[2] - l[0]) * 1.001) {
      animarA(l, 220);
      setMovido(!casiIgual(l, objetivoRef.current));
      setQuieta(null);
    } else setQuieta(v);
  }, [animarA]);
  const recordar = useCallback((v: Caja, ms: number) => {
    setMovido(!casiIgual(v, objetivoRef.current));
    setUsoZoom(true);
    clearTimeout(reloj.current);
    reloj.current = window.setTimeout(asentar, ms);
  }, [asentar]);

  // Cambio de nivel con el zoom (ver ENTRAR y SALIR). Usa la selección más reciente sin volver a crear los manejadores.
  const sRef = useRef(s);
  sRef.current = s;
  const nivelRef = useRef(nivel);
  nivelRef.current = nivel;
  const pausa = useRef(0);
  // Alejar de más siempre vuelve al nivel anterior. Acercar para entrar solo con los dedos o en el teléfono:
  // en la computadora la rueda y los botones solo acercan, para mirar de cerca sin cambiar de lugar.
  const cambiarNivel = useCallback((v: Caja, l: Caja, foco: Punto | null, puedeEntrar: boolean): boolean => {
    const sel = sRef.current, n = nivelRef.current;
    const escala = (v[2] - v[0]) / (l[2] - l[0]);
    let cambio = false;
    if (escala > SALIR && n !== 'provincias') {
      if (n === 'distritos') sel.elegirCanton(''); else sel.elegirProvincia('');
      cambio = true;
    } else if (puedeEntrar && escala < 1 / ENTRAR && foco && !(n === 'distritos' && sel.distrito)) {
      // La forma que está bajo el mouse o entre los dedos (las formas tocables llevan data-c con su código).
      const el = document.elementFromPoint(foco.x, foco.y);
      const c = el instanceof SVGElement && caja.current?.contains(el) ? el.dataset.c : undefined;
      if (c) {
        if (n === 'provincias') sel.elegirProvincia(c); else if (n === 'cantones') sel.elegirCanton(c); else sel.elegirDistrito(c);
        cambio = true;
      }
    }
    if (cambio) pausa.current = performance.now() + PAUSA_NIVEL_MS;
    return cambio;
  }, []);
  const enPausa = () => performance.now() < pausa.current;

  // Al cambiar la selección (o el tamaño del recuadro) el mapa va solo al nuevo encuadre.
  useEffect(() => {
    if (!objetivo) return;
    setMovido(false);
    setQuieta(null);
    animarA(objetivo, DURACION_MS);
    return () => cancelAnimationFrame(cuadro.current);
  }, [objetivo, animarA]);

  /**
   * Cambio hecho a mano: inmediato y dentro de los límites. `foco` (rueda y dedos: el punto de la pantalla
   * donde se acerca) permite cambiar de nivel; el arrastre no lo manda, así que solo mueve. `puedeEntrar`:
   * acercar de más entra a la forma del foco (solo con los dedos). `puedeAcercar`: en la computadora la rueda
   * no acerca, solo aleja para volver al nivel anterior.
   */
  const aplicar = useCallback((nueva: Caja, foco?: Punto, puedeEntrar = false, puedeAcercar = true) => {
    const l = limiteRef.current;
    if (!l || enPausa()) return;
    cancelAnimationFrame(cuadro.current);
    const v = limitar(nueva, l, nivelRef.current === 'provincias' ? 1 : ESTIRAR, puedeAcercar ? ZOOM_MAX : 1);
    poner(v);
    if (foco && cambiarNivel(v, l, foco, puedeEntrar)) return; // la nueva selección trae su propio encuadre
    recordar(v, 250);
  }, [poner, recordar, cambiarNivel]);

  /** Botones + y −: acercan o alejan desde el centro, con un movimiento corto (y también cambian de nivel). */
  const zoomBoton = (f: number) => {
    const v = vistaRef.current, l = limiteRef.current, el = caja.current;
    if (!v || !l || !el || enPausa()) return;
    const destino = limitar(zoomEn(v, f, el.clientWidth / 2, el.clientHeight / 2, el.clientWidth), l, nivel === 'provincias' ? 1 : ESTIRAR);
    const r = el.getBoundingClientRect();
    if (cambiarNivel(destino, l, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, soloDedos())) return;
    animarA(destino, BOTON_MS);
    recordar(destino, BOTON_MS + 50);
  };
  const encuadrarDeNuevo = () => {
    if (!objetivo) return;
    animarA(objetivo, DURACION_MS);
    setMovido(false);
    setQuieta(null);
  };

  // Rueda del mouse (y pellizco del trackpad, que llega como rueda con Ctrl). En la computadora no acerca: hacia
  // abajo aleja hasta volver al nivel anterior; hacia arriba solo deshace ese alejamiento y, si no, mueve la página.
  // Con todo Costa Rica a la vista, la rueda hacia abajo también baja la página como siempre.
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const rueda = (e: WheelEvent) => {
      const v = vistaRef.current, l = limiteRef.current;
      if (!v || !l) return;
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      const f = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.002));
      const completo = v[2] - v[0] >= (l[2] - l[0]) * 0.999, deMas = v[2] - v[0] > (l[2] - l[0]) * 1.001;
      const acerca = soloDedos();
      if (!enPausa()) {
        if (f < 1 && nivelRef.current === 'provincias' && completo) return;
        if (f > 1 && !acerca && !deMas) return;
      }
      e.preventDefault();
      if (!acerca && f < 1 && !completo) {
        // Acercado al distrito elegido: la primera vuelta hacia abajo muestra todo el cantón, con un movimiento suave.
        if (!enPausa()) { animarA(l, DURACION_MS); recordar(l, DURACION_MS + 50); pausa.current = performance.now() + DURACION_MS; }
        return;
      }
      const r = el.getBoundingClientRect();
      aplicar(zoomEn(v, f, e.clientX - r.left, e.clientY - r.top, r.width), { x: e.clientX, y: e.clientY }, false, acerca);
    };
    el.addEventListener('wheel', rueda, { passive: false });
    return () => el.removeEventListener('wheel', rueda);
  }, [aplicar, animarA, recordar]);

  // Dedos y mouse: un puntero arrastra el mapa; dos punteros (pellizco) acercan o alejan y lo mueven.
  // Un arrastre no cuenta como toque: no elige la forma sobre la que termina.
  const recorrido = useRef(0);
  const arrastro = useRef(false);
  const [arrastrando, setArrastrando] = useState(false);
  const alBajar = (e: EventoPuntero<SVGSVGElement>) => {
    if (e.pointerType === 'mouse') return; // con el mouse el mapa no se arrastra: solo se toca
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 1) { recorrido.current = 0; arrastro.current = false; }
  };
  const alMover = (e: EventoPuntero<SVGSVGElement>) => {
    const antes = punteros.current.get(e.pointerId);
    const v = vistaRef.current, el = caja.current;
    if (!antes || !v || !el) return;
    const ahora = { x: e.clientX, y: e.clientY };
    const r = el.getBoundingClientRect();
    if (punteros.current.size === 1) {
      recorrido.current += Math.abs(ahora.x - antes.x) + Math.abs(ahora.y - antes.y);
      if (recorrido.current > 6) {
        if (!arrastro.current) {
          arrastro.current = true;
          setArrastrando(true);
          e.currentTarget.setPointerCapture(e.pointerId); // sigue aunque el puntero salga del mapa
        }
        const u = (v[2] - v[0]) / r.width;
        aplicar(mover(v, -(ahora.x - antes.x) * u, -(ahora.y - antes.y) * u));
      }
    } else if (punteros.current.size === 2) {
      const otro = [...punteros.current].find(([id]) => id !== e.pointerId)![1];
      const dAntes = Math.hypot(antes.x - otro.x, antes.y - otro.y);
      const dAhora = Math.hypot(ahora.x - otro.x, ahora.y - otro.y);
      const mAntes = { x: (antes.x + otro.x) / 2 - r.left, y: (antes.y + otro.y) / 2 - r.top };
      const mAhora = { x: (ahora.x + otro.x) / 2 - r.left, y: (ahora.y + otro.y) / 2 - r.top };
      if (!arrastro.current) {
        // El mapa retiene los dos dedos: si el pellizco cambia de nivel, la forma donde empezaron desaparece.
        for (const idp of punteros.current.keys()) try { e.currentTarget.setPointerCapture(idp); } catch { /* ya no está */ }
      }
      if (dAntes > 0) {
        // El punto que estaba entre los dedos queda entre los dedos: se acerca ahí y se mueve con ellos.
        const z = zoomEn(v, dAhora / dAntes, mAntes.x, mAntes.y, r.width);
        const u = (z[2] - z[0]) / r.width;
        aplicar(mover(z, -(mAhora.x - mAntes.x) * u, -(mAhora.y - mAntes.y) * u), { x: mAhora.x + r.left, y: mAhora.y + r.top }, true);
        arrastro.current = true;
      }
    }
    punteros.current.set(e.pointerId, ahora);
  };
  // Soltar se escucha en toda la ventana: si el dedo se levanta fuera del mapa (o sobre una forma que ya no
  // existe), el mapa igual se entera y no se queda creyendo que ese dedo sigue apoyado.
  useEffect(() => {
    const soltar = (e: PointerEvent) => {
      if (!punteros.current.delete(e.pointerId) || punteros.current.size) return;
      setArrastrando(false);
      if (arrastro.current) asentar(); // si quedó alejado sin llegar a salir, vuelve al nivel completo
    };
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
    return () => {
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
  }, [asentar]);

  // Relieve: una capa que cubre todo el cantón y, encima, capas más nítidas para el distrito elegido y para
  // lo que la persona acercó a mano. Así el fondo nunca queda vacío mientras se mueve.
  const teselas = useMemo(() => {
    if (!vistaCanton) return [];
    const base = teselasPara(vistaCanton, tam.ancho);
    const zBase = base[0]?.z ?? 0;
    const urls = new Set(base.map((ts) => ts.url));
    const extra: Tesela[] = [];
    for (const capa of [objetivo !== vistaCanton ? objetivo : null, quieta]) {
      if (!capa) continue;
      for (const ts of teselasPara(capa, tam.ancho)) if (ts.z > zBase && !urls.has(ts.url)) { urls.add(ts.url); extra.push(ts); }
    }
    return [...base, ...extra.sort((a, b) => a.z - b.z)]; // las más nítidas, arriba
  }, [vistaCanton, objetivo, quieta, tam.ancho]);

  const v = vista ?? objetivo;
  const ppu = v ? tam.ancho / (v[2] - v[0]) : 1; // píxeles por unidad del mapa
  const letra = Math.min(18, Math.max(13, tam.ancho / 60)) / ppu; // un poco más grande en mapas grandes

  const nombreProvincia = s.provincias.find((p) => p.codigo === s.provincia)?.nombre ?? '';
  const nombreCanton = s.cantones.find((c) => c.codigo === s.canton)?.nombre ?? '';
  const error = provincias.error || cantones.error || distritos.error;

  // Forma bajo el mouse (o con el foco del teclado): se levanta con sombra y su nombre sale en grande.
  const [encima, setEncima] = useState<string | null>(null);
  useEffect(() => setEncima(null), [nivel, s.provincia, s.canton]);
  const activas = nivel === 'provincias' ? provincias.formas ?? [] : nivel === 'cantones' ? cantonesProvincia : distritos.formas ?? [];
  const resaltada = encima && !arrastrando ? activas.find((f) => f.c === encima) : undefined;
  const soltar = (c: string) => setEncima((x) => (x === c ? null : x));

  const tocable = (f: Forma, elegir: (c: string) => void, clase: string, elegida = false) => ({
    d: f.d,
    className: `${clase}${elegida ? ' elegida' : ''}`,
    role: 'button',
    tabIndex: 0,
    'aria-label': f.n,
    'aria-pressed': elegida,
    'data-c': f.c, // para saber qué forma queda bajo el mouse o los dedos al acercar (cambiarNivel)
    onClick: () => elegir(f.c),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(f.c); }
    },
    // En el celular no hay "pasar por encima": el toque elige directamente.
    onPointerEnter: (e: EventoPuntero) => { if (e.pointerType !== 'touch') setEncima(f.c); },
    onPointerLeave: () => soltar(f.c),
    onFocus: () => setEncima(f.c),
    onBlur: () => soltar(f.c),
  });

  /**
   * Nombres sobre el mapa, sin que se monten: primero el distrito elegido y luego de la forma más grande a la más
   * chica; el que chocaría con uno ya puesto no se dibuja (aparece al acercar). `forzar`: mostrarlo aunque la
   * forma sea muy chica para su nombre (provincias y distrito elegido).
   */
  const etiquetas = (formas: Forma[], forzar: (f: Forma) => boolean) => {
    if (!v) return null;
    const px = letra * ppu; // tamaño de letra en píxeles
    const area = (f: Forma) => (f.caja[2] - f.caja[0]) * (f.caja[3] - f.caja[1]);
    const orden = [...formas].sort((a, b) => Number(b === elegida) - Number(a === elegida) || area(b) - area(a));
    const puestas: Caja[] = [];
    const lista = [];
    for (const f of orden) {
      if (f === resaltada) continue; // su nombre sale en grande encima del mapa
      const anchoPx = (f.caja[2] - f.caja[0]) * ppu;
      if (!forzar(f) && anchoPx < Math.max(36, f.n.length * 6)) continue; // muy chica: el nombre está en la lista
      const x = (f.etiqueta[0] - v[0]) * ppu, y = (f.etiqueta[1] - v[1]) * ppu;
      const medio = (f.n.length * px * 0.6) / 2 + 3, alto = px * 0.7;
      const caja: Caja = [x - medio, y - alto, x + medio, y + alto];
      if (f !== elegida && puestas.some((p) => caja[0] < p[2] && caja[2] > p[0] && caja[1] < p[3] && caja[3] > p[1])) continue;
      puestas.push(caja);
      lista.push(
        <text key={'t' + f.c} x={f.etiqueta[0]} y={f.etiqueta[1]} className="mapa-etiqueta" style={{ fontSize: letra, strokeWidth: 3 / ppu }}>
          {f.n}
        </text>,
      );
    }
    return lista;
  };

  const ayuda = nivel === 'provincias' ? t.mapa.toqueProvincia : nivel === 'cantones' ? t.mapa.toqueCanton : t.mapa.toqueDistrito;

  const anchoLimite = limite ? limite[2] - limite[0] : 0;
  const enLimite = !v || !limite || v[2] - v[0] >= anchoLimite * 0.999; // se ve el nivel completo
  const alMaximo = !!v && !!limite && v[2] - v[0] <= (anchoLimite / ZOOM_MAX) * 1.001;
  // Acercado a mano: un dedo mueve el mapa (en vez de bajar la página) y el cursor es una mano.
  const acercado = movido && !enLimite;

  return (
    <div className={`mapa-ubicacion${acercado ? ' acercado' : ''}${arrastrando ? ' arrastrando' : ''}`} ref={caja}>
      {v && (
        <svg
          viewBox={`${v[0]} ${v[1]} ${v[2] - v[0]} ${v[3] - v[1]}`}
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={`${t.mapa.titulo}. ${ayuda}`}
          onPointerDown={alBajar}
          onPointerMove={alMover}
          onClickCapture={(e) => { if (arrastro.current) { e.stopPropagation(); arrastro.current = false; } }}
        >
          <defs>
            {/* Sombra de la forma resaltada, en unidades del mapa para que mida lo mismo con cualquier zoom */}
            <filter id="mapa-sombra" x="-15%" y="-15%" width="130%" height="140%">
              <feDropShadow dx="0" dy={3 / ppu} stdDeviation={5 / ppu} floodColor="#000" floodOpacity="0.35" />
            </filter>
          </defs>
          {nivel === 'provincias' && provincias.formas?.map((f, i) => (
            <path key={f.c} {...tocable(f, s.elegirProvincia, `mapa-forma tono-${i % 4}`)} />
          ))}
          {nivel === 'provincias' && resaltada && <path d={resaltada.d} className="mapa-resalte" filter="url(#mapa-sombra)" aria-hidden />}
          {nivel === 'provincias' && provincias.formas && etiquetas(provincias.formas, () => true)}

          {nivel !== 'provincias' && cantones.formas?.map((f, i) => (
            nivel === 'cantones' && f.p === s.provincia
              ? <path key={f.c} {...tocable(f, s.elegirCanton, `mapa-forma tono-${i % 4}`)} />
              : <path key={f.c} d={f.d} className="mapa-forma apagada" aria-hidden />
          ))}
          {nivel === 'cantones' && resaltada && <path d={resaltada.d} className="mapa-resalte" filter="url(#mapa-sombra)" aria-hidden />}
          {nivel === 'cantones' && etiquetas(cantonesProvincia, () => false)}

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
              {resaltada && <path d={resaltada.d} className="mapa-resalte sobre-relieve" filter="url(#mapa-sombra)" aria-hidden />}
              {etiquetas(distritos.formas, (f) => f.c === s.distrito)}
            </>
          )}
        </svg>
      )}

      {/* Nombre de la forma bajo el mouse, en grande (el lector de pantalla ya lo lee de la forma) */}
      {resaltada && v && (
        <span
          key={resaltada.c}
          className="mapa-rotulo"
          style={{
            // Dentro del recuadro y debajo de las migas, aunque el centro de la forma quede fuera de la vista.
            left: Math.min(Math.max((resaltada.etiqueta[0] - v[0]) * ppu, resaltada.n.length * 6 + 30), tam.ancho - resaltada.n.length * 6 - 30),
            top: Math.min(Math.max((resaltada.etiqueta[1] - v[1]) * ppu, 84), tam.alto - 64),
          }}
          aria-hidden
        >
          {resaltada.n}
        </span>
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

      {/* Botones de zoom solo en el teléfono: en la computadora el mapa no se acerca */}
      {v && !error && soloDedos() && (
        <div className="mapa-zoom" role="group" aria-label={t.mapa.zoom}>
          <button type="button" onClick={() => zoomBoton(PASO_BOTON)} disabled={alMaximo} aria-label={t.mapa.acercar} title={t.mapa.acercar}>
            <Icono nombre="mas" tam={20} />
          </button>
          {/* Con el nivel completo a la vista, − sube un nivel; solo se apaga con todo Costa Rica a la vista */}
          <button type="button" onClick={() => zoomBoton(1 / PASO_BOTON)} disabled={enLimite && nivel === 'provincias'} aria-label={t.mapa.alejar} title={t.mapa.alejar}>
            <Icono nombre="menos" tam={20} />
          </button>
          {movido && (
            <button type="button" onClick={encuadrarDeNuevo} aria-label={t.mapa.encuadrar} title={t.mapa.encuadrar}>
              <Icono nombre="encuadrar" tam={20} />
            </button>
          )}
        </div>
      )}

      <p className="mapa-pie">
        {error ? t.mapa.error : !v || (nivel === 'distritos' && !distritos.formas) ? t.mapa.cargando : ayuda}
        {/* La pista de cómo acercar se va después de usarla una vez */}
        {v && !error && !usoZoom && (soloDedos() || nivel !== 'provincias') && (
          <><br /><small>{soloDedos() ? t.mapa.gestosDedos : t.mapa.gestosMouse}</small></>
        )}
        {nivel === 'distritos' && distritos.formas && <><br /><small>{t.mapa.fuenteRelieve}</small></>}
      </p>
    </div>
  );
}
