# Capacitación del agricultor — INA (tema 6)

Dos formas de cargar la tabla `capacitaciones`, con el mismo validador y el mismo guardado:

| Comando | Cada cuánto | Qué hace |
| --- | --- | --- |
| `capacitacion-ina-web` | semanal (lunes 02:00) | Lee automáticamente los cursos de la página del Núcleo Agropecuario del INA |
| `capacitacion-ina` | a mano o semanal | Carga un CSV revisado por el equipo (cursos de otras páginas o instituciones: INTA, MAG…) |

No se escribe en Algolia.

## Fuente y decisión (revisión del 14-nov-2026)

- [Núcleo Agropecuario](https://www.ina.ac.cr/SitePages/nucleos/Agropecuario.aspx): publica, por subsector
  (Agricultura, Ganadería, Gestión de la producción agropecuaria, Forestal), tablas de "Programas de formación",
  "Capacitación" y "Curso" con nombre y total de horas. Hoy son **104 cursos**. No publica modalidad, provincia
  ni un enlace propio por curso.
- El INA no tiene `robots.txt` (responde 404) y su [política de uso](https://www.ina.ac.cr/SitePages/PoliticaSeguridad.aspx)
  no prohíbe la lectura. El extractor hace **una sola consulta por semana** a esa página pública.
- No hay API pública documentada.
- El [catálogo completo](https://www.ina.ac.cr/BusquedaCursos/SitePages/catalogosector.aspx) y la
  [programación disponible](https://www.ina.ac.cr/BusquedaCursos/SitePages/Inicio.aspx) son otras consultas
  (con JavaScript); no se usan.

**Decisión aprobada por el equipo (cambia la anterior de "solo CSV"):** se lee la página automáticamente y,
como no hay enlace por curso, cada `url` es la página oficial + un ancla con subsector, tipo y curso, por
ejemplo `…/Agropecuario.aspx#agricultura-capacitacion-cultivo-de-cafe`. Así la llave `url` es única
(un mismo título en dos pestañas recibe anclas distintas) y apunta a la página donde aparece el curso.
La página general **sin** ancla sigue rechazándose, porque no identifica un curso.

## Extractor automático (`extractores/src/capacitacion/ina-web.ts`)

Por cada curso guarda:

| Columna | Valor |
| --- | --- |
| institucion | `INA` |
| titulo | Nombre tal como aparece |
| tema | `Subsector · tipo`, p. ej. `Agricultura · Capacitación` |
| cultivo_id | Para títulos "Cultivo de X": el slug de X (`Cultivo de café` → `cafe`), **solo si existe en `cultivos`**; si no, null |
| modalidad, provincias | null (la página no los dice; no se deducen) |
| duracion_horas | Total de horas |
| url | Página oficial + `#subsector-tipo-curso` |

Si la página cambia y se leen menos de 20 cursos, falla en lugar de guardar una lista incompleta.
Títulos con dos cultivos ("Cultivo de tomate y chile") o grupos ("raíces y tubérculos") quedan con
cultivo_id null, porque la columna solo admite un cultivo.

## Cultivos que todavía no existen

`capacitaciones.cultivo_id` apunta a `cultivos` (tema 5). Si un cultivo aún no está cargado, **la fila se
guarda igual con `cultivo_id = null`** y el mensaje de `extracciones` lista cuáles faltaron (antes se
rechazaba toda la carga). Al cargar el tema 5, volver a correr el extractor para completar los vínculos.

## CSV manual (`docs/capacitacion/plantilla.csv`)

UTF-8, separado por comas. La plantilla trae solo la cabecera; un archivo con solo cabecera registra `sin_cambios`.
Campos con comas van entre comillas; comillas internas se duplican.

| Columna | Qué ingresar |
| --- | --- |
| institucion | INA (vacío se normaliza a INA) |
| titulo | Título exacto, obligatorio |
| tema | Etiqueta revisada; vacío si se desconoce |
| cultivo_id | ID de `cultivos`, como `papa`; vacío si es general o ambiguo |
| modalidad | presencial, virtual o mixta; vacío si no está confirmada |
| duracion_horas | Número positivo en horas; vacío si no hay dato |
| provincias | Códigos CR1 a CR7, separados por `\|`; por ejemplo CR1\|CR5 |
| url | Enlace individual HTTP(S), estable y verificado (o la página del INA con `#ancla`); sin duplicados |

Provincias: CR1 San José, CR2 Alajuela, CR3 Cartago, CR4 Heredia, CR5 Guanacaste, CR6 Puntarenas, CR7 Limón.
Vacío, `null`, `sin dato` y `-999` se convierten a `null`; los valores incorrectos generan error.
**Provincias null significa desconocido**, aunque el comentario de la migración 009 diga "todo el país".
Si se confirma cobertura nacional, indicar `CR1|CR2|CR3|CR4|CR5|CR6|CR7`.

## Cómo correrlo en local (desde la raíz)

```bash
npm ci
```
```bash
node --test extractores/test/capacitacion-ina.test.ts extractores/test/temas-6-y-8.test.ts
```
```bash
npm run extraer -- capacitacion-ina-web --simulacion
```
```bash
npm run extraer -- capacitacion-ina --archivo=../docs/capacitacion/ejemplo-prueba.csv --simulacion
```

- `capacitacion-ina-web --simulacion` baja la página real y muestra cuántos cursos leyó por tema, sin escribir.
  Con `--archivo=test/fixtures/ina-nucleo-agropecuario.html` usa la copia guardada (sin red).
- `ejemplo-prueba.csv` tiene tres cursos con URLs de `example.invalid`: solo valen en simulación.
- Sin `--simulacion` guarda en Supabase. Necesita en `.env` (raíz) `SUPABASE_URL` (o `VITE_SUPABASE_URL`) y
  `SUPABASE_SERVICE_ROLE_KEY`. Las rutas de `--archivo` son relativas a `extractores/`.

## Detalles del guardado

1. `ina.ts` valida todas las filas con `.pick()` de `Capacitacion` antes del primer upsert y rechaza URLs repetidas.
2. `supabase.ts` hace upsert de 250 filas con `onConflict: url` y registra la corrida en `extracciones`
   (`ina-web` o `ina-csv`). La auditoría se abre antes de leer: si no se puede abrir, no se guarda nada.
3. Pausas de 500 ms entre lotes; hasta tres reintentos con espera creciente y `Retry-After` para errores de red
   y HTTP 408/429/500/502/503/504, solo en operaciones idempotentes; timeout de 30 s por consulta.
4. Reejecutar es seguro (llave `url`); no se borran cursos que dejen de aparecer.
5. No se consulta `distritos` ni se usa Turf: son cursos, no mediciones geográficas.
