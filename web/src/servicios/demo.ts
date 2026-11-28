// Login y datos PRIVADOS del usuario (Supabase Auth + tablas con RLS).
//
// Por ahora es una simulación que guarda todo en el navegador, con usuarios de demo.
// Cuando estén las tablas 001–008, cada función se cambia por la llamada real a
// `@supabase/supabase-js` con la misma firma. Las comprobaciones de dueño y de rol
// que se hacen aquí imitan lo que hará RLS en la base de datos.
// Correccion - Poll: los errores de la demo estaban fijos en espanol (salian asi con la app en ingles); ahora usan
// los mismos codigos que la base real y se traducen.
import { ErrorApp } from '../errores';
import { BASE_INICIAL, type BaseDemo } from '../datos-ejemplo/privados';
import { semilla } from '../datos-ejemplo/publicos';
import type {
  Extraccion, Finca, RegistroPrecio, ReportePlaga, Rol, Seguimiento, Siembra, Usuario, VueloDron,
} from '../tipos';
import { EXTRACCIONES } from '../datos-ejemplo/publicos';
import { borrar, guardar, leer, nuevoId } from './almacen';

// v2: fincas de ejemplo nuevas (Río Claro, Las Nubes, Valle Verde) y elementos en los vuelos del dron.
const CLAVE_BASE = 'tf-demo-base-v2';
const CLAVE_SESION = 'tf-sesion';

const base = (): BaseDemo => leer(CLAVE_BASE, BASE_INICIAL);
const escribir = (b: BaseDemo) => guardar(CLAVE_BASE, b);
// Correccion - Poll: fecha de hoy en la hora del telefono (antes UTC; de noche daba la de manana).
const hoy = () => new Date().toLocaleDateString('en-CA');
const esperar = <T,>(v: T): Promise<T> => new Promise((ok) => setTimeout(() => ok(v), 200));

function sinClave({ clave: _c, ...u }: BaseDemo['usuarios'][number]): Usuario {
  return u;
}

function usuarioActual(): Usuario {
  const id = leer<string | null>(CLAVE_SESION, null);
  const u = id ? base().usuarios.find((x) => x.id === id) : undefined;
  if (!u) throw new ErrorApp('sesion');
  return sinClave(u);
}

function exigirRol(...roles: Rol[]): Usuario {
  const u = usuarioActual();
  if (!roles.includes(u.rol)) throw new ErrorApp('permiso');
  return u;
}

function fincaPropia(b: BaseDemo, fincaId: string, u: Usuario): Finca {
  const f = b.fincas.find((x) => x.id === fincaId);
  if (!f || (f.usuario_id !== u.id && u.rol !== 'admin')) throw new ErrorApp('finca_no_encontrada');
  return f;
}

function siembraPropia(b: BaseDemo, siembraId: string, u: Usuario): Siembra {
  const s = b.siembras.find((x) => x.id === siembraId);
  if (!s) throw new ErrorApp('no_encontrada');
  fincaPropia(b, s.finca_id, u);
  return s;
}

export const auth = {
  sesion: (): Usuario | null => {
    try {
      return usuarioActual();
    } catch {
      return null;
    }
  },

  ingresar: async (correo: string, clave: string): Promise<Usuario> => {
    const u = base().usuarios.find((x) => x.correo.toLowerCase() === correo.trim().toLowerCase());
    if (!u || u.clave !== clave) throw Object.assign(new ErrorApp('credenciales'), { motivo: 'credenciales' });
    guardar(CLAVE_SESION, u.id);
    return esperar(sinClave(u));
  },

  /** En modo demo no hay correos: las cuentas quedan confirmadas al crearlas. */
  reenviarConfirmacion: async (_correo: string): Promise<void> => {},
  /** En modo demo no se mandan correos (la pantalla de Entrar lo avisa). */
  olvideClave: async (_correo: string): Promise<void> => {},
  cambiarClave: async (clave: string): Promise<void> => {
    if (clave.length < 8) throw new ErrorApp('clave_corta', { minimo: 8 });
    const b = base();
    const u = b.usuarios.find((x) => x.id === usuarioActual().id);
    if (u) { u.clave = clave; escribir(b); }
  },

  /** Todo usuario nuevo es agricultor. Los roles técnico y admin solo los asigna un administrador. */
  registrarse: async (nombre: string, correo: string, clave: string, codigoDistrito: string | null): Promise<Usuario> => {
    const b = base();
    const c = correo.trim().toLowerCase();
    if (b.usuarios.some((x) => x.correo.toLowerCase() === c)) throw new ErrorApp('ya_existe', { correo: c });
    if (clave.length < 8) throw new ErrorApp('clave_corta', { minimo: 8 });
    const u = { id: nuevoId(), nombre: nombre.trim(), correo: c, clave, rol: 'agricultor' as const, codigo_distrito: codigoDistrito, creado: hoy() };
    b.usuarios.push(u);
    escribir(b);
    guardar(CLAVE_SESION, u.id);
    return esperar(sinClave(u));
  },

  salir: async (): Promise<void> => {
    borrar(CLAVE_SESION);
  },
};

export const datos = {
  // ---------------- Fincas ----------------
  misFincas: async (): Promise<Finca[]> => {
    const u = usuarioActual();
    return esperar(base().fincas.filter((f) => f.usuario_id === u.id));
  },

  finca: async (id: string): Promise<Finca> => esperar(fincaPropia(base(), id, usuarioActual())),

  crearFinca: async (f: Omit<Finca, 'id' | 'usuario_id' | 'creado'>): Promise<Finca> => {
    const u = usuarioActual();
    const b = base();
    const nueva: Finca = { ...f, id: nuevoId(), usuario_id: u.id, creado: hoy() };
    b.fincas.push(nueva);
    escribir(b);
    return esperar(nueva);
  },

  /** Cambia datos de una finca propia (por ahora, el tamaño: cuando la siembra resulta más grande). */
  actualizarFinca: async (id: string, cambios: Partial<Pick<Finca, 'area_ha'>>): Promise<Finca> => {
    const b = base();
    const f = fincaPropia(b, id, usuarioActual());
    Object.assign(f, cambios);
    escribir(b);
    return esperar({ ...f });
  },

  // ---------------- Siembras ----------------
  misSiembras: async (): Promise<Siembra[]> => {
    const u = usuarioActual();
    const b = base();
    const ids = new Set(b.fincas.filter((f) => f.usuario_id === u.id).map((f) => f.id));
    return esperar(b.siembras.filter((s) => ids.has(s.finca_id)));
  },

  siembra: async (id: string): Promise<Siembra> => esperar(siembraPropia(base(), id, usuarioActual())),

  // Correccion - Poll: igual que la base real (migracion 020), la demo no guarda una siembra que no cabe en la finca.
  crearSiembra: async (s: Pick<Siembra, 'finca_id' | 'cultivo_id' | 'area_ha' | 'fecha_siembra' | 'cosecha_esperada'>): Promise<Siembra> => {
    const u = usuarioActual();
    const b = base();
    const finca = fincaPropia(b, s.finca_id, u);
    const ocupado = b.siembras.filter((x) => x.finca_id === s.finca_id && x.estado === 'activa').reduce((suma, x) => suma + x.area_ha, 0);
    if (ocupado + s.area_ha > finca.area_ha + 1e-9) throw new ErrorApp('finca_sin_espacio');
    const nueva: Siembra ={ ...s, id: nuevoId(), estado: 'activa', resultado: null, cantidad: null, unidad: null, motivo: null, fecha_cierre: null };
    b.siembras.push(nueva);
    escribir(b);
    return esperar(nueva);
  },

  /** Las siembras no se borran: se cierran con su resultado y pasan al histórico. */
  cerrarSiembra: async (id: string, r: Pick<Siembra, 'resultado' | 'cantidad' | 'unidad' | 'motivo'>): Promise<Siembra> => {
    const u = usuarioActual();
    const b = base();
    const s = siembraPropia(b, id, u);
    if (s.estado === 'finalizada') throw new ErrorApp('ya_cerrada');
    Object.assign(s, r, { estado: 'finalizada', fecha_cierre: hoy() });
    escribir(b);
    return esperar(s);
  },

  seguimiento: async (siembraId: string): Promise<Seguimiento[]> => {
    const b = base();
    siembraPropia(b, siembraId, usuarioActual());
    return esperar(b.seguimiento.filter((g) => g.siembra_id === siembraId).sort((a, c) => c.fecha.localeCompare(a.fecha)));
  },

  agregarSeguimiento: async (g: Omit<Seguimiento, 'id' | 'fecha'>): Promise<Seguimiento> => {
    const b = base();
    siembraPropia(b, g.siembra_id, usuarioActual());
    const nuevo: Seguimiento = { ...g, id: nuevoId(), fecha: hoy() };
    b.seguimiento.push(nuevo);
    escribir(b);
    return esperar(nuevo);
  },

  // ---------------- Plagas ----------------
  reportarPlaga: async (r: Omit<ReportePlaga, 'id' | 'usuario_id' | 'estado'>): Promise<ReportePlaga> => {
    const u = usuarioActual();
    const b = base();
    if (r.siembra_id) siembraPropia(b, r.siembra_id, u);
    const nuevo: ReportePlaga = { ...r, id: nuevoId(), usuario_id: u.id, estado: 'pendiente' };
    b.reportes.push(nuevo);
    escribir(b);
    return esperar(nuevo);
  },

  misReportes: async (): Promise<ReportePlaga[]> => {
    const u = usuarioActual();
    return esperar(base().reportes.filter((r) => r.usuario_id === u.id));
  },

  // ---------------- Dron ----------------
  vuelosDron: async (fincaId: string): Promise<VueloDron[]> => {
    const b = base();
    fincaPropia(b, fincaId, usuarioActual());
    return esperar(b.vuelos.filter((v) => v.finca_id === fincaId).sort((a, c) => c.fecha.localeCompare(a.fecha)));
  },
};

/** Series largas públicas (tablas de datos extraídos en Supabase, lectura pública). */
export const series = {
  /** clima_diario: temperatura media de los últimos días. */
  temperatura: async (codigo: string, tempMedia: number, dias = 30): Promise<{ fecha: string; valor: number }[]> => {
    const fin = new Date('2026-11-14');
    return esperar(
      Array.from({ length: dias }, (_, i) => {
        const d = new Date(fin);
        d.setDate(fin.getDate() - (dias - 1 - i));
        const s = semilla(codigo + i);
        return { fecha: d.toISOString().slice(0, 10), valor: Math.round((tempMedia + Math.sin(i / 4) * 1.2 + (s - 0.5) * 1.5) * 10) / 10 };
      }),
    );
  },

  /** precios_historico: últimos precios de un producto. */
  precio: async ({ producto, precio: actual }: Pick<RegistroPrecio, 'producto' | 'precio'>, dias = 30): Promise<{ fecha: string; valor: number }[]> => {
    const fin = new Date('2026-11-13');
    let v = actual * (0.85 + semilla(producto) * 0.25);
    const puntos = Array.from({ length: dias }, (_, i) => {
      const d = new Date(fin);
      d.setDate(fin.getDate() - (dias - 1 - i));
      v = i === dias - 1 ? actual : v + (actual - v) * 0.12 + (semilla(producto + i) - 0.5) * actual * 0.04;
      return { fecha: d.toISOString().slice(0, 10), valor: Math.round(v / 50) * 50 };
    });
    return esperar(puntos);
  },
};

/** Solo administradores (en Supabase: políticas RLS por rol + funciones seguras). */
export const admin = {
  usuarios: async (): Promise<Usuario[]> => {
    exigirRol('admin');
    return esperar(base().usuarios.map(sinClave));
  },

  cambiarRol: async (usuarioId: string, rol: Rol): Promise<void> => {
    const yo = exigirRol('admin');
    if (usuarioId === yo.id) throw new ErrorApp('propio_rol');
    const b = base();
    const u = b.usuarios.find((x) => x.id === usuarioId);
    if (!u) throw new ErrorApp('usuario_no_encontrado');
    u.rol = rol;
    escribir(b);
  },

  /** Admin ve todos; técnico, los de su zona. */
  reportes: async (): Promise<(ReportePlaga & { usuario: string })[]> => {
    const yo = exigirRol('admin', 'tecnico');
    const b = base();
    return esperar(
      b.reportes
        .filter((r) => yo.rol === 'admin' || r.codigo_distrito === yo.codigo_distrito)
        .map((r) => ({ ...r, usuario: b.usuarios.find((x) => x.id === r.usuario_id)?.nombre ?? '—' }))
        .sort((a, c) => c.fecha.localeCompare(a.fecha)),
    );
  },

  confirmarReporte: async (id: string): Promise<void> => {
    exigirRol('admin', 'tecnico');
    const b = base();
    const r = b.reportes.find((x) => x.id === id);
    if (r) r.estado = 'confirmado';
    escribir(b);
  },

  resumen: async () => {
    exigirRol('admin');
    const b = base();
    return esperar({
      usuarios: b.usuarios.length,
      fincas: b.fincas.length,
      siembrasActivas: b.siembras.filter((s) => s.estado === 'activa').length,
      reportesPendientes: b.reportes.filter((r) => r.estado === 'pendiente').length,
    });
  },

  extracciones: async (): Promise<Extraccion[]> => {
    exigirRol('admin');
    return esperar(EXTRACCIONES);
  },

  /** Vuelve a dejar los datos de demo como al principio. */
  reiniciarDemo: async (): Promise<void> => {
    exigirRol('admin');
    escribir(structuredClone(BASE_INICIAL));
  },
};
