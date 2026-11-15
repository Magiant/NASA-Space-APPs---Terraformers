-- =====================================================================
-- Terraformes · 004_seguimiento.sql
-- Notas durante el ciclo de una siembra y vuelos de dron de cada finca.
-- =====================================================================

create table if not exists seguimiento (
  id          uuid primary key default gen_random_uuid(),
  siembra_id  uuid not null references siembras on delete cascade,
  fecha       date not null default current_date,
  tipo        text not null check (tipo in ('riego', 'abono', 'problema', 'otro')),
  nota        text not null check (length(trim(nota)) > 0),
  creado      timestamptz not null default now()
);
create index if not exists idx_seguimiento_siembra on seguimiento (siembra_id, fecha desc);

-- Vuelos de dron: métricas de la finca y la cuadrícula de índice verde (NDVI) por parcela.
create table if not exists vuelos_dron (
  id                uuid primary key default gen_random_uuid(),
  finca_id          uuid not null references fincas on delete cascade,
  fecha             date not null,
  ndvi_promedio     numeric check (ndvi_promedio between -1 and 1),
  pendiente_pct     numeric check (pendiente_pct >= 0),
  area_estres_pct   numeric check (area_estres_pct between 0 and 100),
  cuadricula        jsonb,          -- filas de NDVI por parcela: [[0.71, 0.68, …], …]
  creado            timestamptz not null default now()
);
create index if not exists idx_vuelos_finca on vuelos_dron (finca_id, fecha desc);
