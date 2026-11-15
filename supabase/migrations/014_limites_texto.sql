-- =====================================================================
-- Terraformes · 014_limites_texto.sql
-- Largo máximo de los textos que escriben los usuarios.
--
-- La web ya limita estos campos (maxLength), pero la base es la que manda: cualquiera con la llave
-- pública puede llamar a la API sin pasar por la web. Sin límite, una sola nota de cientos de miles
-- de letras llena la base y rompe las pantallas de los técnicos y del admin.
--
-- `not valid`: la regla vale para lo que se guarde desde ahora y no revisa las filas que ya existen
-- (así la migración no falla por datos de prueba viejos). Se pueden validar después con
--   alter table <tabla> validate constraint <nombre>;
-- =====================================================================

alter table perfiles       drop constraint if exists perfiles_nombre_largo;
alter table perfiles       add  constraint perfiles_nombre_largo        check (char_length(nombre) <= 80)    not valid;

alter table fincas         drop constraint if exists fincas_nombre_largo;
alter table fincas         add  constraint fincas_nombre_largo          check (char_length(nombre) <= 80)    not valid;

alter table siembras       drop constraint if exists siembras_textos_largo;
alter table siembras       add  constraint siembras_textos_largo        check (char_length(coalesce(motivo, '')) <= 500 and char_length(coalesce(unidad, '')) <= 40) not valid;

alter table seguimiento    drop constraint if exists seguimiento_nota_larga;
alter table seguimiento    add  constraint seguimiento_nota_larga       check (char_length(nota) <= 1000)    not valid;

alter table reportes_plaga drop constraint if exists reportes_plaga_sintomas_largo;
alter table reportes_plaga add  constraint reportes_plaga_sintomas_largo check (char_length(sintomas) <= 1000) not valid;
