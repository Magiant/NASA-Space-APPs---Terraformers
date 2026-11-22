import { useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAvisar } from '../../componentes/Confirmar';
import { Icono } from '../../componentes/Iconos';
import MarcoCuenta from '../../componentes/MarcoCuenta';
import SelectorUbicacion from '../../componentes/SelectorUbicacion';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { auth } from '../../servicios/supabase';
import { useZonaElegida } from '../../utilidades';

type Campo = 'nombre' | 'correo' | 'clave';

/** Requisitos de la contraseña: el primero es obligatorio; los otros solo la hacen más segura. */
function requisitosClave(clave: string) {
  return {
    largo: clave.length >= 8,
    mezcla: /\p{L}/u.test(clave) && /\d/.test(clave),
    extra: /[A-ZÁÉÍÓÚÑ]/.test(clave) || /[^\p{L}\d\s]/u.test(clave),
  };
}

/** 0 = vacía · 1 = débil · 2 = aceptable · 3 = segura. Solo orienta: el mínimo sigue siendo 8 caracteres. */
function fuerzaClave(clave: string): number {
  if (!clave) return 0;
  const r = requisitosClave(clave);
  if (!r.largo) return 1;
  return r.mezcla && r.extra ? 3 : r.mezcla || r.extra ? 2 : 1;
}

/** Crear una cuenta, dentro del marco de las pantallas de cuenta (componentes/MarcoCuenta.tsx). */
export default function Registrarse() {
  const t = useT();
  const ta = t.auth;
  const { registrarse } = useAuth();
  const navegar = useNavigate();
  // correo: viene de Entrar cuando ese correo no tenía cuenta (la ventana ofrece crearla).
  const { state } = useLocation() as { state: { desde?: string; correo?: string } | null };
  const [zonaElegida] = useZonaElegida();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState(state?.correo ?? '');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [distrito, setDistrito] = useState<string | null>(zonaElegida);
  const avisar = useAvisar();
  const [campoError, setCampoError] = useState<Campo | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const campos = { nombre: useRef<HTMLInputElement>(null), correo: useRef<HTMLInputElement>(null), clave: useRef<HTMLInputElement>(null) };

  const req = requisitosClave(clave);
  const fuerza = fuerzaClave(clave);

  /** Al corregir el campo marcado, se quita la marca roja. */
  const editar = (campo: Campo, valor: string, fijar: (v: string) => void) => {
    fijar(valor);
    if (campoError === campo) setCampoError(null);
  };

  async function enviar(e: FormEvent) {
    e.preventDefault();
    // Revisión antes de enviar: dice exactamente qué falta, marca el campo y lleva el cursor ahí.
    const te = ta.errores;
    const n = nombre.trim(), c = correo.trim();
    const [campo, problema]: [Campo | null, string | null] =
      n.length < 2 ? ['nombre', te.nombre]
      : n.length > 80 ? ['nombre', te.nombreLargo]
      : !c ? ['correo', te.correoVacio]
      : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) ? ['correo', te.correo(c)]
      : clave.length < 8 ? ['clave', te.claveCorta(clave.length)]
      : clave !== clave.trim() ? ['clave', te.claveEspacios]
      : [null, null];
    if (campo && problema) {
      setCampoError(campo);
      // Ventana flotante con qué falta; al aceptar, el cursor queda en ese campo.
      await avisar({ titulo: t.avisos.revisarDato, texto: problema, tono: 'error' });
      campos[campo].current?.focus();
      return;
    }
    setCampoError(null);
    setEnviando(true);
    try {
      await registrarse(nombre, correo, clave, distrito);
      navegar(state?.desde ?? '/mi-finca', { replace: true });
    } catch (err) {
      // Si Supabase pide confirmar el correo, la cuenta sí se creó: no es un error.
      if ((err as { confirmarCorreo?: boolean }).confirmarCorreo) setConfirmar(true);
      else avisar({ titulo: ta.noSeCreo, texto: (err as Error).message, tono: 'error' });
      setEnviando(false);
    }
  }

  /** El correo de confirmación no llegó (o llevaba a una dirección que no abría): mandarlo otra vez. */
  async function reenviar() {
    try {
      await auth.reenviarConfirmacion(correo);
      await avisar({ titulo: ta.reenviadoTitulo, texto: ta.reenviado(correo.trim()), tono: 'exito', icono: 'correo' });
    } catch (err) {
      await avisar({ titulo: ta.noReenviado, texto: (err as Error).message, tono: 'error' });
    }
  }

  // Cuenta creada, pero Supabase pide confirmar el correo: en vez del formulario, cómo seguir.
  if (confirmar) {
    return (
      <MarcoCuenta idTitulo="titulo-registro">
        <div className="cuenta-confirmar" role="status">
          <span className="cuenta-confirmar-icono" aria-hidden><Icono nombre="correo" tam={40} /></span>
          <h1 id="titulo-registro">{ta.confirmarTitulo}</h1>
          <p>{ta.confirmarTexto(correo.trim())}</p>
          <p className="ayuda">{ta.confirmarSpam}</p>
          <Link to="/ingresar" state={state} className="boton boton-ancho">{ta.irEntrar}</Link>
          <button type="button" className="boton boton-secundario boton-ancho" onClick={reenviar}>{ta.noLlego}</button>
        </div>
      </MarcoCuenta>
    );
  }

  return (
    <MarcoCuenta idTitulo="titulo-registro">
      <h1 id="titulo-registro">{ta.registroTitulo}</h1>
      <p className="cuenta-sub">{ta.registroTexto}</p>

      <form onSubmit={enviar} className="formulario cuenta-campos" noValidate>
        <label>
          {ta.nombre}
          <span className="campo-icono">
            <Icono nombre="persona" tam={20} />
            <input
              ref={campos.nombre} autoComplete="name" required maxLength={80} placeholder={ta.nombrePista}
              aria-invalid={campoError === 'nombre'} value={nombre} onChange={(e) => editar('nombre', e.target.value, setNombre)}
            />
          </span>
        </label>

        <label>
          {ta.correo}
          <span className="campo-icono">
            <Icono nombre="correo" tam={20} />
            <input
              ref={campos.correo} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              required maxLength={120} placeholder={ta.correoPista}
              aria-invalid={campoError === 'correo'} value={correo} onChange={(e) => editar('correo', e.target.value, setCorreo)}
            />
          </span>
        </label>

        <div className="campo-clave">
          <label htmlFor="registro-clave">{ta.clave}</label>
          <span className="campo-icono">
            <Icono nombre="candado" tam={20} />
            <input
              id="registro-clave" ref={campos.clave} className="con-boton" type={verClave ? 'text' : 'password'}
              autoComplete="new-password" minLength={8} required aria-describedby="registro-clave-requisitos"
              aria-invalid={campoError === 'clave'} value={clave} onChange={(e) => editar('clave', e.target.value, setClave)}
            />
            <button
              type="button" className="ver-clave" onClick={() => setVerClave((v) => !v)}
              aria-label={verClave ? ta.ocultarClaveAria : ta.mostrarClaveAria} aria-pressed={verClave}
            >
              <Icono nombre={verClave ? 'ojoNo' : 'ojo'} tam={18} /> {verClave ? ta.ocultarClave : ta.mostrarClave}
            </button>
          </span>
          <div className={`fuerza fuerza-${fuerza}`} aria-live="polite">
            <span className="fuerza-barras" aria-hidden><span /><span /><span /></span>
            <span className="fuerza-texto">{ta.fuerza(fuerza)}</span>
          </div>
          <ul className="requisitos" id="registro-clave-requisitos">
            {(['largo', 'mezcla', 'extra'] as const).map((k) => (
              <li key={k} className={req[k] ? 'cumple' : undefined}>
                <Icono nombre={req[k] ? 'check' : 'circulo'} tam={16} /> {ta.requisitos[k]}
              </li>
            ))}
          </ul>
        </div>

        <fieldset className="cuenta-ubicacion">
          <legend><Icono nombre="pin" tam={18} /> {ta.dondeFinca} <span className="insignia-opcional">{ta.opcional}</span></legend>
          <p className="ayuda">{ta.ubicacionAyuda}</p>
          <SelectorUbicacion valor={distrito} alCambiar={setDistrito} />
        </fieldset>

        <button className="boton boton-ancho cuenta-boton" disabled={enviando}>
          {enviando
            ? <><span className="girando" aria-hidden /> {ta.creando}</>
            : <>{ta.crearBoton} <Icono nombre="flecha" tam={20} /></>}
        </button>
      </form>

      <div className="cuenta-pie">
        <p>{ta.yaTiene} <Link to="/ingresar" state={state}>{ta.entrar}</Link></p>
      </div>
    </MarcoCuenta>
  );
}
