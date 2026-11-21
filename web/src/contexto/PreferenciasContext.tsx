import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { IDIOMAS, type Idioma, type Textos } from '../idiomas';
import { guardar, leer } from '../servicios/almacen';

export type Tema = 'crema' | 'azul';

interface ValorPreferencias {
  idioma: Idioma;
  tema: Tema;
  t: Textos;
  cambiarIdioma: (i: Idioma) => void;
  cambiarTema: (t: Tema) => void;
}

const CLAVE_IDIOMA = 'tf-idioma';
const CLAVE_TEMA = 'tf-tema';

const Contexto = createContext<ValorPreferencias | null>(null);

// Correccion - Poll: antes la web abría en inglés si el navegador o el teléfono estaban en inglés. Ahora siempre
// abre en español; solo cambia si la persona elige English en Ajustes (esa elección se guarda en el teléfono).
function idiomaInicial(): Idioma {
  const guardado = leer<Idioma | null>(CLAVE_IDIOMA, null);
  if (guardado && guardado in IDIOMAS) return guardado;
  return 'es';
}

function temaInicial(): Tema {
  const guardado = leer<Tema | null>(CLAVE_TEMA, null);
  if (guardado === 'crema' || guardado === 'azul') return guardado;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'azul' : 'crema';
}

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial);
  const [tema, setTema] = useState<Tema>(temaInicial);

  // El tema y el idioma se aplican en <html> para que el CSS y los lectores de pantalla los usen.
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'azul' ? '#0b1120' : '#f7f2e7');
  }, [tema]);

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  // Cambios hechos en otra pestaña de la app de iPhone (o en otra pestaña del navegador): aplicarlos aquí también.
  useEffect(() => {
    const aplicar = (d: { idioma?: unknown; tema?: unknown }) => {
      if (typeof d.idioma === 'string' && d.idioma in IDIOMAS) setIdioma(d.idioma as Idioma);
      if (d.tema === 'crema' || d.tema === 'azul') setTema(d.tema);
    };
    const desdeApp = (e: Event) => aplicar((e as CustomEvent).detail ?? {});
    const desdeOtraPestana = (e: StorageEvent) => {
      if (e.key !== CLAVE_IDIOMA && e.key !== CLAVE_TEMA) return;
      aplicar({ idioma: leer<Idioma | null>(CLAVE_IDIOMA, null), tema: leer<Tema | null>(CLAVE_TEMA, null) });
    };
    window.addEventListener('tf-preferencias', desdeApp);
    window.addEventListener('storage', desdeOtraPestana);
    return () => {
      window.removeEventListener('tf-preferencias', desdeApp);
      window.removeEventListener('storage', desdeOtraPestana);
    };
  }, []);

  // Dentro de las apps de iPhone y Android: avisa a la parte nativa para que la barra de pestañas use el
  // mismo idioma y tema. iOS recibe un objeto (WKScriptMessageHandler); Android, texto JSON (WebMessageListener).
  useEffect(() => {
    const w = window as unknown as {
      webkit?: { messageHandlers?: { preferencias?: { postMessage: (m: unknown) => void } } };
      preferencias?: { postMessage?: (m: string) => void };
    };
    w.webkit?.messageHandlers?.preferencias?.postMessage({ idioma, tema });
    w.preferencias?.postMessage?.(JSON.stringify({ idioma, tema }));
  }, [idioma, tema]);

  const cambiarIdioma = useCallback((i: Idioma) => {
    setIdioma(i);
    guardar(CLAVE_IDIOMA, i);
  }, []);

  const cambiarTema = useCallback((t: Tema) => {
    setTema(t);
    guardar(CLAVE_TEMA, t);
  }, []);

  const valor = useMemo(
    () => ({ idioma, tema, t: IDIOMAS[idioma], cambiarIdioma, cambiarTema }),
    [idioma, tema, cambiarIdioma, cambiarTema],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePreferencias(): ValorPreferencias {
  const v = useContext(Contexto);
  if (!v) throw new Error('usePreferencias debe usarse dentro de <PreferenciasProvider>');
  return v;
}

/** Atajo: los textos del idioma actual. */
export const useT = () => usePreferencias().t;
