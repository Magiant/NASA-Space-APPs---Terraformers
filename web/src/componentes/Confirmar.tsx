// Ventana propia de "¿Está seguro?" para las acciones que no se pueden deshacer.
//
// No se usa window.confirm(): dentro de la app de iPhone (WKWebView) ese cuadro no aparece si la app no lo
// programa aparte, y en Android sale con el estilo del sistema. Esta ventana se ve igual en la web, en Android y
// en iPhone, en los dos temas y en los dos idiomas.
//
//   const confirmar = useConfirmar();
//   if (await confirmar({ titulo: '¿Cerrar sesión?', aceptar: 'Cerrar sesión', tono: 'peligro' })) { … }
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../contexto/PreferenciasContext';
import { Icono, type NombreIcono } from './Iconos';

export interface OpcionesConfirmar {
  titulo: string;
  texto?: ReactNode;
  aceptar: string;
  cancelar?: string;
  /** 'peligro': no se puede deshacer. Botón rojo, y el foco empieza en "Cancelar" para no aceptar sin querer. */
  tono?: 'peligro' | 'normal';
  icono?: NombreIcono;
}

type Confirmar = (o: OpcionesConfirmar) => Promise<boolean>;
type Pedido = OpcionesConfirmar & { responder: (ok: boolean) => void };

const Contexto = createContext<Confirmar | null>(null);

export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const confirmar = useCallback<Confirmar>((o) => new Promise((responder) => setPedido({ ...o, responder })), []);
  const cerrar = (ok: boolean) => {
    pedido?.responder(ok);
    setPedido(null);
  };
  return (
    <Contexto.Provider value={confirmar}>
      {children}
      {pedido && <VentanaConfirmar pedido={pedido} cerrar={cerrar} />}
    </Contexto.Provider>
  );
}

export function useConfirmar(): Confirmar {
  const c = useContext(Contexto);
  if (!c) throw new Error('useConfirmar() necesita <ConfirmarProvider> (App.tsx)');
  return c;
}

function VentanaConfirmar({ pedido, cerrar }: { pedido: Pedido; cerrar: (ok: boolean) => void }) {
  const t = useT();
  const ventana = useRef<HTMLDialogElement>(null);
  const botonCancelar = useRef<HTMLButtonElement>(null);
  const botonAceptar = useRef<HTMLButtonElement>(null);
  const peligro = pedido.tono === 'peligro';

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const d = ventana.current!;
    if (!d.open) d.showModal(); // modal de verdad: bloquea el resto de la página y el lector de pantalla
    (peligro ? botonCancelar : botonAceptar).current?.focus();
    return () => anterior?.focus?.(); // al cerrar, el foco vuelve a donde estaba
  }, [peligro]);

  return (
    <dialog
      ref={ventana}
      className={`confirmar${peligro ? ' confirmar-peligro' : ''}`}
      aria-labelledby="confirmar-titulo"
      aria-describedby={pedido.texto ? 'confirmar-texto' : undefined}
      // Esc y tocar fuera de la caja equivalen a "Cancelar".
      onCancel={(e) => { e.preventDefault(); cerrar(false); }}
      onClick={(e) => { if (e.target === ventana.current) cerrar(false); }}
    >
      <div className="confirmar-caja">
        <span className="confirmar-icono" aria-hidden>
          <Icono nombre={pedido.icono ?? (peligro ? 'alertas' : 'pregunta')} tam={26} />
        </span>
        <h2 id="confirmar-titulo">{pedido.titulo}</h2>
        {pedido.texto && <div id="confirmar-texto" className="confirmar-texto">{pedido.texto}</div>}
        <div className="confirmar-botones">
          <button ref={botonCancelar} type="button" className="boton boton-secundario" onClick={() => cerrar(false)}>
            {pedido.cancelar ?? t.confirmar.cancelar}
          </button>
          <button ref={botonAceptar} type="button" className={`boton${peligro ? ' boton-peligro' : ''}`} onClick={() => cerrar(true)}>
            {pedido.aceptar}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * Formulario con cambios sin guardar: antes de salir pregunta "¿Salir sin guardar?".
 * Cubre los enlaces de la app (pestañas, menú, "Volver al inicio"…) y cerrar o recargar la página.
 * No cubre las pestañas nativas de las apps de Android e iPhone (cambian la dirección sin pasar por un enlace).
 */
export function useAvisoSinGuardar(sucio: boolean) {
  const confirmar = useConfirmar();
  const navegar = useNavigate();
  const t = useT();

  useEffect(() => {
    if (!sucio) return;
    const antesDeSalir = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // el navegador muestra su propio aviso (no deja poner texto)
    };
    const alTocar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as Element | null)?.closest?.('a');
      const destino = enlace?.getAttribute('href');
      // Solo los enlaces internos (HashRouter: "#/ruta") y que no abren otra pestaña.
      if (!enlace || !destino?.startsWith('#/') || enlace.target === '_blank') return;
      e.preventDefault();
      e.stopPropagation(); // que el enlace no navegue mientras se pregunta
      const ts = t.confirmar.sinGuardar;
      confirmar({ titulo: ts.titulo, texto: ts.texto, aceptar: ts.aceptar, cancelar: ts.seguir, tono: 'peligro', icono: 'nota' })
        .then((ok) => { if (ok) navegar(destino.slice(1)); });
    };
    window.addEventListener('beforeunload', antesDeSalir);
    document.addEventListener('click', alTocar, true); // en captura: antes que el enlace
    return () => {
      window.removeEventListener('beforeunload', antesDeSalir);
      document.removeEventListener('click', alTocar, true);
    };
  }, [sucio, confirmar, navegar, t]);
}
