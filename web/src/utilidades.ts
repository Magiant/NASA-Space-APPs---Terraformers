import { useEffect, useState } from 'react';
import { borrar, guardar, leer } from './servicios/almacen';
import type { Finca, FuenteAgua } from './tipos';
import { useT } from './contexto/PreferenciasContext';
import { mensajeError } from './errores';

/** 2026-11-13 → 13-11-2026 */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}-${m}-${a}`;
}

export const colones = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR');

/** Un número como se escribe en el idioma actual: numero(19.5, 'es-CR') → "19,5"; en inglés "19.5". */
export const numero = (n: number, locale: string, max = 1) => n.toLocaleString(locale, { maximumFractionDigits: max });

/** Nombre del mes (1–12) en el idioma actual: mes(t, 5) → "mayo" / "May". */
export const mes = (t: { meses: string[] }, n: number | null | undefined) => (n ? t.meses[n - 1] : '—');

/** Nombre del cultivo o plaga en el idioma actual; si no hay traducción, el de la base. */
export const nombreCultivo = (t: { cultivos: Record<string, string> }, id: string, respaldo = id) => t.cultivos[id] ?? respaldo;
export const nombrePlaga = (t: { plagas: Record<string, string> }, id: string, respaldo = id) => t.plagas[id] ?? respaldo;

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Correccion - Poll: la fecha de hoy salia en hora UTC: de 6 p. m. a medianoche en Costa Rica daba la de manana, y asi
// se guardaban siembras, reportes y cierres. Ahora usa la hora del telefono (en-CA da el formato AAAA-MM-DD).
export const hoy = () => new Date().toLocaleDateString('en-CA');

/** Carga datos asíncronos con estado de carga y error. */
// Correccion - Poll: el error que veia la persona era el mensaje crudo ("Leer fincas: TypeError: Failed to fetch");
// ahora es el texto del codigo de error en su idioma (errores.ts), con lo que puede hacer.
// Correccion - Poll: sin senal, Precios, Alertas, Cursos y Mi finca fallaban aunque se hubieran visto un rato antes
// (el service worker solo guarda archivos de la propia pagina, no los datos). Con `copia`, cada carga buena se guarda
// en el telefono y, si despues no hay senal, se muestra esa copia con su fecha (guardadoEl).
export function useCargar<T>(cargar: () => Promise<T>, deps: unknown[], copia?: string) {
  const t = useT();
  const [estado, setEstado] = useState<{ datos: T | null; cargando: boolean; error: string | null; guardadoEl: number | null }>(
    { datos: null, cargando: true, error: null, guardadoEl: null },
  );
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    cargar()
      .then((d) => {
        if (copia && d !== null && d !== undefined) guardar(copia, { fecha: Date.now(), datos: d });
        if (vivo) setEstado({ datos: d, cargando: false, error: null, guardadoEl: null });
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        const guardada = copia ? leer<{ fecha: number; datos: T } | null>(copia, null) : null;
        const sinSenal = (e as { codigo?: string })?.codigo === 'sin_conexion' || !navigator.onLine;
        if (guardada && sinSenal) setEstado({ datos: guardada.datos, cargando: false, error: null, guardadoEl: guardada.fecha });
        else setEstado({ datos: null, cargando: false, error: mensajeError(t, e), guardadoEl: null });
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, vuelta]);
  return { ...estado, recargar: () => setVuelta((v) => v + 1) };
}

/** Un dato del catálogo (riesgo, suelo, familia, tema) en el idioma de la app; si no hay traducción, tal cual. */
export const traducirDato = (t: { datos: Record<string, string> }, valor: string) => t.datos[valor] ?? valor;

/** Prefijo de las copias de datos PRIVADOS: se borran al salir de la cuenta (copiaPrivada / borrarCopiasPrivadas). */
const PREFIJO_PRIVADO = 'tf-copia-priv-';
export const copiaPrivada = (usuarioId: string | undefined, que: string) => (usuarioId ? `${PREFIJO_PRIVADO}${usuarioId}-${que}` : undefined);
export function borrarCopiasPrivadas(): void {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith(PREFIJO_PRIVADO)).forEach((k) => borrar(k));
  } catch {
    /* sin almacenamiento: no hay copias */
  }
}

/** ¿Hay conexión a internet? */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  useEffect(() => {
    const si = () => setEnLinea(true);
    const no = () => setEnLinea(false);
    window.addEventListener('online', si);
    window.addEventListener('offline', no);
    return () => {
      window.removeEventListener('online', si);
      window.removeEventListener('offline', no);
    };
  }, []);
  return enLinea;
}

const CLAVE_ZONA = 'tf-zona-elegida';

/** Distrito elegido en Inicio; se recuerda en el celular. */
export function useZonaElegida(): [string | null, (codigo: string | null) => void] {
  const [codigo, setCodigo] = useState<string | null>(() => leer<string | null>(CLAVE_ZONA, null));
  const cambiar = (c: string | null) => {
    setCodigo(c);
    guardar(CLAVE_ZONA, c);
  };
  return [codigo, cambiar];
}

/** Fuentes de agua de una finca: todas las marcadas, o la única que tenían las fincas de antes. */
export function fuentesDeAgua(f: Pick<Finca, 'fuente_agua' | 'fuentes_agua'>): FuenteAgua[] {
  return f.fuentes_agua?.length ? f.fuentes_agua : [f.fuente_agua];
}

// Correccion - Poll: el precio decía solo "Java" debajo del producto y no se entendía que es la unidad de venta (la caja
// de madera del CENADA). Ahora se lee "por java (caja de madera)", "por kilo", "por caja plástica (18 kg)"…
/** Unidad de venta de un precio, lista para leer después del precio: "por kilo". */
// Correccion - Poll: se leia "por saco 45 kg" o "por rollo 12 manojos" (y en ingles "per caja 18 kg"); ahora una
// unidad con envase, cantidad y medida se escribe completa: "por saco de 45 kg" / "per 45 kg sack".
export function porUnidad(
  t: { tarjeta: { por: string; java: string; envases: Record<string, string>; medidas: Record<string, string>; unidadCompuesta: (envase: string, n: string, medida: string) => string } },
  unidad: string,
): string {
  const u = unidad.trim().toLowerCase();
  if (u === 'java') return `${t.tarjeta.por} ${t.tarjeta.java}`;
  const m = u.match(/^([a-záéíóúñ]+) (\d[\d.,]*) (.+)$/);
  if (!m) return `${t.tarjeta.por} ${t.tarjeta.envases[u] ?? u}`;
  const [, envase, n, medida] = m;
  return `${t.tarjeta.por} ${t.tarjeta.unidadCompuesta(t.tarjeta.envases[envase] ?? envase, n, t.tarjeta.medidas[medida] ?? medida)}`;
}
