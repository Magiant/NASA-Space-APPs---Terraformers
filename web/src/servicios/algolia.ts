// Lectura de datos PÚBLICOS para las pantallas.
//
// Con la web conectada a Supabase (modoReal) se leen las tablas reales de los extractores:
// distritos, clima, humedad del suelo, agua, suelos, amenazas, alertas, cursos y siembras de la zona.
// Lo que todavía no tiene fuente real (cultivos, plagas, precios y la tabla `aptitud`) sigue con los
// datos de ejemplo; la aptitud se ESTIMA con el clima y el suelo reales del distrito.
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
  if (modoReal) zonas = await publico.cargarDistritos();
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
    const z = await zonaCompleta(codigo);
    return z ? aptitudDeZonaEstimada(z).sort(porPuntaje) : [];
  },

  /** En qué distritos va mejor un cultivo (con el clima del mes y el pH de todos los distritos). */
  aptitudDeCultivo: async (cultivoId: string): Promise<RegistroAptitud[]> => {
    if (!modoReal) return responder(APTITUD.filter((a) => a.cultivo_id === cultivoId && a.nivel !== 'descartado').sort(porPuntaje));
    const [clima, suelos] = await Promise.all([publico.climaMensualDeTodos(), publico.suelosDeTodos()]);
    return zonas
      .filter((z) => clima.get(z.codigo_distrito)?.temp != null)
      .flatMap((base) => {
        const c = clima.get(base.codigo_distrito)!;
        const z: RegistroZona = {
          ...base,
          clima: { ...base.clima, temp_media_c: c.temp, lluvia_mes_mm: c.lluvia },
          suelo: { ...base.suelo, ph: suelos.get(base.codigo_distrito) ?? null },
        };
        return aptitudDeZonaEstimada(z).filter((a) => a.cultivo_id === cultivoId && a.nivel !== 'descartado');
      })
      .sort(porPuntaje)
      .slice(0, 20);
  },

  zonas: async (): Promise<RegistroZona[]> => (modoReal ? zonas : responder(ZONAS)),
  zona: (codigo: string): Promise<RegistroZona | null> => zonaCompleta(codigo),

  /** Distrito más cercano a una coordenada (botón "Usar mi ubicación"). */
  zonaCercana: async (lat: number, lng: number): Promise<RegistroZona> => {
    const d = (z: RegistroZona) => (z._geoloc.lat - lat) ** 2 + (z._geoloc.lng - lng) ** 2;
    return [...zonas].sort((a, b) => d(a) - d(b))[0];
  },

  // ---- Todavía sin fuente real: datos de ejemplo ----
  cultivos: (): Promise<RegistroCultivo[]> =>
    responder([...CULTIVOS].sort((a, b) => a.nombre.localeCompare(b.nombre))),
  cultivo: (id: string): Promise<RegistroCultivo | null> =>
    responder(CULTIVOS.find((c) => c.id === id) ?? null),
  precios: (): Promise<RegistroPrecio[]> =>
    responder([...PRECIOS].sort((a, b) => a.producto.localeCompare(b.producto))),
  precioDeCultivo: (cultivoId: string): Promise<RegistroPrecio | null> =>
    responder(PRECIOS.find((p) => p.cultivo_id === cultivoId) ?? null),
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
