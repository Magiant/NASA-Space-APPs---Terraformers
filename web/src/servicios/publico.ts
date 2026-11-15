// Lectura de los DATOS EXTRAÍDOS reales en Supabase (tablas de 009_datos_extraidos.sql y vistas de 007/012).
// Son de lectura pública: la web los lee directo con la llave anon, sin servidor propio.
// Arma los mismos registros que usan las pantallas (RegistroZona, RegistroAlerta…), así no cambian.
import { CULTIVOS } from '../datos-ejemplo/publicos';
import type { NivelRiesgo, RegistroAlerta, RegistroAptitud, RegistroCapacitacion, RegistroPrecio, RegistroSiembraZona, RegistroZona } from '../tipos';
import { guardar, leer } from './almacen';
import { datosDe, supa } from './cliente';

const db = () => supa!;
const hoy = () => new Date().toISOString().slice(0, 10);
const haceDias = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const r1 = (n: number) => Math.round(n * 10) / 10;
const prom = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

interface FilaDistrito { codigo_distrito: string; distrito: string; canton: string; provincia: string; lat: number; lng: number }

/** Registro de zona sin mediciones (para listas y el selector): nombres, ubicación y fecha. */
function zonaBase(d: FilaDistrito, actualizado: string): RegistroZona {
  return {
    objectID: `zona-${d.codigo_distrito}`,
    codigo_distrito: d.codigo_distrito, distrito: d.distrito, canton: d.canton, provincia: d.provincia,
    ubicacion: { lvl0: d.provincia, lvl1: `${d.provincia} > ${d.canton}`, lvl2: `${d.provincia} > ${d.canton} > ${d.distrito}` },
    _geoloc: { lat: d.lat, lng: d.lng },
    altitud_m: null,
    clima: { temp_media_c: null, temp_max_c: null, temp_min_c: null, lluvia_mes_mm: null, humedad_relativa_pct: null },
    humedad_suelo: { pct: null, estado: null },
    agua: { balance_mm: null, estado: null },
    suelo: { textura: null, ph: null, materia_organica: null },
    riesgos: [],
    area_protegida_pct: null,
    actualizado,
  };
}

const CLAVE_CATALOGO = 'tf-distritos-v1';

/**
 * Los 492 distritos (sin polígonos) para el selector y los nombres. Se guardan en el celular:
 * con mala señal la app abre igual con la última lista.
 */
export async function cargarDistritos(): Promise<RegistroZona[]> {
  try {
    const [filas, ultimo] = await Promise.all([
      datosDe<FilaDistrito[]>(await db().from('distritos').select('codigo_distrito,distrito,canton,provincia,lat,lng').order('codigo_distrito'), 'Leer distritos'),
      datosDe<{ fecha: string }[]>(await db().from('clima_diario').select('fecha').order('fecha', { ascending: false }).limit(1), 'Leer fecha'),
    ]);
    const actualizado = ultimo[0]?.fecha ?? hoy();
    const zonas = filas.map((d) => zonaBase(d, actualizado));
    if (zonas.length) guardar(CLAVE_CATALOGO, zonas);
    return zonas;
  } catch (e) {
    const guardadas = leer<RegistroZona[]>(CLAVE_CATALOGO, []);
    if (guardadas.length) return guardadas;
    throw e;
  }
}

const NOMBRE_AMENAZA: Record<string, string> = {
  inundacion: 'Inundación', deslizamiento: 'Deslizamiento', sequia: 'Sequía', huracan: 'Huracán', volcan: 'Volcán', sismo: 'Sismo', otro: 'Otro',
};

/** Altura del punto del distrito (Open-Meteo Elevation, 90 m) mientras el tema 9 no llena terreno_zona. */
async function altitudDe(codigo: string, lat: number, lng: number): Promise<number | null> {
  const cache = leer<Record<string, number>>('tf-altitudes', {});
  if (cache[codigo] !== undefined) return cache[codigo];
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
    const m = (await r.json()).elevation?.[0];
    if (typeof m !== 'number') return null;
    guardar('tf-altitudes', { ...cache, [codigo]: m });
    return m;
  } catch {
    return null;
  }
}

/** Ficha completa de un distrito con las mediciones reales más recientes. */
export async function zonaReal(base: RegistroZona): Promise<RegistroZona> {
  const c = base.codigo_distrito;
  const [clima, humedad, agua, suelo, terreno, amenazas] = await Promise.all([
    db().from('clima_diario').select('fecha,fuente,temp_media_c,temp_max_c,temp_min_c,lluvia_mm,humedad_relativa_pct').eq('codigo_distrito', c).gte('fecha', haceDias(30)),
    db().from('humedad_suelo').select('fecha,fuente,profundidad,humedad_m3_m3,humedad_relativa').eq('codigo_distrito', c).order('fecha', { ascending: false }).limit(30),
    db().from('agua_zona').select('periodo,balance_mm').eq('codigo_distrito', c).not('balance_mm', 'is', null).order('periodo', { ascending: false }).limit(1),
    db().from('suelos_zona').select('ph,textura,carbono_organico_g_kg').eq('codigo_distrito', c).maybeSingle(),
    db().from('terreno_zona').select('altitud_m,area_protegida_pct').eq('codigo_distrito', c).maybeSingle(),
    db().from('amenazas_zona').select('tipo,nivel').eq('codigo_distrito', c),
  ]);
  const z: RegistroZona = structuredClone(base);

  // Clima de los últimos 30 días: por día, Open-Meteo si hay; si no, NASA POWER.
  type Dia = { fecha: string; fuente: string; temp_media_c: number | null; temp_max_c: number | null; temp_min_c: number | null; lluvia_mm: number | null; humedad_relativa_pct: number | null };
  const porFecha = new Map<string, Dia>();
  for (const d of (datosDe<Dia[]>(clima, 'Leer clima') ?? []).sort((a, b) => (a.fuente === 'open-meteo' ? 1 : -1) - (b.fuente === 'open-meteo' ? 1 : -1))) porFecha.set(d.fecha, d);
  const dias = [...porFecha.values()];
  if (dias.length) {
    const v = (k: keyof Dia) => dias.map((d) => d[k]).filter((x): x is number => typeof x === 'number');
    const media = prom(v('temp_media_c')), max = prom(v('temp_max_c')), min = prom(v('temp_min_c')), hum = prom(v('humedad_relativa_pct'));
    const lluvias = v('lluvia_mm');
    z.clima = {
      temp_media_c: media === null ? null : r1(media),
      temp_max_c: max === null ? null : r1(max),
      temp_min_c: min === null ? null : r1(min),
      // Lluvia del último mes: si hay menos de 30 días, se lleva a 30 días.
      lluvia_mes_mm: lluvias.length ? Math.round((lluvias.reduce((a, b) => a + b, 0) * 30) / lluvias.length) : null,
      humedad_relativa_pct: hum === null ? null : Math.round(hum),
    };
    z.actualizado = dias.map((d) => d.fecha).sort().reverse()[0];
  }

  // Humedad del suelo: capa de 0-7 cm de Open-Meteo (m³/m³) o superficie de NASA POWER (0 a 1).
  type Hum = { fuente: string; profundidad: string; humedad_m3_m3: number | null; humedad_relativa: number | null };
  const hs = datosDe<Hum[]>(humedad, 'Leer humedad') ?? [];
  const om = hs.find((h) => h.fuente === 'open-meteo' && h.profundidad === '0-7cm' && h.humedad_m3_m3 !== null);
  const np = hs.find((h) => h.fuente === 'nasa-power' && h.profundidad === 'superficie' && h.humedad_relativa !== null);
  if (om) {
    const pct = Math.round(om.humedad_m3_m3! * 100);
    z.humedad_suelo = { pct, estado: pct < 20 ? 'seco' : pct > 40 ? 'humedo' : 'normal' };
  } else if (np) {
    const pct = Math.round(np.humedad_relativa! * 100);
    z.humedad_suelo = { pct, estado: pct < 30 ? 'seco' : pct > 70 ? 'humedo' : 'normal' };
  }

  const a = (datosDe<{ balance_mm: number }[]>(agua, 'Leer agua') ?? [])[0];
  if (a) z.agua = { balance_mm: Math.round(a.balance_mm), estado: a.balance_mm < -20 ? 'falta' : a.balance_mm > 80 ? 'sobra' : 'equilibrio' };

  const s = datosDe<{ ph: number | null; textura: string | null; carbono_organico_g_kg: number | null } | null>(suelo, 'Leer suelo');
  if (s) {
    const co = s.carbono_organico_g_kg;
    z.suelo = {
      textura: s.textura,
      ph: s.ph === null ? null : r1(s.ph),
      materia_organica: co === null ? null : co < 15 ? 'baja' : co < 30 ? 'media' : 'alta',
    };
  }

  const t = datosDe<{ altitud_m: number | null; area_protegida_pct: number | null } | null>(terreno, 'Leer terreno');
  z.altitud_m = t?.altitud_m ?? (await altitudDe(c, z._geoloc.lat, z._geoloc.lng));
  z.area_protegida_pct = t?.area_protegida_pct ?? null;

  z.riesgos = (datosDe<{ tipo: string; nivel: NivelRiesgo }[]>(amenazas, 'Leer amenazas') ?? [])
    .map((r) => ({ tipo: NOMBRE_AMENAZA[r.tipo] ?? r.tipo, nivel: r.nivel }));
  return z;
}

/** Clima del mes actual de todos los distritos (vista clima_mensual), para comparar zonas. */
export async function climaMensualDeTodos(): Promise<Map<string, { temp: number | null; lluvia: number | null }>> {
  const mes = hoy().slice(0, 8) + '01';
  const filas = datosDe<{ codigo_distrito: string; fuente: string; temp_media_c: number | null; lluvia_mm: number | null; dias: number }[]>(
    await db().from('clima_mensual').select('codigo_distrito,fuente,temp_media_c,lluvia_mm,dias').eq('mes', mes), 'Leer clima mensual');
  const r = new Map<string, { temp: number | null; lluvia: number | null }>();
  for (const f of filas.sort((a, b) => (a.fuente === 'open-meteo' ? 1 : -1) - (b.fuente === 'open-meteo' ? 1 : -1))) {
    r.set(f.codigo_distrito, { temp: f.temp_media_c, lluvia: f.lluvia_mm === null || !f.dias ? null : Math.round((f.lluvia_mm * 30) / f.dias) });
  }
  return r;
}

export async function suelosDeTodos(): Promise<Map<string, number | null>> {
  const filas = datosDe<{ codigo_distrito: string; ph: number | null }[]>(await db().from('suelos_zona').select('codigo_distrito,ph'), 'Leer suelos');
  return new Map(filas.map((f) => [f.codigo_distrito, f.ph]));
}

/** Alertas vigentes (CNE e IMN). */
/** 'pronostico_subestacional' → 'Pronóstico subestacional' (los tipos llegan como claves del extractor). */
const TIPOS_ALERTA: Record<string, string> = { pronostico_subestacional: 'Pronóstico subestacional' };
const nombreTipo = (t: string) => TIPOS_ALERTA[t] ?? (t.charAt(0).toUpperCase() + t.slice(1)).replace(/_/g, ' ');

export async function alertasReales(codigo?: string): Promise<RegistroAlerta[]> {
  let q = db().from('alertas').select('*').or(`fin.is.null,fin.gte.${new Date().toISOString()}`).order('inicio', { ascending: false });
  if (codigo) q = q.contains('codigos_distrito', [codigo]);
  const filas = datosDe<{ fuente: string; id_externo: string; tipo: string; nivel: RegistroAlerta['nivel'] | null; titulo: string; descripcion: string | null; codigos_distrito: string[] | null; inicio: string | null; fin: string | null }[]>(await q, 'Leer alertas');
  return filas.map((a) => ({
    objectID: `${a.fuente}-${a.id_externo}`,
    fuente: a.fuente.toUpperCase() === 'CNE' ? 'CNE' : 'IMN',
    tipo: nombreTipo(a.tipo), nivel: a.nivel ?? 'verde' /* sin nivel (pronósticos) = informativo */, titulo: a.titulo, descripcion: a.descripcion ?? '',
    codigos_distrito: a.codigos_distrito ?? [], inicio: a.inicio ?? hoy(), fin: a.fin,
  }));
}

/** Cursos del INA (tema 6). */
export async function capacitacionesReales(): Promise<RegistroCapacitacion[]> {
  const filas = datosDe<{ id: number; institucion: string; titulo: string; tema: string | null; cultivo_id: string | null; modalidad: RegistroCapacitacion['modalidad'] | null; duracion_horas: number | null; provincias: string[] | null; url: string }[]>(
    await db().from('capacitaciones').select('*').order('titulo'), 'Leer cursos');
  return filas.map((c) => ({
    objectID: `cap-${c.id}`, titulo: c.titulo, institucion: c.institucion, tema: c.tema ?? 'General', cultivo_id: c.cultivo_id, plaga_id: null,
    modalidad: c.modalidad ?? 'presencial', duracion_horas: c.duracion_horas ?? 0, provincias: c.provincias ?? ['Todas'], url: c.url,
  }));
}

/** Lo que están sembrando los vecinos (vista anónima siembras_zona, 007). */
export async function siembrasZonaReales(codigo: string): Promise<RegistroSiembraZona[]> {
  const filas = datosDe<{ codigo_distrito: string; cultivo_id: string; fincas: number; hectareas: number; mes_cosecha: number | null }[]>(
    await db().from('siembras_zona').select('*').eq('codigo_distrito', codigo), 'Leer siembras de la zona');
  return filas.map((f) => ({
    codigo_distrito: f.codigo_distrito, cultivo_id: f.cultivo_id, cultivo: CULTIVOS.find((c) => c.id === f.cultivo_id)?.nombre ?? f.cultivo_id,
    hectareas: Number(f.hectareas), fincas: f.fincas, mes_cosecha: f.mes_cosecha ?? 1,
  }));
}

// ------------------------------------------------------------------
// Cultivos (tema 5 + FAO EcoCrop), precios (PIMA-CENADA) y aptitud calculada
// ------------------------------------------------------------------

/**
 * Completa el catálogo de cultivos con la base: ciclo (tabla cultivos) y lluvia y pH óptimos de la FAO
 * (requisitos_cultivo, EcoCrop). La temperatura y la altitud siguen las fichas del MAG/INTA, que son las mismas
 * que usa el cálculo de aptitud. Cambia los registros en su lugar para que todas las pantallas los vean.
 */
export async function completarCultivos(): Promise<void> {
  const [cultivos, requisitos] = await Promise.all([
    db().from('cultivos').select('id,ciclo_dias_min,ciclo_dias_max'),
    db().from('requisitos_cultivo').select('cultivo_id,lluvia_opt_min_mm,lluvia_opt_max_mm,ph_opt_min,ph_opt_max'),
  ]);
  const C = new Map(datosDe<{ id: string; ciclo_dias_min: number | null; ciclo_dias_max: number | null }[]>(cultivos, 'Leer cultivos').map((c) => [c.id, c]));
  const R = new Map(datosDe<{ cultivo_id: string; lluvia_opt_min_mm: number | null; lluvia_opt_max_mm: number | null; ph_opt_min: number | null; ph_opt_max: number | null }[]>(requisitos, 'Leer requisitos').map((r) => [r.cultivo_id, r]));
  for (const c of CULTIVOS) {
    const b = C.get(c.id); const r = R.get(c.id);
    if (b?.ciclo_dias_min != null && b.ciclo_dias_max != null) { c.ciclo_dias_min = b.ciclo_dias_min; c.ciclo_dias_max = b.ciclo_dias_max; }
    if (r?.lluvia_opt_min_mm != null && r.lluvia_opt_max_mm != null) { c.lluvia_opt_min_mm = Number(r.lluvia_opt_min_mm); c.lluvia_opt_max_mm = Number(r.lluvia_opt_max_mm); }
    if (r?.ph_opt_min != null && r.ph_opt_max != null) { c.ph_opt_min = Number(r.ph_opt_min); c.ph_opt_max = Number(r.ph_opt_max); }
  }
}

interface FilaPrecio { fecha_dato: string; producto_original: string; cultivo_id: string | null; variedad: string; unidad: string; precio_promedio: number | null }

/** Último precio de cada producto del boletín PIMA-CENADA, con el del boletín anterior para la tendencia. */
export async function preciosReales(): Promise<RegistroPrecio[]> {
  const filas = datosDe<FilaPrecio[]>(
    await db().from('precios_historico').select('fecha_dato,producto_original,cultivo_id,variedad,unidad,precio_promedio')
      .eq('fuente', 'pima').gte('fecha_dato', haceDias(45)).order('fecha_dato', { ascending: false }).limit(5000),
    'Leer precios',
  );
  const grupos = new Map<string, FilaPrecio[]>();
  for (const f of filas) {
    if (f.precio_promedio == null) continue;
    const k = `${f.producto_original}|${f.unidad}`;
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(f);
  }
  return [...grupos.values()].map(([ultimo, anterior]) => {
    const precio = Math.round(Number(ultimo.precio_promedio));
    const previo = anterior ? Math.round(Number(anterior.precio_promedio)) : precio;
    const cambio = previo ? precio / previo - 1 : 0;
    return {
      objectID: `precio-pima-${ultimo.producto_original}-${ultimo.unidad}`,
      producto: ultimo.producto_original, cultivo_id: ultimo.cultivo_id, fuente: 'PIMA' as const, mercado: 'CENADA',
      unidad: ultimo.unidad, precio, precio_anterior: previo,
      tendencia: cambio > 0.02 ? 'sube' as const : cambio < -0.02 ? 'baja' as const : 'estable' as const,
      fecha: ultimo.fecha_dato,
    };
  });
}

/** Precio de referencia de un cultivo: la variedad "primera" si existe (calidad que reporta el PIMA). */
export function precioDeCultivo(precios: RegistroPrecio[], cultivoId: string): RegistroPrecio | null {
  const del = precios.filter((p) => p.cultivo_id === cultivoId);
  return del.find((p) => /primera/i.test(p.producto)) ?? del[0] ?? null;
}

/** Serie diaria de un producto del boletín (para el gráfico). */
export async function seriePrecio(producto: string, dias = 30): Promise<{ fecha: string; valor: number }[]> {
  const filas = datosDe<{ fecha_dato: string; precio_promedio: number | null }[]>(
    await db().from('precios_historico').select('fecha_dato,precio_promedio').eq('fuente', 'pima').eq('producto_original', producto)
      .gte('fecha_dato', haceDias(dias + 15)).order('fecha_dato'),
    'Leer serie de precios',
  );
  const porFecha = new Map<string, number>();
  for (const f of filas) if (f.precio_promedio != null) porFecha.set(f.fecha_dato, Math.round(Number(f.precio_promedio)));
  return [...porFecha].map(([fecha, valor]) => ({ fecha, valor }));
}

/** Fila de la tabla aptitud (extractores/src/aptitud/calcular.ts). */
export interface FilaAptitud {
  codigo_distrito: string; cultivo_id: string; puntaje: number; nivel: RegistroAptitud['nivel'];
  nota_clima: number | null; nota_suelo: number | null; nota_agua: number | null; nota_mercado: number | null; nota_riesgo: number | null;
  mes_siembra: number | null; motivo_descarte: string | null;
}

export async function aptitudDeDistrito(codigo: string): Promise<FilaAptitud[]> {
  return datosDe(await db().from('aptitud').select('*').eq('codigo_distrito', codigo), 'Leer aptitud');
}

export async function aptitudDeCultivoReal(cultivoId: string, limite = 20): Promise<FilaAptitud[]> {
  return datosDe(
    await db().from('aptitud').select('*').eq('cultivo_id', cultivoId).neq('nivel', 'descartado').order('puntaje', { ascending: false }).limit(limite),
    'Leer aptitud del cultivo',
  );
}
