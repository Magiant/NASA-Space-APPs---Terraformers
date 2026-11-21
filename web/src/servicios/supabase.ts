// Login y datos PRIVADOS del usuario en Supabase (Auth + tablas con RLS: migraciones 001–007).
// No hace falta un servidor propio: Supabase expone cada tabla y la base decide qué puede ver cada usuario.
// Si la web no tiene las llaves (modo demo), se usa la simulación de ./demo.ts con la misma forma.
import type { Extraccion, Finca, RegistroPrecio, ReportePlaga, Rol, Seguimiento, Siembra, Usuario, VueloDron } from '../tipos';
import { datosDe, modoReal, supa } from './cliente';
import * as demo from './demo';
import { seriePrecio } from './publico';

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

/**
 * Mensajes de Supabase Auth en palabras simples, diciendo POR QUÉ no se acepta y qué hacer.
 * Supabase responde en inglés y a veces con un código (error.code); se revisan los dos.
 */
function mensajeAuth(m: string, codigo?: string, correo?: string): string {
  const c = correo ? `«${correo}»` : 'ese correo';
  const segundos = m.match(/after (\d+) seconds?/i)?.[1];
  const minimo = m.match(/at least (\d+) characters?/i)?.[1];
  if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos. Revise que el correo esté bien escrito y que la contraseña tenga las mayúsculas correctas.';
  if (codigo === 'user_already_exists' || /already registered|already exists/i.test(m))
    return `Ya existe una cuenta con ${c}. Si es suya, use «Entrar». Si no recuerda la contraseña, pida ayuda al equipo.`;
  if (codigo === 'email_not_confirmed' || /email not confirmed/i.test(m))
    return 'Falta confirmar el correo: abra el mensaje que le enviamos (revise también «Spam» o «Promociones») y toque el enlace. Después vuelva a entrar.';
  if (codigo === 'email_address_invalid' || /email address .* is invalid|invalid format|unable to validate email/i.test(m))
    return `El servidor no acepta ${c}. Revise que esté bien escrito (nombre@dominio.com). Los correos inventados o de prueba (como @test.com o @example.com) no se aceptan: use uno real.`;
  if (codigo === 'weak_password' || /should contain at least one character/i.test(m))
    return 'La contraseña es muy débil: el servidor pide mezclar letras minúsculas, MAYÚSCULAS, números y algún símbolo (por ejemplo Finca#2026).';
  if (minimo) return `La contraseña es muy corta: el servidor pide al menos ${minimo} caracteres.`;
  if (codigo === 'over_email_send_rate_limit' || /email rate limit/i.test(m))
    return 'Se pidieron demasiados correos de confirmación en poco tiempo (límite del servidor). Espere unos minutos e intente de nuevo.';
  if (segundos) return `Por seguridad, espere ${segundos} segundos antes de intentarlo de nuevo.`;
  if (codigo === 'signup_disabled' || /signups not allowed/i.test(m)) return 'Por ahora no se pueden crear cuentas nuevas. Avise al equipo.';
  if (/database error saving new user/i.test(m)) return 'El servidor no pudo crear su perfil (error en la base de datos). Intente de nuevo y, si se repite, avise al equipo.';
  if (/failed to fetch|network|load failed/i.test(m)) return 'No hay conexión con el servidor. Revise su señal o el wifi e intente de nuevo.';
  return `No se pudo completar: ${m}`;
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
    if (error) throw new Error(mensajeAuth(error.message, error.code, correo.trim()));
    const p = await perfilDe(data.user.id, data.user.email);
    if (!p) throw new Error('La cuenta no tiene perfil. Avise al equipo.');
    return p;
  },
  /** Toda cuenta nueva es agricultor (lo asegura la base). Si Supabase pide confirmar el correo, lo avisa. */
  registrarse: async (nombre: string, correo: string, clave: string, codigoDistrito: string | null): Promise<Usuario> => {
    if (clave.length < 8) throw new Error(`La contraseña tiene ${clave.length} caracteres: necesita al menos 8.`);
    const { data, error } = await db().auth.signUp({
      email: correo.trim(), password: clave,
      options: { data: { nombre: nombre.trim(), codigo_distrito: codigoDistrito } },
    });
    if (error) throw new Error(mensajeAuth(error.message, error.code, correo.trim()));
    // Con "Confirm email" activo, Supabase responde sin sesión. Si el correo ya existía, responde un usuario sin identidades.
    if (data.user && data.user.identities?.length === 0) throw new Error(mensajeAuth('already registered', 'user_already_exists', correo.trim()));
    if (!data.session || !data.user)
      throw new Error(`Cuenta creada. Le enviamos un correo a «${correo.trim()}» para confirmarla: ábralo (revise también «Spam» o «Promociones»), toque el enlace y después entre.`);
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
  // Correccion - Poll: si la base tenia menos de 2 precios se mostraba una serie inventada (la del modo demo) como si
  // fuera real; ahora se devuelve lo que hay y, sin datos suficientes, no se dibuja el grafico.
  /** Precios del producto en precios_historico (misma fuente, mercado y unidad). El CNP es semanal: se piden ~4 meses. */
  precio: async (p: RegistroPrecio, dias = 30): Promise<{ fecha: string; valor: number }[]> =>
    seriePrecio(p, p.fuente === 'CNP' ? Math.max(dias, 120) : dias),
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
