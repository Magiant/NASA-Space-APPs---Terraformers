import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SelectorUbicacion from '../../componentes/SelectorUbicacion';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { useZonaElegida } from '../../utilidades';

export default function Registrarse() {
  const t = useT();
  const ta = t.auth;
  const { registrarse } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation() as { state: { desde?: string } | null };
  const [zonaElegida] = useZonaElegida();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [distrito, setDistrito] = useState<string | null>(zonaElegida);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    // Revisión antes de enviar: dice exactamente qué falta, en vez del globo del navegador.
    const te = ta.errores;
    const n = nombre.trim(), c = correo.trim();
    const problema =
      n.length < 2 ? te.nombre
      : n.length > 80 ? te.nombreLargo
      : !c ? te.correoVacio
      : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) ? te.correo(c)
      : clave.length < 8 ? te.claveCorta(clave.length)
      : clave !== clave.trim() ? te.claveEspacios
      : null;
    if (problema) return setError(problema);
    setError(null);
    setEnviando(true);
    try {
      await registrarse(nombre, correo, clave, distrito);
      navegar(state?.desde ?? '/mi-finca', { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <section className="formulario-centrado">
      <h1>{ta.registroTitulo}</h1>
      <p>{ta.registroTexto}</p>

      <form onSubmit={enviar} className="formulario" noValidate>
        <label>
          {ta.nombre}
          <input autoComplete="name" required maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label>
          {ta.correo}
          <input type="email" autoComplete="email" required maxLength={120} value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </label>
        <label>
          {ta.clave}
          <input type="password" autoComplete="new-password" minLength={8} required value={clave} onChange={(e) => setClave(e.target.value)} />
          <small className="ayuda">{ta.claveAyuda}</small>
        </label>
        <fieldset>
          <legend>{ta.dondeFinca}</legend>
          <SelectorUbicacion valor={distrito} alCambiar={setDistrito} />
        </fieldset>
        {error && <p className="aviso aviso-error" role="alert">{error}</p>}
        <button className="boton boton-ancho" disabled={enviando}>{enviando ? ta.creando : ta.crearBoton}</button>
      </form>

      <p>
        {ta.yaTiene} <Link to="/ingresar" state={state}>{ta.entrar}</Link>
      </p>
    </section>
  );
}
