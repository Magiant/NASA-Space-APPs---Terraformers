#!/usr/bin/env bash
# Aplica en orden las migraciones de supabase/migrations/ que todavía no se han aplicado.
#
#   SUPABASE_DB_URL="postgresql://..." ./supabase/aplicar-migraciones.sh
#
# - Lleva el registro en la tabla migraciones.aplicadas (esquema propio, la API pública no lo ve).
# - Cada archivo corre en una sola transacción: si algo falla, no queda a medias y se detiene.
# - Los archivos vacíos (solo comentarios) se omiten sin registrarse: se aplicarán cuando tengan contenido.
# - Una migración ya aplicada no se vuelve a correr. Si su contenido cambió, avisa:
#   los cambios van en una migración nueva (010_..., 011_...).
# - Al final pide a la API de Supabase que recargue la lista de tablas.
set -euo pipefail

: "${SUPABASE_DB_URL:?Falta SUPABASE_DB_URL (cadena de conexión de Supabase, ver docs/migraciones.md)}"
DIR="${1:-$(dirname "$0")/migrations}"
psql_() { psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
SILENCIO="set client_min_messages = warning"  # oculta los NOTICE ("ya existe, se omite")

psql_ <<'SQL'
set client_min_messages = warning;
create schema if not exists migraciones;
create table if not exists migraciones.aplicadas (
  archivo      text primary key,
  huella       text not null,          -- sha256 del archivo al aplicarlo
  aplicada_en  timestamptz not null default now()
);
SQL

aplicadas=0
for f in $(find "$DIR" -maxdepth 1 -name '*.sql' | sort); do
  nombre=$(basename "$f")
  if [[ ! "$nombre" =~ ^[0-9]{3}_[a-z0-9_]+\.sql$ ]]; then
    echo "✘ Nombre no válido: $nombre (formato: 010_nombre_en_minusculas.sql)" >&2
    exit 1
  fi
  huella=$(sha256sum "$f" | cut -d' ' -f1)
  previa=$(psql_ -tA -c "select huella from migraciones.aplicadas where archivo = '$nombre'")

  if [[ -n "$previa" ]]; then
    if [[ "$previa" != "$huella" ]]; then
      echo "⚠ $nombre cambió después de aplicarse: NO se vuelve a correr. Ponga el cambio en una migración nueva."
    else
      echo "· $nombre ya estaba aplicada"
    fi
    continue
  fi

  if ! grep -qvE '^[[:space:]]*(--.*)?$' "$f"; then
    echo "· $nombre está vacía: se omite"
    continue
  fi

  echo "→ Aplicando $nombre"
  psql_ --single-transaction -c "$SILENCIO" -f "$f" \
    -c "insert into migraciones.aplicadas (archivo, huella) values ('$nombre', '$huella')"
  aplicadas=$((aplicadas + 1))
done

psql_ -c "notify pgrst, 'reload schema'"
echo "✔ Listo: $aplicadas migración(es) nueva(s) aplicada(s)."
