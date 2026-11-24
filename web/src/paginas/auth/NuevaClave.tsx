import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAvisar } from '../../componentes/Confirmar';
import { Icono } from '../../componentes/Iconos';
import MarcoCuenta from '../../componentes/MarcoCuenta';
import { useAuth } from '../../contexto/AuthContext';
import { useT } from '../../contexto/PreferenciasContext';
import { mensajeError } from '../../errores';
import { auth } from '../../servicios/supabase';

/**
 * Elegir una contraseña nueva. Se llega aquí desde el enlace del correo de "¿Olvidó su contraseña?": ese enlace abre
 * una sesión temporal, y con ella se guarda la contraseña nueva.
 */
export default function NuevaClave() {
  const t = useT();
  const ta = t.auth;
  const { usuario, cargando } = useAuth();
  const navegar = useNavigate();
  const avisar = useAvisar();
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Correccion - Poll: el aviso de "minimo 8 caracteres" lo daba el navegador, en su idioma y no en el de la app;
  // ahora la revision es propia y usa el mismo texto que Crear cuenta.
  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (clave.length < 8) return void avisar({ titulo: ta.nuevaClave, texto: t.errores.clave_corta({ minimo: 8 }), tono: 'error' });
    setEnviando(true);
    try {
      await auth.cambiarClave(clave);
      await avisar({ titulo: ta.nuevaClave, texto: ta.nuevaClaveLista, tono: 'exito' });
      navegar('/mi-finca', { replace: true });
    } catch (err) {
      setEnviando(false);
      await avisar({ titulo: ta.nuevaClave, texto: mensajeError(t, err), tono: 'error' });
    }
  }

  return (
    <MarcoCuenta idTitulo="titulo-nueva-clave">
      <h1 id="titulo-nueva-clave">{ta.nuevaClave}</h1>
      {!cargando && !usuario ? (
        <>
          <p className="aviso cuenta-aviso">{ta.nuevaClaveVencida}</p>
          <Link to="/ingresar" className="boton boton-ancho">{ta.entrar}</Link>
        </>
      ) : (
        <form onSubmit={guardar} className="formulario cuenta-campos" noValidate>
          <div className="campo-clave">
            <label htmlFor="nueva-clave">{ta.clave}</label>
            <span className="campo-icono">
              <Icono nombre="candado" tam={20} />
              <input
                id="nueva-clave" className="con-boton" type={verClave ? 'text' : 'password'} autoComplete="new-password"
                required value={clave} onChange={(e) => setClave(e.target.value)}
              />
              <button
                type="button" className="ver-clave" onClick={() => setVerClave((v) => !v)}
                aria-label={verClave ? ta.ocultarClaveAria : ta.mostrarClaveAria} aria-pressed={verClave}
              >
                <Icono nombre={verClave ? 'ojoNo' : 'ojo'} tam={18} /> {verClave ? ta.ocultarClave : ta.mostrarClave}
              </button>
            </span>
            <small className="ayuda">{ta.nuevaClaveAyuda}</small>
          </div>
          <button className="boton boton-ancho cuenta-boton" disabled={enviando}>
            {enviando ? t.comun.guardando : ta.nuevaClaveGuardar}
          </button>
        </form>
      )}
    </MarcoCuenta>
  );
}
