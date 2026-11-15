-- =====================================================================
-- Terraformes · 006_seguridad_rls.sql
-- Quién ve y cambia qué (Row Level Security):
--   * agricultor: solo su perfil, sus fincas, sus siembras, sus notas, sus vuelos y sus reportes.
--   * tecnico:    además ve y confirma los reportes de plaga de su distrito.
--   * admin:      ve todo, cambia roles y confirma cualquier reporte.
-- Las siembras no se pueden borrar desde la web (no hay política de borrado).
-- Los extractores usan la llave service_role, que no pasa por RLS.
-- =====================================================================

-- Rol y distrito de quien hace la consulta (security definer para no chocar con el RLS de perfiles).
create or replace function public.rol_actual() returns text
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid()
$$;
create or replace function public.distrito_actual() returns text
language sql stable security definer set search_path = public as $$
  select codigo_distrito from perfiles where id = auth.uid()
$$;
create or replace function public.es_dueno_finca(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from fincas where id = f and usuario_id = auth.uid())
$$;
create or replace function public.es_dueno_siembra(s uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from siembras si join fincas fi on fi.id = si.finca_id where si.id = s and fi.usuario_id = auth.uid())
$$;

alter table perfiles       enable row level security;
alter table fincas         enable row level security;
alter table siembras       enable row level security;
alter table seguimiento    enable row level security;
alter table vuelos_dron    enable row level security;
alter table reportes_plaga enable row level security;

-- ---------- perfiles ----------
drop policy if exists "perfil propio o admin" on perfiles;
create policy "perfil propio o admin" on perfiles for select using (id = auth.uid() or rol_actual() = 'admin');
drop policy if exists "editar perfil propio o admin" on perfiles;
create policy "editar perfil propio o admin" on perfiles for update using (id = auth.uid() or rol_actual() = 'admin');

-- Nadie se sube el rol a sí mismo: solo un admin cambia roles, y nunca el suyo.
create or replace function public.proteger_rol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null then
    if coalesce(rol_actual(), '') <> 'admin' then
      raise exception 'Solo un administrador puede cambiar roles';
    end if;
    if new.id = auth.uid() then
      raise exception 'No puede cambiar su propio rol';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists proteger_rol on perfiles;
create trigger proteger_rol before update on perfiles for each row execute function public.proteger_rol();

-- ---------- fincas ----------
drop policy if exists "fincas propias" on fincas;
create policy "fincas propias" on fincas for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists "admin ve fincas" on fincas;
create policy "admin ve fincas" on fincas for select using (rol_actual() = 'admin');

-- ---------- siembras (sin borrado) ----------
drop policy if exists "ver siembras propias" on siembras;
create policy "ver siembras propias" on siembras for select using (es_dueno_finca(finca_id) or rol_actual() = 'admin');
drop policy if exists "crear siembras propias" on siembras;
create policy "crear siembras propias" on siembras for insert with check (es_dueno_finca(finca_id));
drop policy if exists "cerrar siembras propias" on siembras;
create policy "cerrar siembras propias" on siembras for update using (es_dueno_finca(finca_id)) with check (es_dueno_finca(finca_id));

-- ---------- seguimiento ----------
drop policy if exists "notas propias" on seguimiento;
create policy "notas propias" on seguimiento for select using (es_dueno_siembra(siembra_id) or rol_actual() = 'admin');
drop policy if exists "agregar notas propias" on seguimiento;
create policy "agregar notas propias" on seguimiento for insert with check (es_dueno_siembra(siembra_id));

-- ---------- vuelos de dron (los carga el servicio del dron; el agricultor solo los ve) ----------
drop policy if exists "vuelos propios" on vuelos_dron;
create policy "vuelos propios" on vuelos_dron for select using (es_dueno_finca(finca_id) or rol_actual() = 'admin');

-- ---------- reportes de plaga ----------
drop policy if exists "reportar plaga" on reportes_plaga;
create policy "reportar plaga" on reportes_plaga for insert
  with check (usuario_id = auth.uid() and (siembra_id is null or es_dueno_siembra(siembra_id)));
drop policy if exists "ver reportes" on reportes_plaga;
create policy "ver reportes" on reportes_plaga for select using (
  usuario_id = auth.uid()
  or rol_actual() = 'admin'
  or (rol_actual() = 'tecnico' and codigo_distrito = distrito_actual())
);
drop policy if exists "confirmar reportes" on reportes_plaga;
create policy "confirmar reportes" on reportes_plaga for update using (
  rol_actual() = 'admin' or (rol_actual() = 'tecnico' and codigo_distrito = distrito_actual())
);

-- ---------- extracciones: solo admin (panel de administración) ----------
drop policy if exists "admin ve extracciones" on extracciones;
create policy "admin ve extracciones" on extracciones for select using (rol_actual() = 'admin');
