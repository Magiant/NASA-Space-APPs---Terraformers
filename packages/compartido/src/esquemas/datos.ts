/**
 * Terraformes · esquemas de los datos extraídos.
 * Cada esquema corresponde a una tabla de supabase/migrations/009_datos_extraidos.sql.
 * Si cambia una tabla, se cambia aquí también (y al revés).
 *
 * Uso en un extractor:
 *   const filas = ClimaDiario.array().parse(datosNormalizados);
 */
import { z } from "zod";

// ---------------------------------------------------------------------
// Ayudantes
// ---------------------------------------------------------------------

/** Convierte -999, "", NaN o undefined en null ("sin dato", nunca 0). */
const sinDato = (v: unknown) =>
  v === -999 || v === "-999" || v === "" || v === undefined ||
  (typeof v === "number" && Number.isNaN(v))
    ? null
    : v;

/** Número opcional: acepta "sin dato" y lo guarda como null. */
const num = () => z.preprocess(sinDato, z.number().finite().nullable());
/** Número opcional con mínimo y máximo. */
const rango = (min: number, max: number) =>
  z.preprocess(sinDato, z.number().min(min).max(max).nullable());
/** Entero opcional. */
const entero = () => z.preprocess(sinDato, z.number().int().nullable());

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha AAAA-MM-DD");
const fechaHora = z.string().datetime({ offset: true });

export const CodigoDistrito = z.string().regex(/^CR\d{5}$/, "Formato CR + 5 dígitos, ej. CR30110");
export const CodigoCanton = z.string().regex(/^CR\d{3}$/, "Formato CR + 3 dígitos, ej. CR301");
export const CodigoProvincia = z.string().regex(/^CR\d$/, "Formato CR + 1 dígito, ej. CR3");
export const CultivoId = z.string().regex(/^[a-z0-9-]+$/, "Slug en minúscula, ej. 'papa'");

const mes = z.number().int().min(1).max(12);
const efecto = z.number().int().min(-2).max(2).nullable();

// ---------------------------------------------------------------------
// 0. Ubicación
// ---------------------------------------------------------------------
export const Distrito = z.object({
  codigo_distrito: CodigoDistrito,
  distrito: z.string().min(1),
  codigo_canton: CodigoCanton,
  canton: z.string().min(1),
  codigo_provincia: CodigoProvincia,
  provincia: z.string().min(1),
  // Incluye la Isla del Coco (CR60110: lat 5,53, lng −87,06), que también es un distrito.
  lat: z.number().min(5).max(11.5),
  lng: z.number().min(-87.5).max(-82.5),
  area_km2: num(),
  poligono: z.record(z.string(), z.unknown()).nullable(), // GeoJSON
});

// ---------------------------------------------------------------------
// 1 y 7. Clima y temperatura
// ---------------------------------------------------------------------
export const ClimaDiario = z.object({
  codigo_distrito: CodigoDistrito,
  fecha,
  fuente: z.enum(["open-meteo", "nasa-power"]),
  temp_media_c: rango(-10, 45),
  temp_max_c: rango(-10, 50),
  temp_min_c: rango(-15, 40),
  temp_corregida_altitud: z.boolean().default(false),
  lluvia_mm: rango(0, 1000),
  humedad_relativa_pct: rango(0, 100),
  radiacion_mj_m2: num(),
  viento_ms: rango(0, 100),
  evapotranspiracion_ref_mm: num(),
});

// ---------------------------------------------------------------------
// 2. Humedad del suelo
// ---------------------------------------------------------------------
export const HumedadSuelo = z.object({
  codigo_distrito: CodigoDistrito,
  fecha,
  fuente: z.enum(["open-meteo", "nasa-power", "smap", "ecostress"]),
  profundidad: z.string().min(1), // 'superficie' | 'raiz' | 'perfil' | '0-7cm' ...
  humedad_m3_m3: rango(0, 1),
  humedad_relativa: rango(0, 1),
  percentil_sequia: rango(0, 100),
  temp_suelo_c: rango(-10, 60),
  n_puntos: entero(),
});

// ---------------------------------------------------------------------
// 3. Mercado nacional
// ---------------------------------------------------------------------
export const Precio = z.object({
  fuente: z.enum(["pima", "cnp"]),
  mercado: z.string().min(1),
  fecha_dato: fecha,
  producto: z.string().min(1),
  variedad: z.string().default(""),
  producto_original: z.string().min(1),
  cultivo_id: CultivoId.nullable().default(null),
  unidad: z.string().min(1),
  moneda: z.string().length(3).default("CRC"),
  precio_min: rango(0, 1e9),
  precio_max: rango(0, 1e9),
  precio_moda: rango(0, 1e9),
  precio_promedio: rango(0, 1e9),
  volumen_ton: rango(0, 1e9),
  procedencia_provincia: z.string().nullable().default(null),
});

// ---------------------------------------------------------------------
// 4. Estudio hídrico
// ---------------------------------------------------------------------
export const AguaZona = z.object({
  codigo_distrito: CodigoDistrito,
  periodo: fecha,
  tipo_periodo: z.enum(["semana", "mes"]),
  fuente: z.string().min(1),
  lluvia_mm: rango(0, 5000),
  evapotranspiracion_ref_mm: num(),
  evapotranspiracion_real_mm: num(),
  balance_mm: num(),
  estres_hidrico_esi: num(),
});

// ---------------------------------------------------------------------
// 9 y 10. Suelo, terreno y cobertura
// ---------------------------------------------------------------------
export const SueloZona = z.object({
  codigo_distrito: CodigoDistrito,
  ph: rango(0, 14),
  arcilla_pct: rango(0, 100),
  arena_pct: rango(0, 100),
  limo_pct: rango(0, 100),
  carbono_organico_g_kg: num(),
  nitrogeno_g_kg: num(),
  cic_cmol_kg: num(),
  densidad_g_cm3: num(),
  textura: z.string().nullable().default(null),
  n_puntos: entero(),
  fuente: z.string().default("soilgrids"),
});

export const TerrenoZona = z.object({
  codigo_distrito: CodigoDistrito,
  altitud_m: rango(-10, 4000),
  altitud_min_m: rango(-10, 4000),
  altitud_max_m: rango(-10, 4000),
  pendiente_pct: rango(0, 500),
  area_protegida_pct: rango(0, 100),
  capacidad_uso_clase: z.number().int().min(1).max(8).nullable(),
});

export const CoberturaZona = z.object({
  codigo_distrito: CodigoDistrito,
  fecha,
  ndvi: rango(-1, 1),
  n_puntos: entero(),
  fuente: z.string().default("modis-mod13q1"),
});

// ---------------------------------------------------------------------
// 8. Fenómenos naturales
// ---------------------------------------------------------------------
export const TipoAmenaza = z.enum([
  "inundacion", "deslizamiento", "sequia", "huracan", "volcan", "sismo", "otro",
]);

export const AmenazaZona = z.object({
  codigo_distrito: CodigoDistrito,
  tipo: TipoAmenaza,
  nivel: z.enum(["bajo", "medio", "alto", "muy_alto"]),
  meses_riesgo: z.array(mes).nullable().default(null),
  fuente: z.string().min(1),
});

export const Alerta = z.object({
  fuente: z.enum(["cne", "imn"]),
  id_externo: z.string().min(1),
  tipo: z.string().min(1),
  nivel: z.enum(["verde", "amarilla", "naranja", "roja"]).nullable().default(null),
  titulo: z.string().min(1),
  descripcion: z.string().nullable().default(null),
  codigos_distrito: z.array(CodigoDistrito).nullable().default(null),
  inicio: fechaHora.nullable().default(null),
  fin: fechaHora.nullable().default(null),
  url: z.string().url().nullable().default(null),
});

// ---------------------------------------------------------------------
// 5 y 10. Cultivos, requisitos y rotación
// ---------------------------------------------------------------------
export const Cultivo = z.object({
  id: CultivoId,
  nombre: z.string().min(1),
  nombre_cientifico: z.string().nullable().default(null),
  familia: z.string().nullable().default(null),
  ciclo_dias_min: entero(),
  ciclo_dias_max: entero(),
  agua_ciclo_mm: num(),
  profundidad_raiz: z.enum(["superficial", "media", "profunda"]).nullable().default(null),
  efecto_n: efecto.default(null),
  efecto_p: efecto.default(null),
  efecto_k: efecto.default(null),
  efecto_mo: efecto.default(null),
  espera_familia_ciclos: entero(),
  ecocrop_id: z.string().nullable().default(null),
});

export const RequisitoCultivo = z.object({
  cultivo_id: CultivoId,
  temp_opt_min_c: num(),
  temp_opt_max_c: num(),
  temp_abs_min_c: num(),
  temp_abs_max_c: num(),
  lluvia_opt_min_mm: num(),
  lluvia_opt_max_mm: num(),
  lluvia_abs_min_mm: num(),
  lluvia_abs_max_mm: num(),
  ph_opt_min: rango(0, 14),
  ph_opt_max: rango(0, 14),
  ph_abs_min: rango(0, 14),
  ph_abs_max: rango(0, 14),
  altitud_max_m: num(),
  texturas: z.array(z.string()).nullable().default(null),
  drenaje: z.string().nullable().default(null),
  profundidad_suelo: z.string().nullable().default(null),
  fuente: z.string().default("ecocrop"),
});

export const Secuencia = z.object({
  cultivo_anterior: CultivoId,
  cultivo_siguiente: CultivoId,
  tipo: z.enum(["recomendada", "neutral", "prohibida"]),
  motivo: z.string().nullable().default(null),
  fuente: z.string().default("estudio-equipo"),
});

export const GaezZona = z.object({
  codigo_distrito: CodigoDistrito,
  cultivo_id: CultivoId,
  aptitud_pct: rango(0, 100),
  mes_siembra: mes.nullable(),
  duracion_ciclo_dias: entero(),
});

export const CensoCanton = z.object({
  codigo_canton: CodigoCanton,
  cultivo_id: CultivoId,
  area_ha: rango(0, 1e7),
  fincas: entero(),
});

// ---------------------------------------------------------------------
// 6. Capacitación
// ---------------------------------------------------------------------
export const Capacitacion = z.object({
  institucion: z.string().default("INA"),
  titulo: z.string().min(1),
  tema: z.string().nullable().default(null),
  cultivo_id: CultivoId.nullable().default(null),
  modalidad: z.enum(["presencial", "virtual", "mixta"]).nullable().default(null),
  duracion_horas: num(),
  provincias: z.array(z.string()).nullable().default(null),
  url: z.string().url(),
});

// ---------------------------------------------------------------------
// Resultado: aptitud zona × cultivo
// ---------------------------------------------------------------------
export const Aptitud = z.object({
  codigo_distrito: CodigoDistrito,
  cultivo_id: CultivoId,
  puntaje: rango(0, 100),
  nivel: z.enum(["excelente", "bueno", "no_recomendado", "descartado"]),
  nota_clima: rango(0, 100),
  nota_suelo: rango(0, 100),
  nota_agua: rango(0, 100),
  nota_mercado: rango(0, 100),
  nota_riesgo: rango(0, 100),
  mes_siembra: mes.nullable(),
  motivo_descarte: z.string().nullable().default(null),
});

// ---------------------------------------------------------------------
// 7. Olas de calor (013_olas_calor.sql, calculadas sobre clima_diario)
// ---------------------------------------------------------------------
export const OlaCalor = z.object({
  codigo_distrito: CodigoDistrito,
  fuente: z.enum(["open-meteo", "nasa-power"]),
  inicio: fecha,
  fin: fecha,
  dias: z.number().int().min(1),
  temp_max_media_c: rango(-10, 50),
  temp_max_pico_c: rango(-10, 50),
  umbral_c: rango(-10, 50),
  abierta: z.boolean().default(false), // la regla fin >= inicio la revisa la base (check en 013)
});

// ---------------------------------------------------------------------
// Tabla de Supabase ↔ esquema, y su llave para el upsert.
// ejecutarExtractor() usa esto para no equivocarse de tabla ni de llave.
// ---------------------------------------------------------------------
export const TABLAS = {
  distritos:          { esquema: Distrito,         claveUnica: "codigo_distrito" },
  clima_diario:       { esquema: ClimaDiario,      claveUnica: "codigo_distrito,fecha,fuente" },
  humedad_suelo:      { esquema: HumedadSuelo,     claveUnica: "codigo_distrito,fecha,fuente,profundidad" },
  precios_historico:  { esquema: Precio,           claveUnica: "fuente,mercado,fecha_dato,producto,variedad,unidad" },
  agua_zona:          { esquema: AguaZona,         claveUnica: "codigo_distrito,periodo,tipo_periodo,fuente" },
  suelos_zona:        { esquema: SueloZona,        claveUnica: "codigo_distrito" },
  terreno_zona:       { esquema: TerrenoZona,      claveUnica: "codigo_distrito" },
  cobertura_zona:     { esquema: CoberturaZona,    claveUnica: "codigo_distrito,fecha,fuente" },
  amenazas_zona:      { esquema: AmenazaZona,      claveUnica: "codigo_distrito,tipo" },
  alertas:            { esquema: Alerta,           claveUnica: "fuente,id_externo" },
  cultivos:           { esquema: Cultivo,          claveUnica: "id" },
  requisitos_cultivo: { esquema: RequisitoCultivo, claveUnica: "cultivo_id" },
  secuencias:         { esquema: Secuencia,        claveUnica: "cultivo_anterior,cultivo_siguiente" },
  gaez_zona:          { esquema: GaezZona,         claveUnica: "codigo_distrito,cultivo_id" },
  censo_canton:       { esquema: CensoCanton,      claveUnica: "codigo_canton,cultivo_id" },
  capacitaciones:     { esquema: Capacitacion,     claveUnica: "url" },
  aptitud:            { esquema: Aptitud,          claveUnica: "codigo_distrito,cultivo_id" },
  olas_calor:         { esquema: OlaCalor,         claveUnica: "codigo_distrito,fuente,inicio" },
} as const;

export type NombreTabla = keyof typeof TABLAS;

// Tipos de TypeScript inferidos de cada esquema
export type Distrito = z.infer<typeof Distrito>;
export type ClimaDiario = z.infer<typeof ClimaDiario>;
export type HumedadSuelo = z.infer<typeof HumedadSuelo>;
export type Precio = z.infer<typeof Precio>;
export type AguaZona = z.infer<typeof AguaZona>;
export type SueloZona = z.infer<typeof SueloZona>;
export type TerrenoZona = z.infer<typeof TerrenoZona>;
export type CoberturaZona = z.infer<typeof CoberturaZona>;
export type AmenazaZona = z.infer<typeof AmenazaZona>;
export type Alerta = z.infer<typeof Alerta>;
export type Cultivo = z.infer<typeof Cultivo>;
export type RequisitoCultivo = z.infer<typeof RequisitoCultivo>;
export type Secuencia = z.infer<typeof Secuencia>;
export type GaezZona = z.infer<typeof GaezZona>;
export type CensoCanton = z.infer<typeof CensoCanton>;
export type Capacitacion = z.infer<typeof Capacitacion>;
export type Aptitud = z.infer<typeof Aptitud>;
export type OlaCalor = z.infer<typeof OlaCalor>;