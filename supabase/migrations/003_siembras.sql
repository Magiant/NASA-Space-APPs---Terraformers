-- =====================================================================
-- Terraformes · 003_siembras.sql
-- Siembras de cada finca. NO se borran: al cosechar se cierran (activa → finalizada) con su
-- resultado y pasan al histórico, que mejora las recomendaciones de la zona (ver 007).
-- cultivo_id es el id del cultivo ('papa'); sin llave foránea mientras la tabla cultivos (tema 5) esté vacía.
-- =====================================================================

create table if not exists siembras (
  id                 uuid primary key default gen_random_uuid(),
  finca_id           uuid not null references fincas on delete cascade,
  cultivo_id         text not null,
  area_ha            numeric not null check (area_ha > 0),
  fecha_siembra      date not null,
  cosecha_esperada   date,
  estado             text not null default 'activa' check (estado in ('activa', 'finalizada')),
  resultado          text check (resultado in ('exitosa', 'regular', 'perdida')),
  cantidad           numeric check (cantidad >= 0),
  unidad             text,
  motivo             text,
  fecha_cierre       date,
  creado             timestamptz not null default now(),
  -- Una siembra finalizada tiene resultado y fecha de cierre; una activa, no.
  check ((estado = 'activa' and resultado is null) or (estado = 'finalizada' and resultado is not null))
);
create index if not exists idx_siembras_finca on siembras (finca_id);
create index if not exists idx_siembras_cultivo on siembras (cultivo_id, estado);
