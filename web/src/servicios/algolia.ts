// Lectura de datos PÚBLICOS para las pantallas.
//
// Con la web conectada a Supabase (modoReal) se leen las tablas reales de los extractores:
// distritos, clima, humedad del suelo, agua, suelos, terreno, amenazas, alertas, cursos, siembras de la zona,
// cultivos (ciclo, lluvia y pH de la FAO), precios del PIMA-CENADA y la tabla `aptitud` calculada.
// Lo único que sigue de ejemplo son las fichas de plagas (síntomas y control: aún no hay tabla).
// Sin llaves (modo demo) todo sale de los datos de ejemplo. La web NUNCA escribe en estas tablas.
import {
  ALERTAS, APTITUD, aptitudDeZonaEstimada, CAPACITACIONES, CULTIVOS, PLAGAS, PRECIOS, SIEMBRAS_ZONA, ZONAS,
} from '../datos-ejemplo/publicos';
import type {
  RegistroAlerta, RegistroAptitud, RegistroCapacitacion, RegistroCultivo, RegistroPlaga,
  RegistroPrecio, RegistroSiembraZona, RegistroZona,
} from '../tipos';
import { modoReal } from './cliente';
import * as publico from './publico';

/** Simula la latencia de red para que se vean los estados de carga (modo demo). */
const responder = <T,>(datos: T): Promise<T> =>
  new Promise((ok) => setTimeout(() => ok(structuredClone(datos)), 150));

const porPuntaje = (a: RegistroAptitud, b: RegistroAptitud) => b.puntaje - a.puntaje;

// Lista de distritos: en modo real se llena al abrir la app (prepararCatalogo); en demo, los de ejemplo.
let zonas: RegistroZona[] = modoReal ? [] : ZONAS;
const cacheZonas = new Map<string, Promise<RegistroZona>>();

/** Carga los 492 distritos antes de mostrar la app (con copia en el celular para abrir sin señal). */
export async function prepararCatalogo(): Promise<void> {
  if (!modoReal) return;
  const [lista] = await Promise.all([
    publico.cargarDistritos(),
    publico.completarCultivos().catch((e) => console.warn('Cultivos: se usan las fichas guardadas en la app.', e)),
  ]);
  zonas = lista;
}

// Precios del PIMA: se piden una vez por sesión.
let cachePrecios: Promise<RegistroPrecio[]> | null = null;
function preciosReales(): Promise<RegistroPrecio[]> {
  if (!cachePrecios) {
    cachePrecios = publico.preciosReales();
    cachePrecios.catch(() => { cachePrecios = null; });
  }
  return cachePrecios;
}

/**
 * Registro de aptitud con los números de la tabla `aptitud` (calculada por los extractores) sobre la forma
 * que usan las pantallas. En la web, `notas.riesgo` es "más alto = más peligro": al revés que nota_riesgo.
 */
function conFila(base: RegistroAptitud, f: publico.FilaAptitud, precios: RegistroPrecio[]): RegistroAptitud {
  const p = publico.precioDeCultivo(precios, f.cultivo_id);
  return {
    ...base,
    puntaje: Number(f.puntaje), nivel: f.nivel,
    notas: {
      clima: f.nota_clima ?? 50, suelo: f.nota_suelo ?? 50, agua: f.nota_agua ?? 50,
      mercado: f.nota_mercado ?? 50, riesgo: f.nota_riesgo == null ? 50 : 100 - f.nota_riesgo,
    },
    mes_siembra: f.mes_siembra,
    plagas_zona: [], // sin reportes confirmados públicos por distrito todavía
    precio_referencia: p ? { valor: p.precio, unidad: p.unidad, fecha: p.fecha, fuente: p.fuente } : null,
    motivo_descarte: f.motivo_descarte,
  };
}

/** Une la tabla `aptitud` con la forma de las pantallas (la estimación solo aporta nombres y ubicación). */
function aptitudesDe(z: RegistroZona, filas: publico.FilaAptitud[], precios: RegistroPrecio[]): RegistroAptitud[] {
  const base = new Map(aptitudDeZonaEstimada(z).map((a) => [a.cultivo_id, a]));
  return filas.flatMap((f) => (base.has(f.cultivo_id) ? [conFila(base.get(f.cultivo_id)!, f, precios)] : []));
}

/** Ficha completa de un distrito; se pide una sola vez por sesión. */
function zonaCompleta(codigo: string): Promise<RegistroZona | null> {
  const base = zonas.find((z) => z.codigo_distrito === codigo);
  if (!base) return Promise.resolve(null);
  if (!modoReal) return responder(base);
  if (!cacheZonas.has(codigo)) {
    const p = publico.zonaReal(base);
    p.catch(() => cacheZonas.delete(codigo)); // si falla (sin señal), se reintenta la próxima vez
    cacheZonas.set(codigo, p);
  }
  return cacheZonas.get(codigo)!;
}

export const algolia = {
  /** Cultivos del distrito, del mejor al peor (estimación con clima y suelo reales). */
  aptitudDeZona: async (codigo: string): Promise<RegistroAptitud[]> => {
    if (!modoReal) return responder(APTITUD.filter((a) => a.codigo_distrito === codigo).sort(porPuntaje));
    const [z, filas, precios] = await Promise.all([zonaCompleta(codigo), publico.aptitudDeDistrito(codigo), preciosReales().catch(() => [])]);
    if (!z) return [];
    // Si la tabla aún no tiene este distrito, se estima en el navegador con sus datos reales.
    return (filas.length ? aptitudesDe(z, filas, precios) : aptitudDeZonaEstimada(z)).sort(porPuntaje);
  },

  /** En qué distritos va mejor un cultivo (con el clima del mes y el pH de todos los distritos). */
  aptitudDeCultivo: async (cultivoId: string): Promise<RegistroAptitud[]> => {
    if (!modoReal) return responder(APTITUD.filter((a) => a.cultivo_id === cultivoId && a.nivel !== 'descartado').sort(porPuntaje));
    const [filas, precios] = await Promise.all([publico.aptitudDeCultivoReal(cultivoId), preciosReales().catch(() => [])]);
    return filas.flatMap((f) => {
      const z = zonas.find((x) => x.codigo_distrito === f.codigo_distrito);
      return z ? aptitudesDe(z, [f], precios) : [];
    });
  },

  zonas: async (): Promise<RegistroZona[]> => (modoReal ? zonas : responder(ZONAS)),
  zona: (codigo: string): Promise<RegistroZona | null> => zonaCompleta(codigo),

  /** Distrito más cercano a una coordenada (botón "Usar mi ubicación"). */
  zonaCercana: async (lat: number, lng: number): Promise<RegistroZona> => {
    const d = (z: RegistroZona) => (z._geoloc.lat - lat) ** 2 + (z._geoloc.lng - lng) ** 2;
    return [...zonas].sort((a, b) => d(a) - d(b))[0];
  },

  // ---- Cultivos: fichas de la app completadas con la base al abrir (prepararCatalogo) ----
  cultivos: (): Promise<RegistroCultivo[]> =>
    responder([...CULTIVOS].sort((a, b) => a.nombre.localeCompare(b.nombre))),
  cultivo: (id: string): Promise<RegistroCultivo | null> =>
    responder(CULTIVOS.find((c) => c.id === id) ?? null),
  precios: async (): Promise<RegistroPrecio[]> =>
    (modoReal ? await preciosReales() : await responder(PRECIOS)).sort((a, b) => a.producto.localeCompare(b.producto)),
  precioDeCultivo: async (cultivoId: string): Promise<RegistroPrecio | null> =>
    modoReal ? publico.precioDeCultivo(await preciosReales(), cultivoId) : responder(PRECIOS.find((p) => p.cultivo_id === cultivoId) ?? null),
  // ---- Todavía de ejemplo: fichas de plagas ----
  plagas: (): Promise<RegistroPlaga[]> => responder(PLAGAS),

  // ---- Con fuente real ----
  alertas: (codigo?: string): Promise<RegistroAlerta[]> =>
    modoReal ? publico.alertasReales(codigo) : responder(codigo ? ALERTAS.filter((a) => a.codigos_distrito.includes(codigo)) : ALERTAS),

  capacitaciones: (): Promise<RegistroCapacitacion[]> =>
    modoReal ? publico.capacitacionesReales() : responder(CAPACITACIONES),

  siembrasZona: (codigo: string): Promise<RegistroSiembraZona[]> =>
    modoReal ? publico.siembrasZonaReales(codigo) : responder(SIEMBRAS_ZONA.filter((s) => s.codigo_distrito === codigo)),
};

// Acceso directo y sincrónico a datos pequeños (nombres en formularios y listas).
export const catalogo = {
  cultivos: CULTIVOS,
  plagas: PLAGAS,
  get zonas() {
    return zonas;
  },
  cultivo: (id: string) => CULTIVOS.find((c) => c.id === id),
  plaga: (id: string) => PLAGAS.find((p) => p.id === id),
  zona: (codigo: string) => zonas.find((z) => z.codigo_distrito === codigo),
};
