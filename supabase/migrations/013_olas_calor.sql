-- =====================================================================
-- Terraformes · 013_olas_calor.sql   (tema 7 · Temperatura del sector)
-- Olas de calor detectadas en clima_diario por extractores/src/clima/olas.ts.
-- Ola = 3 o más días SEGUIDOS con la máxima por encima del percentil 90 de las máximas de ese
-- mes en el histórico del distrito (ver docs/temperatura-termica.md).
-- Número 013 porque 010 y 011 están reservados (plagas y mercado internacional) y 012 son las vistas de clima.
-- =====================================================================

create table if not exists olas_calor (
  codigo_distrito    text not null references distritos,
  fuente             text not null,             -- 'nasa-power' | 'open-meteo' (de dónde salió la serie)
  inicio             date not null,
  fin                date not null,
  dias               smallint not null check (dias >= 1),
  temp_max_media_c   numeric,                   -- promedio de las máximas durante la ola
  temp_max_pico_c    numeric,                   -- máxima más alta de la ola
  umbral_c           numeric,                   -- umbral del mes en que empezó
  abierta            boolean not null default false,  -- seguía al terminar la serie: puede crecer
  extraido_en        timestamptz not null default now(),
  primary key (codigo_distrito, fuente, inicio),
  check (fin >= inicio)
);
create index if not exists idx_olas_fin on olas_calor (fin desc);

alter table olas_calor enable row level security;
drop policy if exists "lectura publica" on olas_calor;
create policy "lectura publica" on olas_calor for select using (true);
