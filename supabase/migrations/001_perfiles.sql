-- =====================================================================
-- Terraformes · 001_perfiles.sql
-- Un perfil por cuenta de Supabase Auth. Se crea solo al registrarse (trigger).
-- Datos privados: el correo y el distrito solo los ve la persona y un administrador (ver 006).
-- =====================================================================

create table if not exists perfiles (
  id                uuid primary key references auth.users on delete cascade,
  nombre            text not null default '',
  correo            text,
  rol               text not null default 'agricultor' check (rol in ('agricultor', 'tecnico', 'admin')),
  codigo_distrito   text references distritos,
  tipo_productor    text,
  cultivos_interes  text[],
  creado            timestamptz not null default now()
);

-- Al crear una cuenta, se crea su perfil con el nombre y el distrito que mandó la web.
-- Toda cuenta nueva es 'agricultor'; los roles técnico y admin solo los da un administrador.
create or replace function public.crear_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre, correo, codigo_distrito)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    new.email,
    (select d.codigo_distrito from distritos d where d.codigo_distrito = new.raw_user_meta_data ->> 'codigo_distrito')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();
