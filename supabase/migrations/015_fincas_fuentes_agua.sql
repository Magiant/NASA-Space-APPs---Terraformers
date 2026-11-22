-- =====================================================================
-- Terraformes · 015_fincas_fuentes_agua.sql
-- Una finca puede sacar agua de varias fuentes (lluvia y pozo, por ejemplo).
--
-- Se agrega fuentes_agua (la lista) y se mantiene fuente_agua (la principal, la primera que se marcó):
-- las versiones de la app que ya están instaladas siguen escribiendo solo fuente_agua y no se rompen.
-- En las fincas de antes, fuentes_agua queda vacía (null) y la web usa fuente_agua.
-- =====================================================================

alter table fincas add column if not exists fuentes_agua text[];

-- Solo los valores conocidos, sin repetir la lista vacía.
alter table fincas drop constraint if exists fincas_fuentes_agua_validas;
alter table fincas add constraint fincas_fuentes_agua_validas check (
  fuentes_agua is null
  or (cardinality(fuentes_agua) between 1 and 5
      and fuentes_agua <@ array['lluvia', 'rio', 'pozo', 'acueducto', 'otra']::text[])
);

-- La API de Supabase (PostgREST) vuelve a leer las columnas, para aceptar la nueva de inmediato.
notify pgrst, 'reload schema';
