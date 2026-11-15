-- =====================================================================
-- Terraformes · 002_fincas.sql
-- Fincas de cada agricultor. Solo su dueño las ve y las cambia (ver 006).
-- =====================================================================

create table if not exists fincas (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null default auth.uid() references perfiles on delete cascade,
  nombre           text not null check (length(trim(nombre)) > 0),
  codigo_distrito  text not null references distritos,
  area_ha          numeric not null check (area_ha > 0),
  fuente_agua      text not null default 'lluvia' check (fuente_agua in ('lluvia', 'rio', 'pozo', 'acueducto', 'otra')),
  riego            boolean not null default false,
  suelo            text not null default 'no_se' check (suelo in ('no_se', 'arcilloso', 'arenoso', 'franco', 'volcanico')),
  creado           timestamptz not null default now()
);
create index if not exists idx_fincas_usuario on fincas (usuario_id);
create index if not exists idx_fincas_distrito on fincas (codigo_distrito);
