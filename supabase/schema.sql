-- Ejecutar en Supabase > SQL Editor.
create table if not exists public.missions (
  id          bigint generated always as identity primary key,
  slug        text unique not null,
  name        text not null,
  description text,
  year        int,
  created_at  timestamptz default now()
);

alter table public.missions enable row level security;

-- Lectura pública (la anon key del frontend puede leer).
create policy "missions_public_read" on public.missions
  for select using (true);

-- Opcional: permitir inserts desde el frontend solo a usuarios autenticados.
create policy "missions_auth_insert" on public.missions
  for insert to authenticated with check (true);
