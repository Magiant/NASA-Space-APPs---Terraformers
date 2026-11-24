-- =====================================================================
-- Terraformes · 017_vecinos_sin_demo.sql
-- Correccion - Poll: las fincas de las cuentas de demostración (@demo.cr, cargadas por
-- supabase/demo/cargar-demo.mjs) se sumaban a los totales de "lo que siembran sus vecinos" y al
-- histórico de cosechas, mezclando datos inventados con los de agricultores reales. Ahora las dos
-- vistas de 007 dejan fuera esas fincas. Mismas columnas y mismo orden que en 007.
-- Correccion - Poll: en un distrito pequeño, "1 finca · 2,5 ha" o "1 perdida" decía qué sembró una persona
-- concreta y si perdió la cosecha. Ahora un total solo se publica si suma al menos 3 fincas distintas.
-- =====================================================================

create or replace view siembras_zona as
select
  f.codigo_distrito,
  s.cultivo_id,
  count(distinct f.id)::int                                             as fincas,
  round(sum(s.area_ha), 2)                                              as hectareas,
  mode() within group (order by extract(month from s.cosecha_esperada))::int as mes_cosecha
from siembras s
join fincas f on f.id = s.finca_id
where s.estado = 'activa'
  and not exists (select 1 from perfiles p where p.id = f.usuario_id and p.correo like '%@demo.cr')
group by f.codigo_distrito, s.cultivo_id
having count(distinct f.id) >= 3;

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
where s.estado = 'finalizada'
  and not exists (select 1 from perfiles p where p.id = f.usuario_id and p.correo like '%@demo.cr')
group by f.codigo_distrito, s.cultivo_id
having count(distinct f.id) >= 3;

grant select on siembras_zona, resultados_zona to anon, authenticated;
