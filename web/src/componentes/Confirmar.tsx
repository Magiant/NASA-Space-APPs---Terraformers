// Ventanas flotantes de la app: "¿Está seguro?" (confirmar) y los avisos con botón "Aceptar" (avisar).
//
// No se usan window.confirm() ni window.alert(): dentro de la app de iPhone (WKWebView) esos cuadros no aparecen
// si la app no los programa aparte, y en Android salen con el estilo del sistema. Estas ventanas se ven igual en la
// web, en Android y en iPhone, en los dos temas y en los dos idiomas.
//
//   const confirmar = useConfirmar();
//   if (await confirmar({ titulo: '¿Cerrar sesión?', aceptar: 'Cerrar sesión', tono: 'peligro' })) { … }
//
//   const avisar = useAvisar();
//   await avisar({ titulo: 'No se pudo guardar', texto: mensaje, tono: 'error' });             // solo "Aceptar"
//   const r = await avisar({ titulo, texto, acciones: [{ id: 'otra', texto: 'Crear una cuenta' }, …] });
//
// Además, los datos que el navegador marca como inválidos al enviar un formulario (falta llenar, número muy grande,
// correo mal escrito…) se explican en una de estas ventanas en vez del globito del navegador.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../contexto/PreferenciasContext';
import type { Textos } from '../idiomas';
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

export interface AccionAviso {
  id: string;
  texto: string;
  /** El botón verde (el que recibe el foco). Si ninguno lo es, el último. */
  principal?: boolean;
}

export interface OpcionesAviso {
  titulo: string;
  texto?: ReactNode;
  tono?: 'error' | 'exito' | 'info';
  icono?: NombreIcono;
  /** Botones. Sin ellos, uno solo: "Aceptar". */
  acciones?: AccionAviso[];
  /** Ventana más ancha y con desplazamiento, para leer textos largos (un aviso del IMN completo). */
  amplio?: boolean;
}

type Confirmar = (o: OpcionesConfirmar) => Promise<boolean>;
/** Responde el id del botón tocado: 'aceptar' si solo había ese, 'cerrar' si se cerró con Esc o tocando fuera. */
type Avisar = (o: OpcionesAviso) => Promise<string>;
type Pedido =
  | (OpcionesConfirmar & { id: number; tipo: 'confirmar'; responder: (ok: boolean) => void })
  | (OpcionesAviso & { id: number; tipo: 'aviso'; responder: (accion: string) => void });
let ultimoPedido = 0;

const Contexto = createContext<{ confirmar: Confirmar; avisar: Avisar } | null>(null);

/** Nombre del campo, tal como se ve en pantalla: el texto de su etiqueta (o la pregunta del grupo de opciones). */
function nombreDelCampo(el: HTMLInputElement): string {
  const grupo = el.type === 'radio' || el.type === 'checkbox' ? el.closest('fieldset')?.querySelector('legend') : null;
  if (grupo?.textContent?.trim()) return grupo.textContent.replace(/\s+/g, ' ').trim();
  const etiqueta = el.labels?.[0];
  if (etiqueta) {
    const copia = etiqueta.cloneNode(true) as HTMLElement;
    copia.querySelectorAll('input, select, textarea, small, button, .ayuda').forEach((n) => n.remove());
    const texto = copia.textContent?.replace(/\s+/g, ' ').trim();
    if (texto) return texto;
  }
  return el.getAttribute('aria-label') ?? el.placeholder ?? '';
}

/** Qué está mal en un campo que el navegador rechazó, en palabras simples. `data-aviso` en el campo manda. */
function mensajeDelCampo(el: HTMLInputElement, t: Textos): string {
  const tc = t.avisos.campo;
  if (el.dataset.aviso) return el.dataset.aviso;
  const n = nombreDelCampo(el);
  const v = el.validity;
  if (v.valueMissing) return el.tagName === 'SELECT' || el.type === 'radio' ? tc.elegir(n) : el.type === 'file' ? tc.archivo(n) : tc.falta(n);
  if (v.badInput) return tc.numero(n);
  if (v.typeMismatch) return el.type === 'email' ? tc.correo(n) : tc.formato(n);
  if (v.rangeOverflow) return tc.maximo(n, el.max);
  if (v.rangeUnderflow) return tc.minimo(n, el.min);
  if (v.tooShort) return tc.corto(n, el.minLength);
  if (v.tooLong) return tc.largo(n, el.maxLength);
  if (v.stepMismatch) return tc.decimales(n);
  return el.title || tc.formato(n);
}

export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const t = useT();
  // Una ventana a la vez: si llega otra mientras hay una abierta, espera su turno.
  const [cola, setCola] = useState<Pedido[]>([]);
  const confirmar = useCallback<Confirmar>((o) => new Promise((responder) => setCola((c) => [...c, { ...o, id: ++ultimoPedido, tipo: 'confirmar', responder }])), []);
  const avisar = useCallback<Avisar>((o) => new Promise((responder) => setCola((c) => [...c, { ...o, id: ++ultimoPedido, tipo: 'aviso', responder }])), []);
  const cerrar = (respuesta: boolean | string) => {
    const p = cola[0];
    if (p?.tipo === 'confirmar') p.responder(respuesta === true);
    else if (p) p.responder(typeof respuesta === 'string' ? respuesta : 'cerrar');
    setCola((c) => c.slice(1));
  };

  // Datos inválidos al enviar un formulario: en vez del globito del navegador (que no explica nada y en el
  // celular casi no se ve), una ventana que dice qué revisar; al aceptar, el cursor queda en ese campo.
  const tRef = useRef(t);
  tRef.current = t;
  useEffect(() => {
    let ultimo = 0;
    const alInvalido = (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (!(el instanceof HTMLElement) || !('validity' in el)) return;
      e.preventDefault();
      // El navegador avisa de cada campo inválido; se explica solo el primero de cada envío.
      if (Date.now() - ultimo < 500) return;
      ultimo = Date.now();
      const ta = tRef.current.avisos;
      avisar({ titulo: ta.revisarDato, texto: mensajeDelCampo(el, tRef.current), tono: 'error', icono: 'nota' }).then(() => el.focus());
    };
    document.addEventListener('invalid', alInvalido, true); // "invalid" no sube: se escucha en captura
    return () => document.removeEventListener('invalid', alInvalido, true);
  }, [avisar]);

  return (
    <Contexto.Provider value={{ confirmar, avisar }}>
      {children}
      {cola[0] && <Ventana key={cola[0].id} pedido={cola[0]} cerrar={cerrar} />}
    </Contexto.Provider>
  );
}

function useContexto() {
  const c = useContext(Contexto);
  if (!c) throw new Error('useConfirmar() y useAvisar() necesitan <ConfirmarProvider> (App.tsx)');
  return c;
}

export const useConfirmar = (): Confirmar => useContexto().confirmar;
export const useAvisar = (): Avisar => useContexto().avisar;

function Ventana({ pedido, cerrar }: { pedido: Pedido; cerrar: (respuesta: boolean | string) => void }) {
  const t = useT();
  const ventana = useRef<HTMLDialogElement>(null);
  const botonInicial = useRef<HTMLButtonElement>(null);
  const aviso = pedido.tipo === 'aviso';
  // Primero se cierra la ventana (deja de bloquear la página) y después se responde: así quien la abrió puede poner
  // el cursor en otro campo apenas recibe la respuesta.
  const responder = (r: boolean | string) => {
    ventana.current?.close();
    cerrar(r);
  };
  const peligro = aviso ? pedido.tono === 'error' : pedido.tono === 'peligro';

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const d = ventana.current!;
    if (!d.open) d.showModal(); // modal de verdad: bloquea el resto de la página y el lector de pantalla
    botonInicial.current?.focus();
    // Al cerrar, el foco vuelve a donde estaba; salvo que quien abrió la ventana ya lo haya puesto en otro lado
    // (por ejemplo, en el campo que hay que corregir).
    return () => {
      const actual = document.activeElement;
      if (!actual || actual === document.body || d.contains(actual)) anterior?.focus?.();
    };
  }, []);

  // Botones: en "¿Está seguro?", Cancelar + la acción (en peligro el foco empieza en Cancelar). En un aviso, los
  // que pida (o solo Aceptar); el verde es el principal, y en el celular queda arriba (ver .confirmar-botones).
  const acciones: (AccionAviso & { respuesta: boolean | string; clase: string })[] = aviso
    ? (() => {
        const lista = pedido.acciones?.length ? pedido.acciones : [{ id: 'aceptar', texto: t.confirmar.aceptar, principal: true }];
        const principal = lista.find((a) => a.principal) ?? lista[lista.length - 1];
        return [...lista.filter((a) => a !== principal), principal].map((a) => ({
          ...a, respuesta: a.id, clase: a === principal ? 'boton' : 'boton boton-secundario',
        }));
      })()
    : [
        { id: 'cancelar', texto: pedido.cancelar ?? t.confirmar.cancelar, respuesta: false, clase: 'boton boton-secundario' },
        { id: 'aceptar', texto: pedido.aceptar, respuesta: true, clase: `boton${peligro ? ' boton-peligro' : ''}` },
      ];
  const inicial = aviso || !peligro ? acciones[acciones.length - 1].id : 'cancelar';
  const iconoPorDefecto: NombreIcono = aviso
    ? pedido.tono === 'error' ? 'alertas' : pedido.tono === 'exito' ? 'check' : 'pregunta'
    : peligro ? 'alertas' : 'pregunta';
  const clases = [
    'confirmar',
    peligro && 'confirmar-peligro',
    aviso && pedido.tono === 'info' && 'confirmar-info',
    aviso && pedido.amplio && 'confirmar-amplio',
  ].filter(Boolean).join(' ');

  return (
    <dialog
      ref={ventana}
      className={clases}
      aria-labelledby="confirmar-titulo"
      aria-describedby={pedido.texto ? 'confirmar-texto' : undefined}
      // Esc y tocar fuera de la caja: "Cancelar" en una confirmación; cerrar en un aviso.
      onCancel={(e) => { e.preventDefault(); responder(aviso ? 'cerrar' : false); }}
      onClick={(e) => { if (e.target === ventana.current) responder(aviso ? 'cerrar' : false); }}
    >
      <div className="confirmar-caja">
        <span className="confirmar-icono" aria-hidden>
          <Icono nombre={pedido.icono ?? iconoPorDefecto} tam={26} />
        </span>
        <h2 id="confirmar-titulo">{pedido.titulo}</h2>
        {pedido.texto && <div id="confirmar-texto" className="confirmar-texto">{pedido.texto}</div>}
        <div className="confirmar-botones">
          {acciones.map((a) => (
            <button key={a.id} ref={a.id === inicial ? botonInicial : undefined} type="button" className={a.clase} onClick={() => responder(a.respuesta)}>
              {a.texto}
            </button>
          ))}
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
