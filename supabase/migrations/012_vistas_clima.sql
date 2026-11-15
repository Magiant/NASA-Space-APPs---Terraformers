-- =====================================================================
-- Terraformes · 012_vistas_clima.sql   (tema 7 · Temperatura del sector)
-- Promedios mensuales, normales, anomalías y récords de clima_diario como VISTAS (no tablas
-- nuevas, como pide el PDF). Funcionan para las dos fuentes ('open-meteo' y 'nasa-power').
-- security_invoker = true: la vista respeta el RLS de clima_diario (lectura pública).
-- Número 012 porque 010 lo proponen plagas y mercado internacional (confirmar con el equipo).
-- =====================================================================

-- Un mes por distrito y fuente
create or replace view clima_mensual with (security_invoker = true) as
select
  codigo_distrito,
  fuente,
  date_trunc('month', fecha)::date                  as mes,
  round(avg(temp_media_c), 2)                       as temp_media_c,
  round(avg(temp_max_c), 2)                         as temp_max_media_c,
  round(avg(temp_min_c), 2)                         as temp_min_media_c,
  max(temp_max_c)                                   as temp_max_abs_c,
  min(temp_min_c)                                   as temp_min_abs_c,
  round(sum(lluvia_mm), 1)                          as lluvia_mm,
  count(*) filter (where lluvia_mm >= 1)            as dias_lluvia,
  round(sum(evapotranspiracion_ref_mm), 1)          as et0_mm,
  count(*)                                          as dias
from clima_diario
group by codigo_distrito, fuente, date_trunc('month', fecha);

-- Normal de cada mes del año (promedio de todos los años con el mes casi completo)
create or replace view clima_normales with (security_invoker = true) as
select
  codigo_distrito,
  fuente,
  extract(month from mes)::int                      as mes_num,
  count(*)                                          as anios,
  round(avg(temp_media_c), 2)                       as temp_normal_c,
  round(avg(lluvia_mm), 1)                          as lluvia_normal_mm
from clima_mensual
where dias >= 25
group by codigo_distrito, fuente, extract(month from mes);

-- Anomalía de cada mes contra su normal (positiva = más caliente / más lluvioso que lo normal)
create or replace view clima_anomalias with (security_invoker = true) as
select
  m.codigo_distrito,
  m.fuente,
  m.mes,
  m.dias,
  m.temp_media_c,
  n.temp_normal_c,
  round(m.temp_media_c - n.temp_normal_c, 2)        as anomalia_temp_c,
  m.lluvia_mm,
  n.lluvia_normal_mm,
  case when n.lluvia_normal_mm > 0
       then round(100 * (m.lluvia_mm / n.lluvia_normal_mm - 1), 1) end as anomalia_lluvia_pct,
  n.anios                                           as anios_de_normal
from clima_mensual m
join clima_normales n
  on n.codigo_distrito = m.codigo_distrito
 and n.fuente = m.fuente
 and n.mes_num = extract(month from m.mes)::int;

-- Récords por distrito y fuente, con la fecha en que ocurrieron (la primera si se repite)
create or replace view clima_records with (security_invoker = true) as
select x.codigo_distrito, x.fuente, x.record_max_c, x.fecha_max, y.record_min_c, y.fecha_min
from (
  select distinct on (codigo_distrito, fuente) codigo_distrito, fuente, temp_max_c as record_max_c, fecha as fecha_max
  from clima_diario where temp_max_c is not null
  order by codigo_distrito, fuente, temp_max_c desc, fecha
) x
join (
  select distinct on (codigo_distrito, fuente) codigo_distrito, fuente, temp_min_c as record_min_c, fecha as fecha_min
  from clima_diario where temp_min_c is not null
  order by codigo_distrito, fuente, temp_min_c asc, fecha
) y using (codigo_distrito, fuente);

grant select on clima_mensual, clima_normales, clima_anomalias, clima_records to anon, authenticated;
