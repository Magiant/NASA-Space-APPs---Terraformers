-- =====================================================================
-- Terraformes · 018_proteger_cambios.sql
-- Correccion - Poll: tres huecos de permisos que la app no usa pero la API dejaba abiertos:
--   1) un técnico podía cambiarse su propio distrito y así ver y confirmar los reportes de plaga de otro;
--   2) el dueño podía borrar una finca por la API, y con ella (en cascada) todas sus siembras y su historial;
--   3) se podía volver a abrir o cambiar una siembra ya cerrada, aunque la app promete que no se puede.
-- La app no hace ninguna de las tres cosas: esto solo cierra la puerta en la base de datos.
-- =====================================================================

-- 1) El distrito de un técnico solo lo cambia un administrador.
create or replace function public.proteger_distrito_tecnico() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.codigo_distrito is distinct from old.codigo_distrito and old.rol = 'tecnico'
     and auth.uid() is not null and coalesce(rol_actual(), '') <> 'admin' then
    raise exception 'Solo un administrador puede cambiar el distrito de un técnico';
  end if;
  return new;
end $$;
drop trigger if exists proteger_distrito_tecnico on perfiles;
create trigger proteger_distrito_tecnico before update on perfiles for each row execute function public.proteger_distrito_tecnico();

-- 2) Fincas: ver, crear y cambiar las propias, pero no borrarlas (antes la regla era "for all").
drop policy if exists "fincas propias" on fincas;
drop policy if exists "ver fincas propias" on fincas;
create policy "ver fincas propias" on fincas for select using (usuario_id = auth.uid());
drop policy if exists "crear fincas propias" on fincas;
create policy "crear fincas propias" on fincas for insert with check (usuario_id = auth.uid());
drop policy if exists "cambiar fincas propias" on fincas;
create policy "cambiar fincas propias" on fincas for update using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- 3) Una siembra cerrada ya no se cambia (salvo un administrador, para corregir datos).
create or replace function public.proteger_siembra_cerrada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.estado = 'finalizada' and auth.uid() is not null and coalesce(rol_actual(), '') <> 'admin' then
    raise exception 'Esta siembra ya está cerrada y no se puede cambiar';
  end if;
  return new;
end $$;
drop trigger if exists proteger_siembra_cerrada on siembras;
create trigger proteger_siembra_cerrada before update on siembras for each row execute function public.proteger_siembra_cerrada();
