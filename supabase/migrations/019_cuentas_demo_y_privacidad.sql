-- =====================================================================
-- Terraformes · 019_cuentas_demo_y_privacidad.sql
-- Correccion - Poll: tres arreglos de la segunda revision:
--   1) La 017 reconocia las cuentas de demostracion por el correo (@demo.cr), pero cada usuario puede cambiar su
--      correo en perfiles; ahora hay una marca es_demo que solo cambia la base (no el usuario).
--   2) El minimo de privacidad de "lo que siembran sus vecinos" contaba fincas: una sola persona con 3 fincas quedaba
--      expuesta. Ahora cuenta personas distintas.
--   3) Un reporte de plaga se podia mandar al distrito que fuera, aunque la persona no tuviera finca ahi; y los
--      reportes de las cuentas de demostracion le llegaban al tecnico real.
-- =====================================================================

-- 1) Marca de cuenta de demostración, protegida.
alter table perfiles add column if not exists es_demo boolean not null default false;
update perfiles set es_demo = true where correo like '%@demo.cr' and not es_demo;

create or replace function public.proteger_es_demo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.es_demo is distinct from old.es_demo and auth.uid() is not null then
    raise exception 'La marca de cuenta de demostración no se puede cambiar desde la app';
  end if;
  return new;
end $$;
drop trigger if exists proteger_es_demo on perfiles;
create trigger proteger_es_demo before update on perfiles for each row execute function public.proteger_es_demo();

-- Se usa en las reglas de reportes: corre con permisos del dueño para poder leer perfiles ajenos.
create or replace function public.es_cuenta_demo(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select es_demo from perfiles where id = uid), false);
$$;

-- 2) Vecinos: sin cuentas de demostración y solo si suman al menos 3 personas distintas.
create or replace view siembras_zona as
select
  f.codigo_distrito,
  s.cultivo_id,
  count(distinct f.id)::int                                             as fincas,
  round(sum(s.area_ha), 2)                                              as hectareas,
  mode() within group (order by extract(month from s.cosecha_esperada))::int as mes_cosecha
from siembras s
join fincas f on f.id = s.finca_id
join perfiles p on p.id = f.usuario_id
where s.estado = 'activa' and not p.es_demo
group by f.codigo_distrito, s.cultivo_id
having count(distinct f.usuario_id) >= 3;

create or replace view resultados_zona as
select
  f.codigo_distrito,
  s.cultivo_id,
  count(*) filter (where s.resultado = 'exitosa')::int  as exitosas,
  count(*) filter (where s.resultado = 'regular')::int  as regulares,
  count(*) filter (where s.resultado = 'perdida')::int  as perdidas,
  count(*)::int                                          as total
from siembras s
join fincas f on f.id = s.finca_id
join perfiles p on p.id = f.usuario_id
where s.estado = 'finalizada' and not p.es_demo
group by f.codigo_distrito, s.cultivo_id
having count(distinct f.usuario_id) >= 3;

grant select on siembras_zona, resultados_zona to anon, authenticated;

-- 3) Reportes de plaga: solo al distrito de una finca propia, y los de cuentas de demostración no le llegan a un
--    técnico real (el técnico de demostración sí los ve).
drop policy if exists "reportar plaga" on reportes_plaga;
create policy "reportar plaga" on reportes_plaga for insert
  with check (
    usuario_id = auth.uid()
    and (siembra_id is null or es_dueno_siembra(siembra_id))
    and exists (select 1 from fincas f where f.usuario_id = auth.uid() and f.codigo_distrito = reportes_plaga.codigo_distrito)
  );

drop policy if exists "ver reportes" on reportes_plaga;
create policy "ver reportes" on reportes_plaga for select using (
  usuario_id = auth.uid()
  or rol_actual() = 'admin'
  or (rol_actual() = 'tecnico' and codigo_distrito = distrito_actual()
      and (not es_cuenta_demo(usuario_id) or es_cuenta_demo(auth.uid())))
);
