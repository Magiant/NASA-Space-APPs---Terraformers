// Formas de los datos que usa la web.
// Públicos: registros de los índices de Algolia (ver docs/contexto-web.md §5).
// Privados: tablas de usuario en Supabase (todavía por definir en detalle).

export type Nivel = 'excelente' | 'bueno' | 'no_recomendado' | 'descartado';

export interface UbicacionJerarquica {
  lvl0: string; // Provincia
  lvl1: string; // Provincia > Cantón
  lvl2: string; // Provincia > Cantón > Distrito
}

export interface Notas {
  clima: number;
  suelo: number;
  agua: number;
  mercado: number;
  riesgo: number; // más alto = más peligro
}

export interface PrecioReferencia {
  valor: number;
  unidad: string;
  fecha: string;
  fuente: 'PIMA' | 'CNP';
}

/** Índice `aptitud`: un distrito × un cultivo. */
export interface RegistroAptitud {
  objectID: string;
  cultivo: string;
  cultivo_id: string;
  familia: string;
  ubicacion: UbicacionJerarquica;
  codigo_distrito: string;
  _geoloc: { lat: number; lng: number };
  puntaje: number;
  nivel: Nivel;
  notas: Notas;
  mes_siembra: number | null;
  plagas_zona: string[];
  precio_referencia: PrecioReferencia | null;
  motivo_descarte?: string | null;
  actualizado: string;
}

export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'muy_alto';

/** Índice `zonas`: un distrito. */
export interface RegistroZona {
  objectID: string;
  codigo_distrito: string;
  distrito: string;
  canton: string;
  provincia: string;
  ubicacion: UbicacionJerarquica;
  _geoloc: { lat: number; lng: number };
  altitud_m: number;
  clima: {
    temp_media_c: number;
    temp_max_c: number;
    temp_min_c: number;
    lluvia_mes_mm: number;
    humedad_relativa_pct: number;
  };
  humedad_suelo: { pct: number; estado: 'seco' | 'normal' | 'humedo' };
  agua: { balance_mm: number; estado: 'falta' | 'equilibrio' | 'sobra' };
  suelo: { textura: string; ph: number; materia_organica: 'baja' | 'media' | 'alta' };
  riesgos: { tipo: string; nivel: NivelRiesgo }[];
  area_protegida_pct: number;
  actualizado: string;
}

/** Índice `cultivos`. */
export interface RegistroCultivo {
  objectID: string;
  id: string;
  nombre: string;
  nombre_cientifico: string;
  familia: string;
  icono: string;
  ciclo_dias_min: number;
  ciclo_dias_max: number;
  temp_opt_min_c: number;
  temp_opt_max_c: number;
  lluvia_opt_min_mm: number;
  lluvia_opt_max_mm: number;
  ph_opt_min: number;
  ph_opt_max: number;
  altitud_min_m: number;
  altitud_max_m: number;
  meses_siembra: number[];
  plagas: string[]; // ids de plagas
  efecto_suelo: string;
  actualizado: string;
}

/** Índice `precios`. */
export interface RegistroPrecio {
  objectID: string;
  producto: string;
  cultivo_id: string | null;
  fuente: 'PIMA' | 'CNP';
  mercado: string;
  unidad: string;
  precio: number;
  precio_anterior: number;
  tendencia: 'sube' | 'baja' | 'estable';
  fecha: string;
}

/** Índice `alertas`. */
export interface RegistroAlerta {
  objectID: string;
  fuente: 'CNE' | 'IMN';
  tipo: string;
  nivel: 'verde' | 'amarilla' | 'naranja' | 'roja';
  titulo: string;
  descripcion: string;
  codigos_distrito: string[];
  inicio: string;
  fin: string | null;
}

export type TipoPlaga = 'insecto' | 'hongo' | 'bacteria' | 'virus' | 'nematodo' | 'maleza';

/** Índice `plagas`. */
export interface RegistroPlaga {
  objectID: string;
  id: string;
  nombre: string;
  tipo: TipoPlaga;
  cultivos: string[]; // cultivos que ataca (hospederos)
  sintomas: string;
  control: { cultural: string[]; biologico: string[]; quimico: string[] };
  cultivos_que_cortan: string[]; // no hospederos / supresores para el siguiente ciclo
}

/** Índice `capacitaciones`. */
export interface RegistroCapacitacion {
  objectID: string;
  titulo: string;
  institucion: string;
  tema: string;
  cultivo_id: string | null;
  plaga_id: string | null;
  modalidad: 'presencial' | 'virtual' | 'mixta';
  duracion_horas: number;
  provincias: string[];
  url: string;
}

/** Índice `siembras_zona`: totales anónimos. */
export interface RegistroSiembraZona {
  codigo_distrito: string;
  cultivo_id: string;
  cultivo: string;
  hectareas: number;
  fincas: number;
  mes_cosecha: number;
}

/** Tabla `extracciones` (para administración). */
export interface Extraccion {
  id: string;
  extractor: string;
  inicio: string;
  duracion_s: number;
  estado: 'ok' | 'error' | 'parcial';
  registros: number;
  mensaje: string | null;
}

// ------------------------------------------------------------------
// Datos privados del usuario (Supabase, con RLS)
// ------------------------------------------------------------------

export type Rol = 'agricultor' | 'tecnico' | 'admin';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  codigo_distrito: string | null;
  creado: string;
}

export interface Finca {
  id: string;
  usuario_id: string;
  nombre: string;
  codigo_distrito: string;
  area_ha: number;
  fuente_agua: 'lluvia' | 'rio' | 'pozo' | 'acueducto' | 'otra';
  riego: boolean;
  suelo: 'no_se' | 'arcilloso' | 'arenoso' | 'franco' | 'volcanico';
  creado: string;
}

export type ResultadoSiembra = 'exitosa' | 'regular' | 'perdida';

export interface Siembra {
  id: string;
  finca_id: string;
  cultivo_id: string;
  area_ha: number;
  fecha_siembra: string;
  cosecha_esperada: string;
  estado: 'activa' | 'finalizada';
  resultado: ResultadoSiembra | null;
  cantidad: number | null;
  unidad: string | null;
  motivo: string | null;
  fecha_cierre: string | null;
}

export interface Seguimiento {
  id: string;
  siembra_id: string;
  fecha: string;
  tipo: 'riego' | 'abono' | 'problema' | 'otro';
  nota: string;
}

export type Gravedad = 'leve' | 'moderada' | 'grave';

export interface ReportePlaga {
  id: string;
  usuario_id: string;
  siembra_id: string | null;
  codigo_distrito: string;
  tipo: TipoPlaga | 'no_se';
  plaga_id: string | null;
  sintomas: string;
  gravedad: Gravedad;
  con_foto: boolean;
  fecha: string;
  estado: 'pendiente' | 'confirmado';
}

export interface VueloDron {
  id: string;
  finca_id: string;
  fecha: string;
  ndvi_promedio: number;
  pendiente_pct: number;
  area_estres_pct: number;
  /** Cuadrícula de la finca, fila por fila, con el NDVI de cada parcela. */
  cuadricula: number[][];
}