import { Icono, Tx } from '../../componentes/Iconos';
import { mensajeError } from '../../errores';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAvisar } from '../../componentes/Confirmar';
import MarcoCuenta from '../../componentes/MarcoCuenta';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { modoRealActual } from '../../servicios/cliente';
import { auth } from '../../servicios/supabase';

/** Entrar con la cuenta, dentro del marco de las pantallas de cuenta (componentes/MarcoCuenta.tsx). */
export default function Ingresar() {
  const t = useT();
  const ta = t.auth;
  const { ingresar, ingresarDemo, modoDemo } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { desde?: string } | null };
  const desde = state?.desde;
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [pidiendo, setPidiendo] = useState(false);
  const avisar = useAvisar();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const u = await ingresar(correo, clave);
      navegar(desde ?? (u.rol === 'admin' ? '/admin' : '/mi-finca'), { replace: true });
    } catch (err) {
      setEnviando(false);
      await explicar(err as Error & { motivo?: string });
    }
  }

  // Correccion - Poll: con un correo sin cuenta solo decía "correo o contraseña incorrectos". Supabase no dice si un
  // correo existe (así nadie puede averiguar quién tiene cuenta), pero la ventana ofrece crearla con ese correo.
  // Correccion - Poll: no habia "¿Olvido su contrasena?": quien la olvidaba quedaba sin salida. Ahora manda el correo
  // para elegir una nueva (en la demo explica que no hay correos y cual es la contrasena de prueba).
  // Correccion - Poll: el boton no mostraba que estaba enviando y se podia tocar varias veces (y llegar al limite de
  // correos del servidor); ahora dice "Enviando…" y se bloquea mientras espera.
  async function olvide() {
    if (!modoRealActual()) return void avisar({ titulo: ta.olvide, texto: ta.olvideDemo, tono: 'info' });
    if (!correo.trim()) return void avisar({ titulo: ta.olvide, texto: ta.olvideSinCorreo, tono: 'info', icono: 'correo' });
    if (pidiendo) return;
    setPidiendo(true);
    try {
      await auth.olvideClave(correo);
      await avisar({ titulo: ta.olvideEnviadoTitulo, texto: ta.olvideEnviado(correo.trim()), tono: 'exito', icono: 'correo' });
    } catch (err) {
      await avisar({ titulo: ta.olvide, texto: mensajeError(t, err), tono: 'error' });
    } finally {
      setPidiendo(false);
    }
  }

  // Correccion - Poll: el texto del error salia siempre en español; ahora se traduce al idioma de la app.
  /** El error de entrar, en una ventana flotante con lo que se puede hacer. */
  async function explicar(err: Error & { motivo?: string }) {
    if (err.motivo === 'credenciales') {
      const r = await avisar({
        titulo: ta.noEntro, tono: 'error',
        texto: <><p>{mensajeError(t, err)}</p><p><strong>{ta.ofrecerCrear}</strong></p></>,
        acciones: [{ id: 'otra', texto: ta.otraVez }, { id: 'crear', texto: ta.crearCuenta, principal: true }],
      });
      if (r === 'crear') navegar('/registrarse', { state: { ...(state ?? {}), correo: correo.trim() } });
      return;
    }
    if (err.motivo === 'sin_confirmar') {
      const r = await avisar({
        titulo: ta.faltaConfirmar, texto: mensajeError(t, err), tono: 'info', icono: 'correo',
        acciones: [{ id: 'aceptar', texto: t.confirmar.aceptar }, { id: 'reenviar', texto: ta.reenviar, principal: true }],
      });
      if (r === 'reenviar') {
        try {
          await auth.reenviarConfirmacion(correo);
          await avisar({ titulo: ta.reenviadoTitulo, texto: ta.reenviado(correo.trim()), tono: 'exito', icono: 'correo' });
        } catch (e2) {
          await avisar({ titulo: ta.noReenviado, texto: mensajeError(t, e2), tono: 'error' });
        }
      }
      return;
    }
    await avisar({ titulo: ta.noEntro, texto: mensajeError(t, err), tono: 'error' });
  }

  const demo = (c: string) => {
    setCorreo(c);
    setClave('demo1234');
  };

  async function probarDemo() {
    setEnviando(true);
    try {
      await ingresarDemo();
      navegar(desde ?? '/mi-finca', { replace: true });
    } catch (err) {
      setEnviando(false);
      await avisar({ titulo: ta.demo, texto: mensajeError(t, err), tono: 'error' });
    }
  }

  return (
    <MarcoCuenta idTitulo="titulo-entrar">
      <h1 id="titulo-entrar">{ta.entrar}</h1>
      {desde ? <p className="aviso cuenta-aviso"><Tx>{ta.necesita}</Tx></p> : <p className="cuenta-sub">{ta.paraQue}</p>}

      <form onSubmit={enviar} className="formulario cuenta-campos">
        <label>
          {ta.correo}
          <span className="campo-icono">
            <Icono nombre="correo" tam={20} />
            <input
              type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required
              placeholder={ta.correoPista} value={correo} onChange={(e) => setCorreo(e.target.value)}
            />
          </span>
        </label>

        <div className="campo-clave">
          <label htmlFor="entrar-clave">{ta.clave}</label>
          <span className="campo-icono">
            <Icono nombre="candado" tam={20} />
            <input
              id="entrar-clave" className="con-boton" type={verClave ? 'text' : 'password'} autoComplete="current-password" required
              value={clave} onChange={(e) => setClave(e.target.value)}
            />
            <button
              type="button" className="ver-clave" onClick={() => setVerClave((v) => !v)}
              aria-label={verClave ? ta.ocultarClaveAria : ta.mostrarClaveAria} aria-pressed={verClave}
            >
              <Icono nombre={verClave ? 'ojoNo' : 'ojo'} tam={18} /> {verClave ? ta.ocultarClave : ta.mostrarClave}
            </button>
          </span>
          <button type="button" className="enlace" onClick={olvide} disabled={pidiendo}>{pidiendo ? ta.enviandoCorreo : ta.olvide}</button>
        </div>

        <button className="boton boton-ancho cuenta-boton" disabled={enviando}>
          {enviando
            ? <><span className="girando" aria-hidden /> {ta.entrando}</>
            : <>{ta.entrar} <Icono nombre="flecha" tam={20} /></>}
        </button>
      </form>

      {/* Correccion - Poll: con la base real se ofrecia agricultor@demo.cr con la contrasena publica demo1234: cualquiera
          entraba a una cuenta compartida y mandaba reportes de plaga al tecnico real. Ahora las cuentas de prueba solo
          se ofrecen en la demostracion (sin base de datos). */}
      {modoRealActual() && !modoDemo && (
        <details className="plegable demo cuenta-demo">
          <summary>{ta.demo}</summary>
          <p className="ayuda">{ta.demoAisladoAviso}</p>
          <button type="button" className="boton boton-ancho" onClick={probarDemo} disabled={enviando}>
            {enviando ? ta.entrando : ta.demoEntrar}
          </button>
        </details>
      )}
      {!modoRealActual() && (
      <details className="plegable demo cuenta-demo">
        <summary>{ta.demo}</summary>
        <ul>
          <li>
            <button type="button" className="enlace" onClick={() => demo('agricultor@demo.cr')}>agricultor@demo.cr</button> — {ta.demoAgricultor}
          </li>
          <li>
            <button type="button" className="enlace" onClick={() => demo('admin@demo.cr')}>admin@demo.cr</button> — {ta.demoAdmin}
          </li>
        </ul>
        <p className="ayuda">{ta.demoClave}</p>
      </details>
      )}

      <div className="cuenta-pie">
        <p>{ta.sinCuenta} <Link to="/registrarse" state={state}>{ta.crear}</Link></p>
        <p><Link to="/" className="cuenta-seguir">{ta.seguirSin}</Link></p>
      </div>
    </MarcoCuenta>
  );
}
