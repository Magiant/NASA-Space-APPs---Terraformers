import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { auth } from '../servicios/supabase';
import type { Usuario } from '../tipos';

interface ValorAuth {
  usuario: Usuario | null;
  ingresar: (correo: string, clave: string) => Promise<Usuario>;
  registrarse: (nombre: string, correo: string, clave: string, distrito: string | null) => Promise<Usuario>;
  salir: () => Promise<void>;
}

const Contexto = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => auth.sesion());

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

  const salir = useCallback(async () => {
    await auth.salir();
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, ingresar, registrarse, salir }), [usuario, ingresar, registrarse, salir]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ValorAuth {
  const v = useContext(Contexto);
  if (!v) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return v;
}
