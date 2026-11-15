// Acceso seguro a localStorage: si el navegador lo bloquea, la app sigue funcionando
// (solo se pierde lo guardado al recargar).
const memoria = new Map<string, string>();

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const v = localStorage.getItem(clave);
    if (v !== null) return JSON.parse(v) as T;
  } catch {
    const v = memoria.get(clave);
    if (v !== undefined) return JSON.parse(v) as T;
  }
  return porDefecto;
}

export function guardar<T>(clave: string, valor: T): void {
  const texto = JSON.stringify(valor);
  memoria.set(clave, texto);
  try {
    localStorage.setItem(clave, texto);
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
}

export function borrar(clave: string): void {
  memoria.delete(clave);
  try {
    localStorage.removeItem(clave);
  } catch {
    /* nada */
  }
}

export const nuevoId = () => Math.random().toString(36).slice(2, 10);
