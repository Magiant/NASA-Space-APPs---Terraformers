-- =====================================================================
-- Terraformes · 020_siembras_caben_en_finca.sql
-- Correccion - Poll: la base aceptaba siembras activas que juntas median mas que la finca (en una finca de 1 ha se
-- podian guardar dos siembras de 1 ha). La web ya lo revisa antes de guardar; esto cierra la puerta en la base, por si
-- llega una siembra desde otro telefono al mismo tiempo o directo por la API.
--   1) Una siembra activa nueva (o que cambia de area o de finca) no puede pasar lo que queda libre en la finca.
--   2) Una finca no se puede achicar a menos de lo que ya ocupan sus siembras activas.
-- Las siembras que ya estaban guardadas no se tocan: la regla solo se aplica a lo que se guarde desde ahora.
-- El mensaje empieza con "finca_sin_espacio" para que la web lo reconozca y lo explique en el idioma de la persona.
-- =====================================================================

-- 1) Siembras: lo activo de la finca, mas la siembra nueva, tiene que caber en la finca.
create or replace function public.siembra_cabe_en_finca() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  tamano  numeric;
  ocupado numeric;
begin
  if new.estado <> 'activa' then
    return new;
  end if;
  -- Bloquea la fila de la finca: si llegan dos siembras a la vez, la segunda espera y ya cuenta la primera.
  select area_ha into tamano from fincas where id = new.finca_id for update;
  select coalesce(sum(area_ha), 0) into ocupado
    from siembras
   where finca_id = new.finca_id and estado = 'activa' and id <> new.id;
  if ocupado + new.area_ha > tamano then
    raise exception 'finca_sin_espacio: la finca mide % ha, ya tiene % ha sembradas y la siembra nueva mide % ha',
      tamano, ocupado, new.area_ha
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists siembra_cabe_en_finca on siembras;
create trigger siembra_cabe_en_finca
  before insert or update of area_ha, finca_id, estado on siembras
  for each row execute function public.siembra_cabe_en_finca();

-- 2) Fincas: no se puede achicar por debajo de lo que ya tiene sembrado.
create or replace function public.finca_no_menor_que_siembras() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ocupado numeric;
begin
  if new.area_ha >= old.area_ha then
    return new;
  end if;
  select coalesce(sum(area_ha), 0) into ocupado from siembras where finca_id = new.id and estado = 'activa';
  if new.area_ha < ocupado then
    raise exception 'finca_sin_espacio: la finca tiene % ha sembradas y no puede medir % ha', ocupado, new.area_ha
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists finca_no_menor_que_siembras on fincas;
create trigger finca_no_menor_que_siembras
  before update of area_ha on fincas
  for each row execute function public.finca_no_menor_que_siembras();
