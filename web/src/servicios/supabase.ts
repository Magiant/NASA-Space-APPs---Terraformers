// Login y datos PRIVADOS del usuario en Supabase (Auth + tablas con RLS: migraciones 001–007).
// No hace falta un servidor propio: Supabase expone cada tabla y la base decide qué puede ver cada usuario.
// Si la web no tiene las llaves (modo demo), se usa la simulación de ./demo.ts con la misma forma.
import type { Extraccion, Finca, ReportePlaga, Rol, Seguimiento, Siembra, Usuario, VueloDron } from '../tipos';
import { datosDe, modoReal, supa } from './cliente';
import * as demo from './demo';

const db = () => supa!;
const hoy = () => new Date().toISOString().slice(0, 10);

/** Fila de la tabla perfiles (migración 001). */
interface FilaPerfil { id: string; nombre: string; correo: string | null; rol: Rol; codigo_distrito: string | null; creado: string }
const aUsuario = (p: FilaPerfil, correo?: string | null): Usuario =>
  ({ id: p.id, nombre: p.nombre, correo: p.correo ?? correo ?? '', rol: p.rol, codigo_distrito: p.codigo_distrito, creado: String(p.creado).slice(0, 10) });

/** Perfil (tabla perfiles) del usuario con sesión, o null. */
async function perfilDe(id: string, correo?: string | null): Promise<Usuario | null> {
  const p = datosDe<FilaPerfil | null>(await db().from('perfiles').select('*').eq('id', id).maybeSingle(), 'Leer perfil');
  return p ? aUsuario(p, correo) : null;
}

async function idActual(): Promise<string> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Necesita iniciar sesión.');
  return id;
}

/** Mensajes de Supabase Auth en palabras simples. */
function mensajeAuth(m: string): string {
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/already registered|already exists/i.test(m)) return 'Ya existe una cuenta con ese correo.';
  if (/email not confirmed/i.test(m)) return 'Falta confirmar el correo: revise su bandeja de entrada.';
  if (/password should be/i.test(m)) return 'La contraseña debe tener al menos 8 caracteres.';
  return m;
}

const authReal = {
  /** Sesión guardada en el navegador (al abrir la app). */
  sesion: async (): Promise<Usuario | null> => {
    const { data } = await db().auth.getSession();
    const u = data.session?.user;
    return u ? perfilDe(u.id, u.email) : null;
  },
  ingresar: async (correo: string, clave: string): Promise<Usuario> => {
    const { data, error } = await db().auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (error) throw new Error(mensajeAuth(error.message));
    const p = await perfilDe(data.user.id, data.user.email);
    if (!p) throw new Error('La cuenta no tiene perfil. Avise al equipo.');
    return p;
  },
  /** Toda cuenta nueva es agricultor (lo asegura la base). Si Supabase pide confirmar el correo, lo avisa. */
  registrarse: async (nombre: string, correo: string, clave: string, codigoDistrito: string | null): Promise<Usuario> => {
    if (clave.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    const { data, error } = await db().auth.signUp({
      email: correo.trim(), password: clave,
      options: { data: { nombre: nombre.trim(), codigo_distrito: codigoDistrito } },
    });
    if (error) throw new Error(mensajeAuth(error.message));
    if (!data.session || !data.user) throw new Error('Le enviamos un correo para confirmar la cuenta. Ábralo y luego entre.');
    const p = await perfilDe(data.user.id, data.user.email);
    if (!p) throw new Error('No se pudo crear el perfil.');
    return p;
  },
  salir: async (): Promise<void> => {
    await db().auth.signOut();
  },
};

const datosReales = {
  // ---------------- Fincas (RLS: solo las propias) ----------------
  misFincas: async (): Promise<Finca[]> => {
    const id = await idActual();
    return datosDe(await db().from('fincas').select('*').eq('usuario_id', id).order('creado'), 'Leer fincas');
  },
  finca: async (id: string): Promise<Finca> =>
    datosDe(await db().from('fincas').select('*').eq('id', id).single(), 'Finca no encontrada'),
  crearFinca: async (f: Omit<Finca, 'id' | 'usuario_id' | 'creado'>): Promise<Finca> =>
    datosDe(await db().from('fincas').insert(f).select().single(), 'Guardar finca'),

  // ---------------- Siembras (no se borran: se cierran) ----------------
  misSiembras: async (): Promise<Siembra[]> => {
    const id = await idActual();
    const filas = datosDe(
      await db().from('siembras').select('*, fincas!inner(usuario_id)').eq('fincas.usuario_id', id).order('fecha_siembra', { ascending: false }),
      'Leer siembras',
    ) as (Siembra & { fincas?: unknown })[];
    return filas.map(({ fincas: _f, ...s }) => s);
  },
  siembra: async (id: string): Promise<Siembra> =>
    datosDe(await db().from('siembras').select('*').eq('id', id).single(), 'Siembra no encontrada'),
  crearSiembra: async (s: Pick<Siembra, 'finca_id' | 'cultivo_id' | 'area_ha' | 'fecha_siembra' | 'cosecha_esperada'>): Promise<Siembra> =>
    datosDe(await db().from('siembras').insert(s).select().single(), 'Guardar siembra'),
  cerrarSiembra: async (id: string, r: Pick<Siembra, 'resultado' | 'cantidad' | 'unidad' | 'motivo'>): Promise<Siembra> => {
    const fila = datosDe(
      await db().from('siembras').update({ ...r, estado: 'finalizada', fecha_cierre: hoy() }).eq('id', id).eq('estado', 'activa').select().maybeSingle(),
      'Cerrar siembra',
    );
    if (!fila) throw new Error('Esta siembra ya está cerrada.');
    return fila;
  },
  seguimiento: async (siembraId: string): Promise<Seguimiento[]> =>
    datosDe(await db().from('seguimiento').select('*').eq('siembra_id', siembraId).order('fecha', { ascending: false }), 'Leer notas'),
  agregarSeguimiento: async (g: Omit<Seguimiento, 'id' | 'fecha'>): Promise<Seguimiento> =>
    datosDe(await db().from('seguimiento').insert(g).select().single(), 'Guardar nota'),

  // ---------------- Plagas ----------------
  reportarPlaga: async (r: Omit<ReportePlaga, 'id' | 'usuario_id' | 'estado'>): Promise<ReportePlaga> =>
    datosDe(await db().from('reportes_plaga').insert(r).select().single(), 'Enviar reporte'),
  misReportes: async (): Promise<ReportePlaga[]> => {
    const id = await idActual();
    return datosDe(await db().from('reportes_plaga').select('*').eq('usuario_id', id).order('fecha', { ascending: false }), 'Leer reportes');
  },

  // ---------------- Dron ----------------
  vuelosDron: async (fincaId: string): Promise<VueloDron[]> =>
    datosDe(await db().from('vuelos_dron').select('*').eq('finca_id', fincaId).order('fecha', { ascending: false }), 'Leer vuelos'),
};

/** Series largas públicas (datos extraídos, lectura pública). */
const seriesReales = {
  /** Temperatura media diaria del distrito en los últimos días (Open-Meteo; si no hay, NASA POWER). */
  temperatura: async (codigo: string, tempMedia: number, dias = 30): Promise<{ fecha: string; valor: number }[]> => {
    const desde = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
    const filas = datosDe(
      await db().from('clima_diario').select('fecha,fuente,temp_media_c').eq('codigo_distrito', codigo).gte('fecha', desde).not('temp_media_c', 'is', null).order('fecha'),
      'Leer temperatura',
    ) as { fecha: string; fuente: string; temp_media_c: number }[];
    const porFecha = new Map<string, number>();
    for (const f of filas) if (f.fuente === 'nasa-power' && !porFecha.has(f.fecha)) porFecha.set(f.fecha, f.temp_media_c);
    for (const f of filas) if (f.fuente === 'open-meteo') porFecha.set(f.fecha, f.temp_media_c); // Open-Meteo manda si hay de las dos
    const serie = [...porFecha].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, valor]) => ({ fecha, valor: Math.round(valor * 10) / 10 }));
    return serie.length >= 2 ? serie : demo.series.temperatura(codigo, tempMedia, dias);
  },
  /** Precios: hasta que el extractor de precios (tema 3) llene precios_historico, se usan los de ejemplo. */
  precio: demo.series.precio,
};

const ESTADO_EXTRACCION: Record<string, Extraccion['estado']> = { ok: 'ok', sin_cambios: 'ok', error: 'error', en_curso: 'parcial' };

const adminReal = {
  usuarios: async (): Promise<Usuario[]> => {
    const filas = datosDe<FilaPerfil[]>(await db().from('perfiles').select('*').order('creado'), 'Leer usuarios');
    return filas.map((p) => aUsuario(p));
  },
  cambiarRol: async (usuarioId: string, rol: Rol): Promise<void> => {
    datosDe(await db().from('perfiles').update({ rol }).eq('id', usuarioId).select('id'), 'Cambiar rol');
  },
  /** Admin ve todos; técnico, los de su distrito (lo filtra la base). */
  reportes: async (): Promise<(ReportePlaga & { usuario: string })[]> => {
    const filas = datosDe(await db().from('reportes_plaga').select('*, perfiles(nombre)').order('fecha', { ascending: false }), 'Leer reportes') as (ReportePlaga & { perfiles: { nombre: string } | null })[];
    return filas.map(({ perfiles, ...r }) => ({ ...r, usuario: perfiles?.nombre ?? '—' }));
  },
  confirmarReporte: async (id: string): Promise<void> => {
    datosDe(await db().from('reportes_plaga').update({ estado: 'confirmado' }).eq('id', id).select('id'), 'Confirmar reporte');
  },
  resumen: async () => {
    const contar = async (tabla: string, filtro?: [string, string]) => {
      let q = db().from(tabla).select('*', { count: 'exact', head: true });
      if (filtro) q = q.eq(filtro[0], filtro[1]);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return count ?? 0;
    };
    const [usuarios, fincas, siembrasActivas, reportesPendientes] = await Promise.all([
      contar('perfiles'), contar('fincas'), contar('siembras', ['estado', 'activa']), contar('reportes_plaga', ['estado', 'pendiente']),
    ]);
    return { usuarios, fincas, siembrasActivas, reportesPendientes };
  },
  /** Últimas corridas de los extractores (tabla extracciones, solo admin). */
  extracciones: async (): Promise<Extraccion[]> => {
    const filas = datosDe(await db().from('extracciones').select('*').order('inicio', { ascending: false }).limit(60), 'Leer extracciones') as
      { id: number; fuente: string; inicio: string; fin: string | null; estado: string; registros: number; mensaje: string | null }[];
    return filas.map((e) => ({
      id: String(e.id),
      extractor: e.fuente,
      inicio: e.inicio,
      duracion_s: e.fin ? Math.round((Date.parse(e.fin) - Date.parse(e.inicio)) / 1000) : 0,
      estado: ESTADO_EXTRACCION[e.estado] ?? 'parcial',
      registros: e.registros,
      mensaje: e.estado === 'en_curso' ? 'En curso…' : e.mensaje,
    }));
  },
  reiniciarDemo: async (): Promise<void> => {
    throw new Error('Solo disponible en el modo demo (sin base de datos).');
  },
};

export const auth = modoReal ? authReal : { ...demo.auth, sesion: async () => demo.auth.sesion() };
export const datos = modoReal ? datosReales : demo.datos;
export const series = modoReal ? seriesReales : demo.series;
export const admin = modoReal ? adminReal : demo.admin;
export { modoReal };
