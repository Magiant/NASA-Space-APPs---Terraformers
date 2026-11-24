import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supa } from '../servicios/cliente';
import { auth } from '../servicios/supabase';
import type { Usuario } from '../tipos';
import { borrarCopiasPrivadas } from '../utilidades';

interface ValorAuth {
  usuario: Usuario | null;
  /** true mientras se revisa si ya había una sesión guardada (al abrir la app). */
  cargando: boolean;
  ingresar: (correo: string, clave: string) => Promise<Usuario>;
  registrarse: (nombre: string, correo: string, clave: string, distrito: string | null) => Promise<Usuario>;
  salir: () => Promise<void>;
}

const Contexto = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir: recuperar la sesión guardada. Con Supabase, además seguir los cambios
  // (la sesión vence, se cierra en otra pestaña, etc.).
  useEffect(() => {
    let vivo = true;
    auth.sesion()
      .then((u) => vivo && setUsuario(u))
      .catch(() => vivo && setUsuario(null))
      .finally(() => vivo && setCargando(false));
    // Correccion - Poll: el enlace del correo "¿Olvido su contrasena?" abria la app sin pedir la contrasena nueva;
    // ahora, al llegar con ese enlace, se carga la sesion temporal y se lleva a la pagina para elegirla.
    const suscripcion = supa?.auth.onAuthStateChange((evento, sesion) => {
      // Correccion - Poll: si la sesion vencia (sin tocar "Salir"), las copias de fincas y siembras quedaban en el telefono.
      if (evento === 'SIGNED_OUT') { borrarCopiasPrivadas(); setUsuario(null); }
      if (evento === 'PASSWORD_RECOVERY') {
        if (sesion?.user) auth.sesion().then((u) => vivo && setUsuario(u)).catch(() => {});
        window.location.hash = '#/nueva-clave';
      }
    });
    return () => {
      vivo = false;
      suscripcion?.data.subscription.unsubscribe();
    };
  }, []);

  const ingresar = useCallback(async (correo: string, clave: string) => {
    const u = await auth.ingresar(correo, clave);
    setUsuario(u);
    return u;
  }, []);

  const registrarse = useCallback(async (nombre: string, correo: string, clave: string, distrito: string | null) => {
    const u = await auth.registrarse(nombre, correo, clave, distrito);
    setUsuario(u);
    return u;
  }, []);

  // Correccion - Poll: las copias sin senal de fincas y siembras quedaban en el telefono al salir; ahora se borran,
  // para que otra persona que use el mismo telefono no las vea.
  const salir = useCallback(async () => {
    await auth.salir();
    borrarCopiasPrivadas();
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, cargando, ingresar, registrarse, salir }), [usuario, cargando, ingresar, registrarse, salir]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ValorAuth {
  const v = useContext(Contexto);
  if (!v) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return v;
}
