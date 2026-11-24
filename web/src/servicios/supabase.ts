// Login y datos PRIVADOS del usuario en Supabase (Auth + tablas con RLS: migraciones 001–007).
// No hace falta un servidor propio: Supabase expone cada tabla y la base decide qué puede ver cada usuario.
// Si la web no tiene las llaves (modo demo), se usa la simulación de ./demo.ts con la misma forma.
import type { Extraccion, Finca, RegistroPrecio, ReportePlaga, Rol, Seguimiento, Siembra, Usuario, VueloDron } from '../tipos';
import { datosDe, modoReal, SITIO_PUBLICO, supa } from './cliente';
import * as demo from './demo';
import { seriePrecio } from './publico';
import { ErrorApp, errorServidor } from '../errores';
import { guardar, leer } from './almacen';

const db = () => supa!;
// Correccion - Poll: fecha de hoy en la hora del telefono (antes UTC; de noche daba la de manana).
const hoy = () => new Date().toLocaleDateString('en-CA');

/** Fila de la tabla perfiles (migración 001). */
interface FilaPerfil { id: string; nombre: string; correo: string | null; rol: Rol; codigo_distrito: string | null; creado: string }
const aUsuario = (p: FilaPerfil, correo?: string | null): Usuario =>
  ({ id: p.id, nombre: p.nombre, correo: p.correo ?? correo ?? '', rol: p.rol, codigo_distrito: p.codigo_distrito, creado: String(p.creado).slice(0, 10) });

/** Copia del perfil en el teléfono (prefijo privado: se borra al salir de la cuenta). */
const clavePerfil = (id: string) => `tf-copia-priv-${id}-perfil`;

/** Perfil (tabla perfiles) del usuario con sesión, o null. Si se lee bien, queda una copia para abrir sin señal. */
async function perfilDe(id: string, correo?: string | null): Promise<Usuario | null> {
  const p = datosDe<FilaPerfil | null>(await db().from('perfiles').select('*').eq('id', id).maybeSingle(), 'Leer perfil');
  const u = p ? aUsuario(p, correo) : null;
  if (u) guardar(clavePerfil(id), u);
  return u;
}

/** ¿El error es por falta de señal? */
const sinSenal = (e: unknown) => (e as { codigo?: string })?.codigo === 'sin_conexion' || !navigator.onLine;

/** Usuario de la sesión guardada por Supabase en el teléfono (sirve si el token venció sin señal). */
function idGuardado(): string | undefined {
  const s = leer<{ user?: { id?: string } } | null>('tf-auth', null);
  return s?.user?.id;
}

async function idActual(): Promise<string> {
  const { data } = await db().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ErrorApp('sesion');
  return id;
}

/**
 * Mensajes de Supabase Auth en palabras simples, diciendo POR QUÉ no se acepta y qué hacer.
 * Supabase responde en inglés y a veces con un código (error.code); se revisan los dos.
 */
// Correccion - Poll: estos mensajes estaban fijos en español (salian asi con la app en ingles) y el caso desconocido
// mostraba el texto crudo del servidor ("No se pudo completar: <mensaje>"). Ahora devuelve un error con codigo que la
// pantalla traduce, y el detalle desconocido solo va a la consola.
function mensajeAuth(m: string, codigo?: string, correo?: string): ErrorApp {
  const c = correo ?? '';
  const segundos = m.match(/after (\d+) seconds?/i)?.[1];
  const minimo = m.match(/at least (\d+) characters?/i)?.[1];
  if (/invalid login credentials/i.test(m)) return new ErrorApp('credenciales');
  if (codigo === 'user_already_exists' || /already registered|already exists/i.test(m)) return new ErrorApp('ya_existe', { correo: c });
  if (codigo === 'email_not_confirmed' || /email not confirmed/i.test(m)) return new ErrorApp('sin_confirmar');
  if (codigo === 'email_address_invalid' || /email address .* is invalid|invalid format|unable to validate email/i.test(m))
    return new ErrorApp('correo_invalido', { correo: c });
  if (codigo === 'weak_password' || /should contain at least one character/i.test(m)) return new ErrorApp('clave_debil');
  if (minimo) return new ErrorApp('clave_corta', { minimo });
  if (codigo === 'over_email_send_rate_limit' || /email rate limit/i.test(m)) return new ErrorApp('muchos_correos');
  if (segundos) return new ErrorApp('esperar', { segundos });
  if (codigo === 'signup_disabled' || /signups not allowed/i.test(m)) return new ErrorApp('registro_cerrado');
  if (/database error saving new user/i.test(m)) return new ErrorApp('perfil_fallo');
  return errorServidor('Cuenta', m);
}

const authReal = {
  /** Sesión guardada en el navegador (al abrir la app). */
  // Correccion - Poll: al abrir la app sin senal, leer el perfil fallaba y la sesion aparecia cerrada: no se podia
  // entrar a Mi finca ni enviar los reportes guardados. Ahora, sin senal, se usa la copia del perfil guardada la
  // ultima vez que hubo senal (la banda "Sin senal" ya avisa que lo que se ve es lo guardado).
  sesion: async (): Promise<Usuario | null> => {
    let u: { id: string; email?: string } | undefined;
    try {
      const { data } = await db().auth.getSession();
      u = data.session?.user;
    } catch (e) {
      if (!sinSenal(e)) throw e;
    }
    const id = u?.id ?? (!navigator.onLine ? idGuardado() : undefined);
    if (!id) return null;
    try {
      return await perfilDe(id, u?.email);
    } catch (e) {
      const copia = leer<Usuario | null>(clavePerfil(id), null);
      if (sinSenal(e) && copia) return copia;
      throw e;
    }
  },
  // Correccion - Poll: la pantalla no sabía si el problema era la contraseña o el correo sin confirmar. Ahora el error
  // lleva el motivo: con 'credenciales' se ofrece crear una cuenta; con 'sin_confirmar', reenviar el correo.
  ingresar: async (correo: string, clave: string): Promise<Usuario> => {
    const { data, error } = await db().auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (error) {
      const motivo = /invalid login credentials/i.test(error.message) ? 'credenciales'
        : error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message) ? 'sin_confirmar' : undefined;
      throw Object.assign(mensajeAuth(error.message, error.code, correo.trim()), { motivo });
    }
    const p = await perfilDe(data.user.id, data.user.email);
    if (!p) throw new ErrorApp('sin_perfil');
    return p;
  },
  // Correccion - Poll: cuando Supabase pide confirmar el correo, la cuenta SI se creo, pero la pantalla lo mostraba
  // como un error rojo. Ahora el aviso lleva la marca `confirmarCorreo` y la pantalla muestra "Revise su correo".
  // Correccion - Poll: el enlace del correo de confirmación llevaba a "localhost" (la dirección de pruebas del panel de
  // Supabase) y no abría. Ahora se le dice a Supabase que vuelva a la página pública (SITIO_PUBLICO).
  /** Toda cuenta nueva es agricultor (lo asegura la base). Si Supabase pide confirmar el correo, lo avisa. */
  registrarse: async (nombre: string, correo: string, clave: string, codigoDistrito: string | null): Promise<Usuario> => {
    if (clave.length < 8) throw new ErrorApp('clave_corta', { minimo: 8 });
    const { data, error } = await db().auth.signUp({
      email: correo.trim(), password: clave,
      options: { data: { nombre: nombre.trim(), codigo_distrito: codigoDistrito }, emailRedirectTo: SITIO_PUBLICO },
    });
    if (error) throw mensajeAuth(error.message, error.code, correo.trim());
    // Con "Confirm email" activo, Supabase responde sin sesión. Si el correo ya existía, responde un usuario sin identidades.
    if (data.user && data.user.identities?.length === 0) throw mensajeAuth('already registered', 'user_already_exists', correo.trim());
    if (!data.session || !data.user) {
      throw Object.assign(new ErrorApp('cuenta_creada', { correo: correo.trim() }), { confirmarCorreo: true });
    }
    const p = await perfilDe(data.user.id, data.user.email);
    if (!p) throw new ErrorApp('perfil_fallo');
    return p;
  },
  /** Vuelve a mandar el correo de confirmación (por ejemplo, si el primero llevaba a una dirección que no abría). */
  reenviarConfirmacion: async (correo: string): Promise<void> => {
    const { error } = await db().auth.resend({ type: 'signup', email: correo.trim(), options: { emailRedirectTo: SITIO_PUBLICO } });
    if (error) throw mensajeAuth(error.message, error.code, correo.trim());
  },
  // Correccion - Poll: no habia forma de recuperar una contrasena olvidada (el mensaje decia "pida ayuda al equipo"
  // sin decir como); ahora se manda un correo para elegir una nueva, y despues se guarda con cambiarClave.
  /** Manda el correo para elegir una contraseña nueva. Al abrirlo, la app lleva a #/nueva-clave. */
  olvideClave: async (correo: string): Promise<void> => {
    const { error } = await db().auth.resetPasswordForEmail(correo.trim(), { redirectTo: SITIO_PUBLICO });
    if (error) throw mensajeAuth(error.message, error.code, correo.trim());
  },
  /** Guarda la contraseña nueva de la sesión abierta con el enlace del correo. */
  cambiarClave: async (clave: string): Promise<void> => {
    if (clave.length < 8) throw new ErrorApp('clave_corta', { minimo: 8 });
    const { error } = await db().auth.updateUser({ password: clave });
    if (error) throw mensajeAuth(error.message, error.code);
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
  crearFinca: async (f: Omit<Finca, 'id' | 'usuario_id' | 'creado'>): Promise<Finca> => {
    const r = await db().from('fincas').insert(f).select().single();
    // Si la base todavía no tiene la columna fuentes_agua (migración 015 sin aplicar), se guarda sin la lista:
    // queda la fuente principal (fuente_agua), como antes.
    if (r.error && /fuentes_agua/.test(r.error.message)) {
      const { fuentes_agua: _lista, ...sinLista } = f;
      return datosDe(await db().from('fincas').insert(sinLista).select().single(), 'Guardar finca');
    }
    return datosDe(r, 'Guardar finca');
  },
  /** Cambia datos de una finca propia (RLS: solo el dueño). Por ahora, el tamaño. */
  actualizarFinca: async (id: string, cambios: Partial<Pick<Finca, 'area_ha'>>): Promise<Finca> =>
    datosDe(await db().from('fincas').update(cambios).eq('id', id).select().single(), 'Cambiar finca'),

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
    if (!fila) throw new ErrorApp('ya_cerrada');
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
    // Correccion - Poll: si la base tenia menos de 2 dias de temperatura del distrito se mostraba la serie inventada
    // del modo demo como si fuera real; ahora se devuelve solo lo que hay y la pagina avisa que falta el dato.
    return serie;
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
      if (error) throw errorServidor('Contar ' + tabla, error);
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
