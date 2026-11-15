-- =====================================================================
-- Terraformes · 007_vistas_historico.sql
-- Totales ANÓNIMOS por distrito y cultivo, de lectura pública: no muestran quién siembra ni dónde
-- está su finca. Las vistas corren con los permisos de su dueño, así suman todas las fincas.
-- =====================================================================

-- Lo que se está sembrando ahora en cada distrito ("oferta futura" en la ficha de la zona).
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
group by f.codigo_distrito, s.cultivo_id;

-- Resultados de las cosechas cerradas: el histórico que mejora la aptitud de la zona.
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
group by f.codigo_distrito, s.cultivo_id;

grant select on siembras_zona, resultados_zona to anon, authenticated;
