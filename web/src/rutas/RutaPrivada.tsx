import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import { useT } from '../contexto/PreferenciasContext';
import type { Rol } from '../tipos';

/**
 * Protege las pantallas personales. Si no hay sesión, manda a Ingresar y,
 * después de entrar, vuelve a la pantalla que se quería abrir.
 * Con `roles`, además exige uno de esos roles (por ejemplo, solo admin).
 */
export default function RutaPrivada({ roles }: { roles?: Rol[] }) {
  const { usuario } = useAuth();
  const t = useT();
  const ubicacion = useLocation();

  if (!usuario) {
    return <Navigate to="/ingresar" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />;
  }

  if (roles && !roles.includes(usuario.rol)) {
    return (
      <section className="vacio">
        <p className="vacio-icono" aria-hidden>🔒</p>
        <h1>{t.comun.sinAcceso}</h1>
        <p>{t.comun.sinAccesoTexto}</p>
        <Link className="boton" to="/">{t.comun.volverInicio}</Link>
      </section>
    );
  }

  return <Outlet />;
}
