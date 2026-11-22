import { Icono, Tx } from '../../componentes/Iconos';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAvisar } from '../../componentes/Confirmar';
import MarcoCuenta from '../../componentes/MarcoCuenta';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { modoReal } from '../../servicios/cliente';
import { auth } from '../../servicios/supabase';

/** Entrar con la cuenta, dentro del marco de las pantallas de cuenta (componentes/MarcoCuenta.tsx). */
export default function Ingresar() {
  const t = useT();
  const ta = t.auth;
  const { ingresar } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { desde?: string } | null };
  const desde = state?.desde;
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);
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
  /** El error de entrar, en una ventana flotante con lo que se puede hacer. */
  async function explicar(err: Error & { motivo?: string }) {
    if (err.motivo === 'credenciales') {
      const r = await avisar({
        titulo: ta.noEntro, tono: 'error',
        texto: <><p>{err.message}</p><p><strong>{ta.ofrecerCrear}</strong></p></>,
        acciones: [{ id: 'otra', texto: ta.otraVez }, { id: 'crear', texto: ta.crearCuenta, principal: true }],
      });
      if (r === 'crear') navegar('/registrarse', { state: { ...(state ?? {}), correo: correo.trim() } });
      return;
    }
    if (err.motivo === 'sin_confirmar') {
      const r = await avisar({
        titulo: ta.faltaConfirmar, texto: err.message, tono: 'info', icono: 'correo',
        acciones: [{ id: 'aceptar', texto: t.confirmar.aceptar }, { id: 'reenviar', texto: ta.reenviar, principal: true }],
      });
      if (r === 'reenviar') {
        try {
          await auth.reenviarConfirmacion(correo);
          await avisar({ titulo: ta.reenviadoTitulo, texto: ta.reenviado(correo.trim()), tono: 'exito', icono: 'correo' });
        } catch (e2) {
          await avisar({ titulo: ta.noReenviado, texto: (e2 as Error).message, tono: 'error' });
        }
      }
      return;
    }
    await avisar({ titulo: ta.noEntro, texto: err.message, tono: 'error' });
  }

  const demo = (c: string) => {
    setCorreo(c);
    setClave('demo1234');
  };

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
        </div>

        <button className="boton boton-ancho cuenta-boton" disabled={enviando}>
          {enviando
            ? <><span className="girando" aria-hidden /> {ta.entrando}</>
            : <>{ta.entrar} <Icono nombre="flecha" tam={20} /></>}
        </button>
      </form>

      <details className="plegable demo cuenta-demo">
        <summary>{ta.demo}</summary>
        <ul>
          <li>
            <button type="button" className="enlace" onClick={() => demo('agricultor@demo.cr')}>agricultor@demo.cr</button> — {ta.demoAgricultor}
          </li>
          {/* Con la base real, la cuenta admin NO es pública: su contraseña está solo en el .env del equipo. */}
          {!modoReal && (
            <li>
              <button type="button" className="enlace" onClick={() => demo('admin@demo.cr')}>admin@demo.cr</button> — {ta.demoAdmin}
            </li>
          )}
        </ul>
        <p className="ayuda">{ta.demoClave}</p>
      </details>

      <div className="cuenta-pie">
        <p>{ta.sinCuenta} <Link to="/registrarse" state={state}>{ta.crear}</Link></p>
        <p><Link to="/" className="cuenta-seguir">{ta.seguirSin}</Link></p>
      </div>
    </MarcoCuenta>
  );
}
