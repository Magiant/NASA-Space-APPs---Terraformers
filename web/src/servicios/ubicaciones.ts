// Provincias, cantones y distritos de Costa Rica (los 492, códigos HDX/INEC: CR3, CR301, CR30101).
//
// De dónde salen, en orden:
//   0. El catálogo que la app ya cargó de Supabase al abrir (servicios/algolia.ts → prepararCatalogo).
//   1. Memoria y copia guardada en el celular (sirve sin señal).
//   2. Supabase: tabla pública `distritos` (tema 0), con la llave pública VITE_SUPABASE_ANON_KEY.
//   3. Respaldo: ./mapas/ubicaciones.json, generado de la misma fuente (extractores/scripts/mapas-web.ts).
// La web solo lee: nunca escribe en `distritos`.
import { useEffect, useState } from 'react';
import { catalogo } from './algolia';
import { guardar, leer } from './almacen';

export interface Ubicacion {
  codigo_distrito: string;
  distrito: string;
  codigo_canton: string;
  canton: string;
  codigo_provincia: string;
  provincia: string;
  lat: number;
  lng: number;
}

const CLAVE = 'tf-ubicaciones-v1';
const VIGENCIA_MS = 30 * 24 * 3600 * 1000; // los límites casi nunca cambian
const COLUMNAS = 'codigo_distrito,distrito,codigo_canton,canton,codigo_provincia,provincia,lat,lng';
const TOTAL = 492;

let enMemoria: Ubicacion[] | null = null;
let pendiente: Promise<Ubicacion[]> | null = null;

async function conLimite(url: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: control.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } finally {
    clearTimeout(reloj);
  }
}

async function desdeSupabase(): Promise<Ubicacion[]> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const llave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !llave) throw new Error('Supabase sin configurar');
  const r = await conLimite(`${url}/rest/v1/distritos?select=${COLUMNAS}&order=codigo_distrito`, {
    headers: { apikey: llave, Authorization: `Bearer ${llave}` },
  });
  const filas = (await r.json()) as Ubicacion[];
  if (filas.length !== TOTAL) throw new Error(`Supabase devolvió ${filas.length} distritos`);
  return filas;
}

async function desdeRespaldo(): Promise<Ubicacion[]> {
  const r = await conLimite('./mapas/ubicaciones.json');
  const { columnas, filas } = (await r.json()) as { columnas: (keyof Ubicacion)[]; filas: unknown[][] };
  return filas.map((f) => Object.fromEntries(columnas.map((c, i) => [c, f[i]])) as unknown as Ubicacion);
}

/** Si la app ya cargó los 492 distritos al abrir (prepararCatalogo), se usan esos: sin pedirlos otra vez. */
function desdeCatalogo(): Ubicacion[] | null {
  const zonas = catalogo.zonas;
  if (zonas.length !== TOTAL) return null;
  // Los códigos de cantón y provincia son el inicio del código del distrito: CR30101 → CR301 → CR3.
  return zonas.map((z) => ({
    codigo_distrito: z.codigo_distrito, distrito: z.distrito,
    codigo_canton: z.codigo_distrito.slice(0, 5), canton: z.canton,
    codigo_provincia: z.codigo_distrito.slice(0, 3), provincia: z.provincia,
    lat: z._geoloc.lat, lng: z._geoloc.lng,
  }));
}

/** Los 492 distritos. Se piden una sola vez por visita. */
export function cargarUbicaciones(): Promise<Ubicacion[]> {
  if (enMemoria) return Promise.resolve(enMemoria);
  const delCatalogo = desdeCatalogo();
  if (delCatalogo) {
    enMemoria = delCatalogo;
    return Promise.resolve(enMemoria);
  }
  const guardado = leer<{ fecha: number; lista: Ubicacion[] } | null>(CLAVE, null);
  if (guardado && guardado.lista.length === TOTAL && Date.now() - guardado.fecha < VIGENCIA_MS) {
    enMemoria = guardado.lista;
    return Promise.resolve(enMemoria);
  }
  pendiente ??= desdeSupabase()
    .catch(() => desdeRespaldo())
    .then((lista) => {
      enMemoria = lista;
      guardar(CLAVE, { fecha: Date.now(), lista });
      return lista;
    })
    .catch((e) => {
      pendiente = null; // permitir reintentar
      if (guardado?.lista.length) return guardado.lista; // vencida, pero mejor que nada
      throw e;
    });
  return pendiente;
}

/** Distrito por código, si ya está cargada la lista (para mostrar nombres sin esperar). */
export function ubicacion(codigo: string | null | undefined): Ubicacion | undefined {
  return codigo ? enMemoria?.find((u) => u.codigo_distrito === codigo) : undefined;
}

/** El distrito cuyo punto representativo está más cerca de unas coordenadas (GPS). */
export function masCercana(lista: Ubicacion[], lat: number, lng: number): Ubicacion {
  const k = Math.cos((lat * Math.PI) / 180);
  const d = (u: Ubicacion) => ((u.lng - lng) * k) ** 2 + (u.lat - lat) ** 2;
  return lista.reduce((a, b) => (d(b) < d(a) ? b : a));
}

// Correccion - Poll: "Intentar de nuevo" recargaba toda la pagina y en Registrarse se perdia lo escrito; ahora vuelve a
// pedir solo la lista de lugares.
export function useUbicaciones() {
  const [estado, setEstado] = useState<{ lista: Ubicacion[]; cargando: boolean; error: boolean }>(() => ({
    lista: enMemoria ?? [], cargando: !enMemoria, error: false,
  }));
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    // Otro componente pudo cargarla entre el primer dibujo y este efecto: tomarla ya.
    if (enMemoria) {
      const lista = enMemoria;
      setEstado((e) => (e.lista === lista ? e : { lista, cargando: false, error: false }));
      return;
    }
    let vivo = true;
    if (intento) setEstado((e) => ({ ...e, cargando: true, error: false }));
    cargarUbicaciones()
      .then((lista) => vivo && setEstado({ lista, cargando: false, error: false }))
      .catch(() => vivo && setEstado({ lista: [], cargando: false, error: true }));
    return () => {
      vivo = false;
    };
  }, [intento]);
  return { ...estado, reintentar: () => setIntento((n) => n + 1) };
}
