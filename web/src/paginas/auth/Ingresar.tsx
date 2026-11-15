import { Tx } from '../../componentes/Iconos';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { modoReal } from '../../servicios/cliente';

export default function Ingresar() {
  const t = useT();
  const ta = t.auth;
  const { ingresar } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { desde?: string } | null };
  const desde = state?.desde;
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
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
    <section className="formulario-centrado">
      <h1>{ta.entrar}</h1>
      {desde ? <p className="aviso"><Tx>{ta.necesita}</Tx></p> : <p>{ta.paraQue}</p>}

      <form onSubmit={enviar} className="formulario">
        <label>
          {ta.correo}
          <input type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label>
          {ta.clave}
          <input type="password" autoComplete="current-password" required value={clave} onChange={(e) => setClave(e.target.value)} />
        </label>
        {error && <p className="aviso aviso-error" role="alert">{error}</p>}
        <button className="boton boton-ancho" disabled={enviando}>{enviando ? ta.entrando : ta.entrar}</button>
      </form>

      <p>
        {ta.sinCuenta} <Link to="/registrarse" state={state}>{ta.crear}</Link>
      </p>
      <p><Link to="/">{ta.seguirSin}</Link></p>

      <details className="plegable demo">
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
    </section>
  );
}
