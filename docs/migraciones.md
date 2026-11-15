# Migraciones de Supabase (automáticas)

Las tablas se crean solas con GitHub Actions: cada vez que se sube a `main` o `dev` un archivo nuevo en
`supabase/migrations/`, el workflow **Migraciones de Supabase** (`.github/workflows/migraciones.yml`)
lo aplica a la base. Nadie tiene que pegar SQL a mano.

## Configuración (una sola vez, la hace quien es dueño del proyecto de Supabase)

GitHub necesita una cadena de conexión a la base para poder crear tablas.

1. En Supabase, abrir el proyecto del equipo y pulsar **Connect** (arriba).
2. Elegir **Session pooler** (no "Direct connection": GitHub Actions no tiene IPv6 y la conexión directa falla).
3. Copiar la cadena **URI**. Se ve así:
   `postgresql://postgres.<id-del-proyecto>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`
4. Cambiar `[YOUR-PASSWORD]` por la contraseña de la base de datos.
   Si nadie la recuerda: **Project Settings → Database → Reset database password**
   (no borra datos; solo cambia la contraseña).
5. En GitHub: repositorio → **Settings → Secrets and variables → Actions → New repository secret**
   - Nombre: `SUPABASE_DB_URL`
   - Valor: la cadena del paso 4.
6. Ir a la pestaña **Actions → Migraciones de Supabase → Run workflow** para aplicar las que ya existen.

> La cadena da acceso total a la base: solo va en los secretos de GitHub y en el `.env` local, nunca en el código ni en el chat.

## Cómo agregar una migración

1. Crear `supabase/migrations/0NN_nombre.sql` con el siguiente número (`010_plagas.sql`, `011_...`).
   Nombre en minúsculas, con `_`.
2. Usar `create table if not exists`, `create index if not exists`, etc.
3. Subirla a `dev` (o `main`): el workflow la aplica sola.

Reglas:
- **No editar una migración ya aplicada.** El script la detecta, avisa y no la vuelve a correr.
  Los cambios van en una migración nueva.
- Los archivos vacíos (como `001`–`008` hoy) se omiten sin registrarse: se aplicarán cuando tengan contenido.
- Cada archivo corre en una sola transacción: si falla, no queda nada a medias y el workflow sale en rojo.
- El registro de lo aplicado está en la tabla `migraciones.aplicadas` (esquema aparte, la API pública no lo ve).

## Correrlo en local (opcional)

Con `psql` instalado y la cadena en el `.env` como `SUPABASE_DB_URL`:

```bash
set -a; source .env; set +a
bash supabase/aplicar-migraciones.sh
```
