// Crea las cuentas de demostración para los jueces y les carga fincas, siembras, notas, reportes y
// vuelos de dron en la base REAL. Se puede correr varias veces: no duplica nada.
//
//   node --env-file=.env supabase/demo/cargar-demo.mjs
//
// Necesita en .env: VITE_SUPABASE_URL (o SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, DEMO_ADMIN_CLAVE y DEMO_TECNICO_CLAVE,
// y la migracion 019 ya aplicada (columna perfiles.es_demo).
// Las cuentas admin y técnico NO usan la contraseña pública de la demo: con el admin cualquiera podría ver los
// correos de los usuarios reales y cambiar roles, y con el técnico leería y confirmaría los reportes de plaga
// reales de su distrito.
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const llave = process.env.SUPABASE_SERVICE_ROLE_KEY
const claveAdmin = process.env.DEMO_ADMIN_CLAVE
// Correccion - Poll: el tecnico de la demo usaba la clave publica demo1234 y, por ser tecnico de CR30101, podia leer
// y confirmar los reportes de plaga reales de ese distrito; ahora su clave sale del .env, como la del admin.
const claveTecnico = process.env.DEMO_TECNICO_CLAVE
if (!url || !llave) throw new Error('Faltan SUPABASE_URL (o VITE_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY en .env')
if (!claveAdmin || claveAdmin.length < 12) throw new Error('Falta DEMO_ADMIN_CLAVE en .env (mínimo 12 caracteres)')
if (!claveTecnico || claveTecnico.length < 12) throw new Error('Falta DEMO_TECNICO_CLAVE en .env (mínimo 12 caracteres)')
const db = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } })

const CLAVE_DEMO = 'demo1234'
const USUARIOS = [
  { clave: 'agri', correo: 'agricultor@demo.cr', nombre: 'Ana Solano', rol: 'agricultor', distrito: 'CR30101', contrasena: CLAVE_DEMO },
  { clave: 'tec', correo: 'tecnico@demo.cr', nombre: 'Luis Brenes', rol: 'tecnico', distrito: 'CR30101', contrasena: claveTecnico },
  { clave: 'admin', correo: 'admin@demo.cr', nombre: 'Equipo Terraformes', rol: 'admin', distrito: null, contrasena: claveAdmin },
  { clave: 'agri2', correo: 'carlos@demo.cr', nombre: 'Carlos Mora', rol: 'agricultor', distrito: 'CR21001', contrasena: CLAVE_DEMO },
]

/** Cuadrícula de NDVI de ejemplo (0 = suelo desnudo, 1 = plantas muy sanas). */
function cuadricula(filas, cols, base, manchas) {
  return Array.from({ length: filas }, (_, f) => Array.from({ length: cols }, (_, c) => {
    const cerca = manchas.some(([mf, mc]) => Math.abs(mf - f) + Math.abs(mc - c) <= 1)
    const ruido = ((f * 7 + c * 13) % 10) / 100
    return Math.round((cerca ? base - 0.38 + ruido : base + ruido) * 100) / 100
  }))
}

const ok = (r, que) => { if (r.error) throw new Error(`${que}: ${r.error.message}`); return r.data }

// 1) Cuentas (confirmadas, sin correo de verificación) y su rol
const ids = {}
const existentes = ok(await db.auth.admin.listUsers({ perPage: 1000 }), 'listar usuarios').users
for (const u of USUARIOS) {
  let usuario = existentes.find((x) => x.email === u.correo)
  if (!usuario) {
    usuario = ok(await db.auth.admin.createUser({
      email: u.correo, password: u.contrasena, email_confirm: true,
      user_metadata: { nombre: u.nombre, codigo_distrito: u.distrito },
    }), `crear ${u.correo}`).user
    console.log(`✔ cuenta creada: ${u.correo}`)
  } else {
    ok(await db.auth.admin.updateUserById(usuario.id, { password: u.contrasena }), `actualizar ${u.correo}`)
    console.log(`· cuenta ya existía: ${u.correo}`)
  }
  ids[u.clave] = usuario.id
  // Correccion - Poll: las cuentas de demostracion quedan marcadas con es_demo (migracion 019), que el usuario no puede
  // cambiar; asi no se mezclan con los vecinos reales ni le mandan reportes al tecnico real.
  ok(await db.from('perfiles').upsert({ id: usuario.id, nombre: u.nombre, correo: u.correo, rol: u.rol, codigo_distrito: u.distrito, es_demo: true }), `perfil ${u.correo}`)
}

// 2) Datos de cada agricultor, solo si todavía no tiene fincas (no duplica)
async function sinFincas(usuarioId) {
  const r = ok(await db.from('fincas').select('id').eq('usuario_id', usuarioId).limit(1), 'leer fincas')
  return r.length === 0
}

if (await sinFincas(ids.agri)) {
  const [f1, f2] = ok(await db.from('fincas').insert([
    { usuario_id: ids.agri, nombre: 'La Esperanza', codigo_distrito: 'CR30101', area_ha: 2.5, fuente_agua: 'rio', riego: true, suelo: 'volcanico' },
    { usuario_id: ids.agri, nombre: 'El Alto', codigo_distrito: 'CR30108', area_ha: 1.2, fuente_agua: 'lluvia', riego: false, suelo: 'no_se' },
  ], { defaultToNull: false }).select('id'), 'fincas de Ana')
  const [s1] = ok(await db.from('siembras').insert([
    { finca_id: f1.id, cultivo_id: 'papa', area_ha: 1, fecha_siembra: '2026-09-01', cosecha_esperada: '2026-12-20' },
    { finca_id: f1.id, cultivo_id: 'zanahoria', area_ha: 0.5, fecha_siembra: '2026-10-05', cosecha_esperada: '2027-01-15' },
    { finca_id: f1.id, cultivo_id: 'frijol', area_ha: 1, fecha_siembra: '2026-04-20', cosecha_esperada: '2026-07-20', estado: 'finalizada', resultado: 'exitosa', cantidad: 22, unidad: 'quintales', fecha_cierre: '2026-07-25' },
    { finca_id: f2.id, cultivo_id: 'repollo', area_ha: 0.8, fecha_siembra: '2026-05-10', cosecha_esperada: '2026-08-10', estado: 'finalizada', resultado: 'perdida', cantidad: 0, unidad: 'sacos', motivo: 'Hernia de las crucíferas en casi toda la parcela.', fecha_cierre: '2026-08-02' },
    { finca_id: f2.id, cultivo_id: 'papa', area_ha: 1, fecha_siembra: '2026-01-15', cosecha_esperada: '2026-05-01', estado: 'finalizada', resultado: 'regular', cantidad: 180, unidad: 'sacos', motivo: 'Tizón tardío en abril.', fecha_cierre: '2026-05-05' },
  ], { defaultToNull: false }).select('id'), 'siembras de Ana')
  ok(await db.from('seguimiento').insert([
    { siembra_id: s1.id, fecha: '2026-09-20', tipo: 'abono', nota: 'Primera abonada con 10-30-10.' },
    { siembra_id: s1.id, fecha: '2026-10-15', tipo: 'riego', nota: 'Riego de 2 horas por poca lluvia.' },
    { siembra_id: s1.id, fecha: '2026-11-08', tipo: 'problema', nota: 'Manchas cafés en hojas de la parte baja.' },
  ], { defaultToNull: false }), 'notas de Ana')
  ok(await db.from('reportes_plaga').insert({ usuario_id: ids.agri, siembra_id: s1.id, codigo_distrito: 'CR30101', tipo: 'hongo', plaga_id: 'tizon-tardio', sintomas: 'Manchas cafés en las hojas de abajo.', gravedad: 'moderada', con_foto: false, fecha: '2026-11-08' }), 'reporte de Ana')
  ok(await db.from('vuelos_dron').insert([
    { finca_id: f1.id, fecha: '2026-11-02', ndvi_promedio: 0.71, pendiente_pct: 12, area_estres_pct: 14, cuadricula: cuadricula(6, 8, 0.78, [[1, 5], [4, 2]]) },
    { finca_id: f1.id, fecha: '2026-10-05', ndvi_promedio: 0.64, pendiente_pct: 12, area_estres_pct: 8, cuadricula: cuadricula(6, 8, 0.68, [[2, 6]]) },
  ], { defaultToNull: false }), 'vuelos de Ana')
  console.log('✔ datos de Ana: 2 fincas, 5 siembras, 3 notas, 1 reporte, 2 vuelos')
} else console.log('· Ana ya tenía datos')

if (await sinFincas(ids.agri2)) {
  ok(await db.from('fincas').insert({ usuario_id: ids.agri2, nombre: 'Finca Mora', codigo_distrito: 'CR21001', area_ha: 4, fuente_agua: 'pozo', riego: true, suelo: 'arcilloso' }), 'finca de Carlos')
  ok(await db.from('reportes_plaga').insert({ usuario_id: ids.agri2, codigo_distrito: 'CR21001', tipo: 'insecto', plaga_id: 'mosca-blanca', sintomas: 'Mosquitas blancas debajo de las hojas del chile.', gravedad: 'leve', fecha: '2026-11-11', estado: 'confirmado' }), 'reporte de Carlos')
  console.log('✔ datos de Carlos: 1 finca, 1 reporte')
} else console.log('· Carlos ya tenía datos')

console.log('Listo.')
