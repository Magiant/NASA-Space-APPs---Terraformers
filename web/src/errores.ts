// Errores con código: los servicios dicen QUÉ pasó (sin conexión, sin permiso, contraseña incorrecta…) y la pantalla
// lo cuenta en el idioma de la persona. El detalle técnico del servidor solo va a la consola, nunca a la pantalla.
import { es, type Textos } from './idiomas/es';

export type CodigoError = keyof Textos['errores'];
type Valores = Record<string, string | number>;

/** Error que la pantalla sabe traducir (el mensaje queda en español por si algo lo muestra directo). */
export class ErrorApp extends Error {
  constructor(public codigo: CodigoError, public valores: Valores = {}) {
    super(texto(es, codigo, valores));
  }
}

function texto(t: Textos, codigo: CodigoError, v: Valores): string {
  const m = t.errores[codigo] as string | ((v: Valores) => string);
  return typeof m === 'function' ? m(v) : m;
}

/** Qué clase de falla es, según el mensaje (en inglés) que devuelve el servidor o el navegador. */
// Correccion - Poll: la base ahora rechaza siembras que no caben en la finca (migracion 020); ese rechazo salia como
// "No se pudo completar" y ahora se explica.
export function clasificar(mensaje: string): CodigoError {
  if (/finca_sin_espacio/.test(mensaje)) return 'finca_sin_espacio';
  if (/failed to fetch|network|load failed|fetch failed|timeout/i.test(mensaje)) return 'sin_conexion';
  if (/row-level security|permission denied|not authorized|jwt/i.test(mensaje)) return 'permiso';
  return 'servidor';
}

/** Error de la base: deja el detalle en la consola y lanza uno con código. */
export function errorServidor(que: string, detalle: unknown): ErrorApp {
  const m = detalle instanceof Error ? detalle.message : String((detalle as { message?: string })?.message ?? detalle);
  console.error(`${que}:`, detalle);
  return new ErrorApp(clasificar(m));
}

/** El texto que ve la persona, en su idioma. Sirve para cualquier error, tenga código o no. */
export function mensajeError(t: Textos, e: unknown): string {
  if (e instanceof ErrorApp || (e && typeof e === 'object' && 'codigo' in e && (e as ErrorApp).codigo in t.errores)) {
    const x = e as ErrorApp;
    return texto(t, x.codigo, x.valores ?? {});
  }
  const m = e instanceof Error ? e.message : String(e);
  const c = clasificar(m);
  // Un error sin código que no es de red ni de permisos: es un texto propio de la app (modo demo) o algo inesperado.
  if (c !== 'servidor') return texto(t, c, {});
  if (e instanceof TypeError || /^[A-Za-z]+Error\b/.test(m)) {
    console.error(e);
    return texto(t, 'servidor', {});
  }
  return m;
}
