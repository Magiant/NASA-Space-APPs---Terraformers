-- =====================================================================
-- Terraformes · 016_lluvia_satelite.sql
-- Lluvia diaria medida por satélite (NASA GPM IMERG), por distrito.
--
-- Va en su propia tabla y no en clima_diario: mientras se compara con Open-Meteo, no entra en las vistas,
-- el estudio hídrico, las olas de calor ni la web. Cuando se decida usarla, se suma donde convenga.
--
--   fecha     día UTC de IMERG (Costa Rica va 6 horas atrás: el día de IMERG empieza a las 6 p. m. del día anterior)
--   producto  'early' (unas horas de atraso), 'late' (~14 horas) o 'final' (~3 meses, con pluviómetros)
--   celdas    cuántas celdas de 0,1° (≈ 11 km) se promediaron para el distrito
-- =====================================================================

create table if not exists lluvia_satelite (
  codigo_distrito text        not null references distritos,
  fecha           date        not null,
  fuente          text        not null default 'imerg' check (fuente in ('imerg')),
  producto        text        not null check (producto in ('early', 'late', 'final')),
  lluvia_mm       numeric     check (lluvia_mm between 0 and 1000),
  celdas          integer     check (celdas > 0),
  extraido_en     timestamptz not null default now(),
  primary key (codigo_distrito, fecha, fuente)
);
create index if not exists idx_lluvia_satelite_fecha on lluvia_satelite (fecha);

-- Datos públicos, como el resto de lo extraído: cualquiera lee, solo los extractores (service_role) escriben.
alter table lluvia_satelite enable row level security;
drop policy if exists "lectura publica" on lluvia_satelite;
create policy "lectura publica" on lluvia_satelite for select using (true);

notify pgrst, 'reload schema';
