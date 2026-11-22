// Cliente de Supabase para la web. Usa SOLO llaves públicas (VITE_*): la llave anon está protegida
// por las reglas RLS de la base (cada usuario ve solo lo suyo; los datos extraídos son de lectura pública).
// Sin estas variables (por ejemplo, una copia local sin .env), la web funciona en modo demo con datos de ejemplo.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Dirección pública de la página (GitHub Pages). Los correos de Supabase (confirmar la cuenta) llevan aquí: no a la
 * dirección desde donde se creó la cuenta, que en la app de Android o en una computadora de pruebas no se abre.
 */
export const SITIO_PUBLICO = (import.meta.env.VITE_SITIO_URL as string | undefined) || 'https://magiant.github.io/TerraFarm/';

/** true = base real de Supabase; false = datos de ejemplo guardados en el navegador. */
export const modoReal = Boolean(url && llave);

export const supa: SupabaseClient | null = modoReal
  ? createClient(url!, llave!, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tf-auth' } })
  : null;

/** Devuelve los datos o lanza un error con un mensaje entendible. */
export function datosDe<T>(r: { data: T | null; error: { message: string } | null }, que: string): T {
  if (r.error) throw new Error(`${que}: ${r.error.message}`);
  return r.data as T;
}
