// Lectura de datos PÚBLICOS (índices de Algolia, solo lectura con la llave Search-only).
//
// Por ahora responde con datos de ejemplo. Cuando estén los índices, cada función
// se cambia por una búsqueda real con `algoliasearch` manteniendo la misma firma,
// así las pantallas no cambian. La web NUNCA escribe en Algolia.
import {
  ALERTAS, APTITUD, CAPACITACIONES, CULTIVOS, PLAGAS, PRECIOS, SIEMBRAS_ZONA, ZONAS,
} from '../datos-ejemplo/publicos';
import type {
  RegistroAlerta, RegistroAptitud, RegistroCapacitacion, RegistroCultivo, RegistroPlaga,
  RegistroPrecio, RegistroSiembraZona, RegistroZona,
} from '../tipos';

/** Simula la latencia de red para que se vean los estados de carga. */
const responder = <T,>(datos: T): Promise<T> =>
  new Promise((ok) => setTimeout(() => ok(structuredClone(datos)), 150));

const porPuntaje = (a: RegistroAptitud, b: RegistroAptitud) => b.puntaje - a.puntaje;

export const algolia = {
  /** Índice `aptitud` filtrado por distrito, del mejor al peor. */
  aptitudDeZona: (codigo: string): Promise<RegistroAptitud[]> =>
    responder(APTITUD.filter((a) => a.codigo_distrito === codigo).sort(porPuntaje)),

  /** Índice `aptitud` filtrado por cultivo: en qué zonas va mejor. */
  aptitudDeCultivo: (cultivoId: string): Promise<RegistroAptitud[]> =>
    responder(APTITUD.filter((a) => a.cultivo_id === cultivoId && a.nivel !== 'descartado').sort(porPuntaje)),

  zonas: (): Promise<RegistroZona[]> => responder(ZONAS),
  zona: (codigo: string): Promise<RegistroZona | null> =>
    responder(ZONAS.find((z) => z.codigo_distrito === codigo) ?? null),

  /** Equivale a `aroundLatLng` sobre `_geoloc`. */
  zonaCercana: (lat: number, lng: number): Promise<RegistroZona> => {
    const d = (z: RegistroZona) => (z._geoloc.lat - lat) ** 2 + (z._geoloc.lng - lng) ** 2;
    return responder([...ZONAS].sort((a, b) => d(a) - d(b))[0]);
  },

  cultivos: (): Promise<RegistroCultivo[]> =>
    responder([...CULTIVOS].sort((a, b) => a.nombre.localeCompare(b.nombre))),
  cultivo: (id: string): Promise<RegistroCultivo | null> =>
    responder(CULTIVOS.find((c) => c.id === id) ?? null),

  precios: (): Promise<RegistroPrecio[]> =>
    responder([...PRECIOS].sort((a, b) => a.producto.localeCompare(b.producto))),
  precioDeCultivo: (cultivoId: string): Promise<RegistroPrecio | null> =>
    responder(PRECIOS.find((p) => p.cultivo_id === cultivoId) ?? null),

  alertas: (codigo?: string): Promise<RegistroAlerta[]> =>
    responder(codigo ? ALERTAS.filter((a) => a.codigos_distrito.includes(codigo)) : ALERTAS),

  plagas: (): Promise<RegistroPlaga[]> => responder(PLAGAS),

  capacitaciones: (): Promise<RegistroCapacitacion[]> => responder(CAPACITACIONES),

  siembrasZona: (codigo: string): Promise<RegistroSiembraZona[]> =>
    responder(SIEMBRAS_ZONA.filter((s) => s.codigo_distrito === codigo)),
};

// Acceso directo y sincrónico para datos pequeños que casi nunca cambian
// (nombres de cultivos y plagas en formularios). Con Algolia se cargarán una vez al iniciar.
export const catalogo = {
  cultivos: CULTIVOS,
  plagas: PLAGAS,
  zonas: ZONAS,
  cultivo: (id: string) => CULTIVOS.find((c) => c.id === id),
  plaga: (id: string) => PLAGAS.find((p) => p.id === id),
  zona: (codigo: string) => ZONAS.find((z) => z.codigo_distrito === codigo),
};
