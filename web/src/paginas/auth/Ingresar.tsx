import { Icono, Tx } from '../../componentes/Iconos';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MarcoCuenta from '../../componentes/MarcoCuenta';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { modoReal } from '../../servicios/cliente';

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
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const u = await ingresar(correo, clave);
      navegar(desde ?? (u.rol === 'admin' ? '/admin' : '/mi-finca'), { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
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

        {error && <p className="aviso aviso-error" role="alert">{error}</p>}

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
