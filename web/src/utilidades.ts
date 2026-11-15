import { useEffect, useState } from 'react';
import { guardar, leer } from './servicios/almacen';

/** 2026-11-13 → 13-11-2026 */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}-${m}-${a}`;
}

export const colones = (n: number) => '₡' + Math.round(n).toLocaleString('es-CR');

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

export const hoy = () => new Date().toISOString().slice(0, 10);

/** Carga datos asíncronos con estado de carga y error. */
export function useCargar<T>(cargar: () => Promise<T>, deps: unknown[]) {
  const [estado, setEstado] = useState<{ datos: T | null; cargando: boolean; error: string | null }>({ datos: null, cargando: true, error: null });
  const [vuelta, setVuelta] = useState(0);
  useEffect(() => {
    let vivo = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    cargar()
      .then((d) => vivo && setEstado({ datos: d, cargando: false, error: null }))
      .catch((e: Error) => vivo && setEstado({ datos: null, cargando: false, error: e.message }));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, vuelta]);
  return { ...estado, recargar: () => setVuelta((v) => v + 1) };
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
