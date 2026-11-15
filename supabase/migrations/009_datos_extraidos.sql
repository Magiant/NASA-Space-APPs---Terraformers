-- =====================================================================
-- Terraformes · 009_datos_extraidos.sql
-- Tablas que llenan los extractores (datos públicos por distrito).
--
-- Reglas para todos los extractores:
--   * La llave que une todo es codigo_distrito en formato HDX/INEC: 'CR30110'.
--   * "Sin dato" = NULL. Nunca 0 ni -999 (convertir -999 a NULL al normalizar).
--   * Las unidades van en el nombre de la columna (_c, _mm, _pct, _m, _crc...).
--   * Se guarda con UPSERT usando la llave primaria de cada tabla.
--   * Solo los extractores escriben (llave service_role); el público solo lee.
--
-- Pendientes para migraciones nuevas: plagas y mercado internacional
-- (todavía sin fuente). No editar esta migración una vez ejecutada:
-- los cambios van en 010_..., 011_..., etc.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Ubicación (HDX / INEC) — se carga una sola vez
-- ---------------------------------------------------------------------
create table if not exists distritos (
  codigo_distrito   text primary key check (codigo_distrito ~ '^CR[0-9]{5}$'),
  distrito          text not null,
  codigo_canton     text not null check (codigo_canton ~ '^CR[0-9]{3}$'),
  canton            text not null,
  codigo_provincia  text not null check (codigo_provincia ~ '^CR[0-9]$'),
  provincia         text not null,
  lat               double precision not null,   -- punto representativo (cri_adminpoints)
  lng               double precision not null,
  area_km2          numeric,
  poligono          jsonb,                       -- GeoJSON del límite (cri_admin3)
  extraido_en       timestamptz not null default now()
);
create index if not exists idx_distritos_canton on distritos (codigo_canton);
create index if not exists idx_distritos_provincia on distritos (codigo_provincia);


-- ---------------------------------------------------------------------
-- 1 y 7. Clima y temperatura — diario (Open-Meteo, NASA POWER)
-- ---------------------------------------------------------------------
create table if not exists clima_diario (
  codigo_distrito            text not null references distritos,
  fecha                      date not null,
  fuente                     text not null,      -- 'open-meteo' | 'nasa-power'
  temp_media_c               numeric,
  temp_max_c                 numeric,
  temp_min_c                 numeric,
  temp_corregida_altitud     boolean not null default false,
  lluvia_mm                  numeric check (lluvia_mm >= 0),
  humedad_relativa_pct       numeric check (humedad_relativa_pct between 0 and 100),
  radiacion_mj_m2            numeric,
  viento_ms                  numeric,
  evapotranspiracion_ref_mm  numeric,            -- ET0, para el estudio hídrico
  extraido_en                timestamptz not null default now(),
  primary key (codigo_distrito, fecha, fuente)
);
create index if not exists idx_clima_fecha on clima_diario (fecha);


-- ---------------------------------------------------------------------
-- 2. Humedad del suelo — diario/semanal (Open-Meteo, POWER, SMAP, ECOSTRESS)
-- ---------------------------------------------------------------------
create table if not exists humedad_suelo (
  codigo_distrito      text not null references distritos,
  fecha                date not null,
  fuente               text not null,      -- 'open-meteo' | 'nasa-power' | 'smap' | 'ecostress'
  profundidad          text not null,      -- 'superficie' | 'raiz' | 'perfil' | '0-7cm' ...
  humedad_m3_m3        numeric check (humedad_m3_m3 between 0 and 1),  -- volumétrica
  humedad_relativa     numeric check (humedad_relativa between 0 and 1), -- GWET* de POWER (0–1)
  percentil_sequia     numeric check (percentil_sequia between 0 and 100),
  temp_suelo_c         numeric,
  n_puntos             smallint,           -- puntos promediados dentro del distrito
  extraido_en          timestamptz not null default now(),
  primary key (codigo_distrito, fecha, fuente, profundidad)
);
create index if not exists idx_humedad_fecha on humedad_suelo (fecha);


-- ---------------------------------------------------------------------
-- 3. Mercado nacional — diario (PIMA) y semanal (CNP)
--    El mercado internacional va en una migración nueva cuando haya fuente.
-- ---------------------------------------------------------------------
create table if not exists precios_historico (
  fuente                 text not null,      -- 'pima' | 'cnp'
  mercado                text not null,      -- 'CENADA' | 'ferias' | ...
  fecha_dato             date not null,
  producto               text not null,      -- nombre unificado: 'papa'
  variedad               text not null default '',  -- 'blanca primera', '' si no aplica
  producto_original      text not null,      -- como venía en la fuente
  cultivo_id             text,               -- enlace a cultivos.id cuando exista
  unidad                 text not null,      -- 'kg', 'caja', 'malla 45 kg'
  moneda                 text not null default 'CRC',
  precio_min             numeric check (precio_min >= 0),
  precio_max             numeric check (precio_max >= 0),
  precio_moda            numeric check (precio_moda >= 0),
  precio_promedio        numeric check (precio_promedio >= 0),
  volumen_ton            numeric check (volumen_ton >= 0),
  procedencia_provincia  text,
  extraido_en            timestamptz not null default now(),
  primary key (fuente, mercado, fecha_dato, producto, variedad, unidad)
);
create index if not exists idx_precios_producto_fecha on precios_historico (producto, fecha_dato desc);


-- ---------------------------------------------------------------------
-- 4. Estudio hídrico — semanal/mensual (POWER, SMAP, ECOSTRESS vía AppEEARS)
-- ---------------------------------------------------------------------
create table if not exists agua_zona (
  codigo_distrito               text not null references distritos,
  periodo                       date not null,   -- primer día del mes o de la semana
  tipo_periodo                  text not null check (tipo_periodo in ('semana', 'mes')),
  fuente                        text not null,
  lluvia_mm                     numeric check (lluvia_mm >= 0),
  evapotranspiracion_ref_mm     numeric,         -- ET0 (POWER)
  evapotranspiracion_real_mm    numeric,         -- ECOSTRESS
  balance_mm                    numeric,         -- lluvia − evapotranspiración
  estres_hidrico_esi            numeric,         -- ECO_L4T_ESI
  extraido_en                   timestamptz not null default now(),
  primary key (codigo_distrito, periodo, tipo_periodo, fuente)
);


-- ---------------------------------------------------------------------
-- 9 y 10. Suelo y terreno por distrito — una sola vez
--   (SoilGrids, SRTM, WDPA, Decreto 41960)
-- ---------------------------------------------------------------------
create table if not exists suelos_zona (
  codigo_distrito          text primary key references distritos,
  ph                       numeric check (ph between 0 and 14),
  arcilla_pct              numeric check (arcilla_pct between 0 and 100),
  arena_pct                numeric check (arena_pct between 0 and 100),
  limo_pct                 numeric check (limo_pct between 0 and 100),
  carbono_organico_g_kg    numeric,
  nitrogeno_g_kg           numeric,
  cic_cmol_kg              numeric,        -- capacidad de intercambio catiónico
  densidad_g_cm3           numeric,
  textura                  text,           -- clase USDA calculada de arcilla/arena/limo
  n_puntos                 smallint,
  fuente                   text not null default 'soilgrids',
  extraido_en              timestamptz not null default now()
);

create table if not exists terreno_zona (
  codigo_distrito          text primary key references distritos,
  altitud_m                numeric,
  altitud_min_m            numeric,
  altitud_max_m            numeric,
  pendiente_pct            numeric check (pendiente_pct >= 0),
  area_protegida_pct       numeric check (area_protegida_pct between 0 and 100),  -- WDPA
  capacidad_uso_clase      smallint check (capacidad_uso_clase between 1 and 8),  -- I–VIII
  extraido_en              timestamptz not null default now()
);

-- Cobertura vegetal (MODIS NDVI cada 16 días): erosión y recuperación
create table if not exists cobertura_zona (
  codigo_distrito   text not null references distritos,
  fecha             date not null,
  ndvi              numeric check (ndvi between -1 and 1),
  n_puntos          smallint,
  fuente            text not null default 'modis-mod13q1',
  extraido_en       timestamptz not null default now(),
  primary key (codigo_distrito, fecha, fuente)
);


-- ---------------------------------------------------------------------
-- 8. Fenómenos naturales — amenazas fijas y alertas diarias (IMN, CNE)
-- ---------------------------------------------------------------------
create table if not exists amenazas_zona (
  codigo_distrito   text not null references distritos,
  tipo              text not null check (tipo in
                      ('inundacion', 'deslizamiento', 'sequia', 'huracan',
                       'volcan', 'sismo', 'otro')),
  nivel             text not null check (nivel in ('bajo', 'medio', 'alto', 'muy_alto')),
  meses_riesgo      smallint[],          -- {6,7,8,9,10}
  fuente            text not null,
  extraido_en       timestamptz not null default now(),
  primary key (codigo_distrito, tipo)
);

create table if not exists alertas (
  fuente            text not null,       -- 'cne' | 'imn'
  id_externo        text not null,       -- id o enlace de la alerta en la fuente
  tipo              text not null,
  nivel             text,                -- 'verde' | 'amarilla' | 'naranja' | 'roja'
  titulo            text not null,
  descripcion       text,
  codigos_distrito  text[],              -- distritos afectados
  inicio            timestamptz,
  fin               timestamptz,
  url               text,
  extraido_en       timestamptz not null default now(),
  primary key (fuente, id_externo)
);
create index if not exists idx_alertas_vigentes on alertas (fin);


-- ---------------------------------------------------------------------
-- 5 y 10. Cultivos, requisitos (EcoCrop) y rotación — una sola vez
-- ---------------------------------------------------------------------
create table if not exists cultivos (
  id                     text primary key,   -- slug: 'papa', 'frijol'
  nombre                 text not null,
  nombre_cientifico      text,
  familia                text,               -- 'Solanaceae', 'Fabaceae'...
  ciclo_dias_min         integer,
  ciclo_dias_max         integer,
  agua_ciclo_mm          numeric,            -- necesidad de agua del ciclo
  profundidad_raiz       text,               -- 'superficial' | 'media' | 'profunda'
  efecto_n               smallint check (efecto_n between -2 and 2),   -- de -2 (agota) a +2 (aporta)
  efecto_p               smallint check (efecto_p between -2 and 2),
  efecto_k               smallint check (efecto_k between -2 and 2),
  efecto_mo              smallint check (efecto_mo between -2 and 2),  -- materia orgánica
  espera_familia_ciclos  smallint,           -- ciclos antes de repetir familia
  ecocrop_id             text,
  extraido_en            timestamptz not null default now()
);

create table if not exists requisitos_cultivo (
  cultivo_id          text primary key references cultivos on delete cascade,
  temp_opt_min_c      numeric,
  temp_opt_max_c      numeric,
  temp_abs_min_c      numeric,
  temp_abs_max_c      numeric,
  lluvia_opt_min_mm   numeric,   -- anual
  lluvia_opt_max_mm   numeric,
  lluvia_abs_min_mm   numeric,
  lluvia_abs_max_mm   numeric,
  ph_opt_min          numeric,
  ph_opt_max          numeric,
  ph_abs_min          numeric,
  ph_abs_max          numeric,
  altitud_max_m       numeric,
  texturas            text[],    -- {'pesada','media','ligera'}
  drenaje             text,
  profundidad_suelo   text,
  fuente              text not null default 'ecocrop',
  extraido_en         timestamptz not null default now()
);

create table if not exists secuencias (
  cultivo_anterior    text not null references cultivos,
  cultivo_siguiente   text not null references cultivos,
  tipo                text not null check (tipo in ('recomendada', 'neutral', 'prohibida')),
  motivo              text,
  fuente              text not null default 'estudio-equipo',
  primary key (cultivo_anterior, cultivo_siguiente)
);

-- GAEZ: aptitud de la FAO y calendario de siembra por distrito
create table if not exists gaez_zona (
  codigo_distrito      text not null references distritos,
  cultivo_id           text not null references cultivos,
  aptitud_pct          numeric check (aptitud_pct between 0 and 100),
  mes_siembra          smallint check (mes_siembra between 1 and 12),
  duracion_ciclo_dias  integer,
  extraido_en          timestamptz not null default now(),
  primary key (codigo_distrito, cultivo_id)
);

-- Censo Agropecuario 2014: qué se siembra de verdad en cada cantón
create table if not exists censo_canton (
  codigo_canton     text not null check (codigo_canton ~ '^CR[0-9]{3}$'),
  cultivo_id        text not null references cultivos,
  area_ha           numeric check (area_ha >= 0),
  fincas            integer check (fincas >= 0),
  extraido_en       timestamptz not null default now(),
  primary key (codigo_canton, cultivo_id)
);


-- ---------------------------------------------------------------------
-- 6. Capacitación (INA) — manual o semanal
-- ---------------------------------------------------------------------
create table if not exists capacitaciones (
  id                bigint generated always as identity primary key,
  institucion       text not null default 'INA',
  titulo            text not null,
  tema              text,
  cultivo_id        text references cultivos,
  modalidad         text,          -- 'presencial' | 'virtual' | 'mixta'
  duracion_horas    numeric,
  provincias        text[],        -- dónde se imparte; NULL = todo el país
  url               text not null unique,
  extraido_en       timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- Resultado: aptitud zona × cultivo (lo calcula aptitud/calcular.ts)
-- ---------------------------------------------------------------------
create table if not exists aptitud (
  codigo_distrito    text not null references distritos,
  cultivo_id         text not null references cultivos,
  puntaje            numeric check (puntaje between 0 and 100),
  nivel              text check (nivel in ('excelente', 'bueno', 'no_recomendado', 'descartado')),
  nota_clima         numeric check (nota_clima between 0 and 100),
  nota_suelo         numeric check (nota_suelo between 0 and 100),
  nota_agua          numeric check (nota_agua between 0 and 100),
  nota_mercado       numeric check (nota_mercado between 0 and 100),
  nota_riesgo        numeric check (nota_riesgo between 0 and 100),
  mes_siembra        smallint check (mes_siembra between 1 and 12),
  motivo_descarte    text,         -- 'area protegida', 'no está en el Censo', ...
  calculado_en       timestamptz not null default now(),
  primary key (codigo_distrito, cultivo_id)
);
create index if not exists idx_aptitud_cultivo on aptitud (cultivo_id, puntaje desc);


-- ---------------------------------------------------------------------
-- Registro de extracciones (si 008_extracciones.sql ya la creó, se omite)
-- ---------------------------------------------------------------------
create table if not exists extracciones (
  id           bigint generated always as identity primary key,
  fuente       text not null,
  inicio       timestamptz not null default now(),
  fin          timestamptz,
  estado       text not null check (estado in ('en_curso', 'ok', 'sin_cambios', 'error')),
  registros    integer not null default 0,
  mensaje      text
);


-- ---------------------------------------------------------------------
-- Seguridad: datos públicos de solo lectura.
-- Los extractores usan la llave service_role, que no pasa por RLS.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'distritos', 'clima_diario', 'humedad_suelo', 'precios_historico',
    'agua_zona', 'suelos_zona', 'terreno_zona', 'cobertura_zona',
    'amenazas_zona', 'alertas', 'cultivos', 'requisitos_cultivo',
    'secuencias', 'gaez_zona', 'censo_canton', 'capacitaciones', 'aptitud'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "lectura publica" on %I', t);
    execute format('create policy "lectura publica" on %I for select using (true)', t);
  end loop;
end $$;

-- extracciones: interna, sin lectura pública
alter table extracciones enable row level security;