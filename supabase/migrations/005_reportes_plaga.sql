-- =====================================================================
-- Terraformes · 005_reportes_plaga.sql
-- Reportes de plaga de los agricultores. Un técnico de la zona o un admin los confirma.
-- plaga_id sin llave foránea mientras no exista la tabla de plagas (pendiente, migración 010).
-- =====================================================================

create table if not exists reportes_plaga (
  id               uuid primary key default gen_random_uuid(),
  usuario_id       uuid not null default auth.uid() references perfiles on delete cascade,
  siembra_id       uuid references siembras on delete set null,
  codigo_distrito  text not null references distritos,
  tipo             text not null check (tipo in ('insecto', 'hongo', 'bacteria', 'virus', 'nematodo', 'maleza', 'no_se')),
  plaga_id         text,
  sintomas         text not null default '',
  gravedad         text not null check (gravedad in ('leve', 'moderada', 'grave')),
  con_foto         boolean not null default false,
  fecha            date not null default current_date,
  estado           text not null default 'pendiente' check (estado in ('pendiente', 'confirmado')),
  creado           timestamptz not null default now()
);
create index if not exists idx_reportes_distrito on reportes_plaga (codigo_distrito, estado);
create index if not exists idx_reportes_usuario on reportes_plaga (usuario_id);
