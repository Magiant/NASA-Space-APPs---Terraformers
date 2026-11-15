# Capacitación del agricultor — INA

Se carga un CSV revisado por el equipo. No se consulta automáticamente al INA ni se escribe en Algolia.

## Fuente revisada y decisión

Revisión del 14 de noviembre de 2026:

- [Núcleo Agropecuario](https://www.ina.ac.cr/SitePages/nucleos/Agropecuario.aspx): publica ID, Nombre Programas / Nombre Módulos y Total Horas. No ofrece modalidad, provincia ni URL individual en las tablas consultadas.
- [Política de uso](https://www.ina.ac.cr/SitePages/PoliticaSeguridad.aspx): no se encontró permiso específico de extracción automática ni cuotas de consultas. La lectura de [robots.txt](https://www.ina.ac.cr/robots.txt) no estuvo disponible desde la herramienta de revisión. No se concluye que el scraping esté permitido o prohibido.
- No se encontró API pública documentada para esta fuente: no hay nombres de parámetros, productos de API, autenticación ni límites confirmados que podamos implementar.
- [Catálogo completo](https://www.ina.ac.cr/BusquedaCursos/SitePages/catalogosector.aspx) no equivale a matrícula abierta. La [programación disponible](https://www.ina.ac.cr/BusquedaCursos/SitePages/Inicio.aspx) es otra consulta.

Por acuerdo con el usuario se usa CSV manual. El cargador no verifica en línea que una URL corresponda al curso: esa revisión la hace la persona que completa el CSV. No inventar enlaces, fragmentos ni parámetros para fabricar llaves únicas. Si no se consigue un enlace individual estable y verificable, dejar ese curso fuera de la carga hasta resolverlo con el equipo/INA. No usar la página general para todos los cursos: la llave única `url` los sobrescribiría.

## Cómo llenar la plantilla

Editar `docs/capacitacion/plantilla.csv` en UTF-8, separado por comas. La plantilla trae únicamente la cabecera para evitar publicar ejemplos por accidente. Campos con comas deben estar entre comillas; comillas internas se duplican. Un archivo con solo cabecera registra `sin_cambios`.

| Columna | Qué ingresar |
| --- | --- |
| institucion | INA (vacío se normaliza a INA) |
| titulo | Título exacto, obligatorio |
| tema | Etiqueta revisada: siembra, mantenimiento, cosecha, etc.; vacío si se desconoce |
| cultivo_id | ID existente en `cultivos`, como `papa`; vacío si es general o ambiguo |
| modalidad | presencial, virtual o mixta; vacío si no está confirmada |
| duracion_horas | Número positivo en horas; vacío si no hay dato |
| provincias | Códigos CR1 a CR7, separados por `|`; por ejemplo CR1\|CR5 |
| url | Enlace individual HTTP(S), estable y verificado; obligatorio y sin duplicados |

Provincias: CR1 San José, CR2 Alajuela, CR3 Cartago, CR4 Heredia, CR5 Guanacaste, CR6 Puntarenas, CR7 Limón.

Vacío, `null`, `sin dato` y `-999` se convierten a `null`; los valores incorrectos generan error. No se deduce que un curso sea virtual o nacional por aparecer en una página web. Un curso de tomate y chile no se asigna arbitrariamente a uno: el campo solo permite un cultivo; usar null hasta acordar una relación adecuada. Los IDs no se generan automáticamente a partir de títulos y deben existir en Supabase.

**Acuerdo sobre provincias:** null significa desconocido, aunque el comentario de la migración 009 diga “todo el país”. No se modificó esa migración. Quien consuma estos datos debe respetar esta distinción. Si se confirma cobertura nacional, indicar explícitamente `CR1|CR2|CR3|CR4|CR5|CR6|CR7`. La tabla no tiene campos para sede, cantón, dirección, matrícula o fechas: no se pueden representar con precisión sin una ampliación acordada del modelo.

## Ejecutar localmente (PowerShell, desde la raíz del repositorio)

Requiere Node.js 22.18 o posterior (24 en Actions) y npm.

```powershell
npm ci
node --test extractores/test/capacitacion-ina.test.ts
npm run extraer -- capacitacion-ina --archivo=../docs/capacitacion/ejemplo-prueba.csv --simulacion
```

La muestra tiene tres títulos y duraciones tomados de la página del INA: aguacate 60, café 80 y cacao 96 horas. Tema e IDs son ejemplos de normalización; las URLs de `example.invalid` son ficticias y quedan bloqueadas en cargas reales. No se han obtenido enlaces individuales verificados. La prueba rápida no requiere credenciales, no consulta Supabase y no escribe en `extracciones`. No valida la existencia de cultivos: eso se comprueba en la carga real.

Después de llenar la plantilla con datos y enlaces verificados:

```powershell
npm run extraer -- capacitacion-ina --archivo=../docs/capacitacion/plantilla.csv --simulacion
$env:SUPABASE_URL = 'https://TU-PROYECTO.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = 'TU-CLAVE-SOLO-LOCAL'
npm run extraer -- capacitacion-ina --archivo=../docs/capacitacion/plantilla.csv
```

También se admite `.env` en la raíz (ignorado por Git). Nunca pegar las claves en archivos versionados. No se usa `VITE_SUPABASE_URL` para este cargador. Las rutas de --archivo son relativas a extractores/ cuando se usa npm run extraer. Con --simulacion no se escribe en Supabase. Sin esa opción se ejecuta la carga real.

## Qué hace cada parte

1. `extractores/src/capacitacion/ina.ts` lee CSV, normaliza vacíos y tipos, valida con `.pick()` de `Capacitacion` y rechaza URLs repetidas. Valida todo el archivo antes del primer upsert; si una fila falla, ninguna capacitación del archivo se guarda.
2. `extractores/src/capacitacion/supabase.ts` conecta usando las dos variables de entorno, comprueba cultivos existentes, hace upsert de 250 filas con `onConflict: TABLAS.capacitaciones.claveUnica` (`url`) y actualiza `extracciones`.
3. La auditoría se inicia antes de leer el CSV para registrar también errores de lectura/validación. Se finaliza con `ok`, `sin_cambios` o `error`, cantidad confirmada y mensaje. Si no se puede iniciar la auditoría, no se escriben cursos. Sin credenciales o si Supabase está caído, no se puede garantizar guardar el error allí: se devuelve error en consola y código de salida 1.
4. Hay pausas de 500 ms entre lotes. Para errores de red y HTTP 408/429/500/502/503/504 hay hasta tres reintentos con espera creciente y respeto a `Retry-After`, solo para operaciones idempotentes. Cada consulta tiene timeout de 30 s. Si el servidor exige más de 60 s, se falla para reejecutar después sin consultar antes de tiempo. Son decisiones locales, no límites oficiales del INA.
5. `ina.test.ts` verifica validación, CSV, lotes, idempotencia con destino simulado, errores, reintentos y las solicitudes del cliente Supabase con transporte simulado. No prueba una base real.

Los lotes son independientes: si falla Supabase después de guardar uno, los anteriores permanecen y el registro señala cuántas filas se confirmaron. Reejecutar es seguro gracias a `url`; no hay transacción global ni borrado de cursos ausentes. Si se pierde una respuesta de red, el conteo confirmado puede ser menor al realmente guardado. Una segunda carga válida registra `ok` aunque los datos no cambien: `sin_cambios` se usa para un archivo sin filas.

No se consulta `distritos` ni se usa Turf: son cursos, no mediciones geográficas. La prueba de tres cursos sustituye a la de tres distritos permitida en el pedido.

## Integración ya incluida

En `extractores/src/main.ts`:

```ts
import { ejecutarIna } from './capacitacion/ina.js';
// Tras resolver los argumentos y ruta:
await ejecutarIna(ruta, !values.guardar);
```

En `.github/workflows/semanal.yml`:

```yaml
run: npm run extraer -- capacitacion-ina --archivo=../docs/capacitacion/plantilla.csv
```

Se ejecuta los lunes a las 02:00 de Costa Rica, o manualmente con `workflow_dispatch`. Registrar los secretos `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en GitHub Actions y subir los cambios a la rama predeterminada. El CSV debe mantenerse revisado en el repositorio; la ejecución semanal no descubre nuevos cursos. No se ha publicado ni ejecutado el workflow desde esta implementación.

Se conservaron los workspaces y dependencias existentes. La revisión de tipos cubrió los módulos de capacitación y sus pruebas; no se verificó todo el monorepo. Se conserva el cliente común de otros temas.

El CSV se lee con csv.ts, sin dependencias adicionales. Las pruebas incluyen BOM, comillas, campos multilínea y filas mal formadas.

## Integración corregida

El comando es `npm run extraer -- capacitacion-ina --archivo=../docs/capacitacion/plantilla.csv --simulacion`. Quitar `--simulacion` únicamente para cargar el CSV revisado. Se corrigieron imports para Node TypeScript nativo y se usa un lector CSV local sin dependencias adicionales. El workflow semanal conserva lunes a las 02:00 de Costa Rica y ejecuta la prueba específica antes de importar. La plantilla contiene solo cabecera: hasta llenarla, registra sin_cambios. No descarga automáticamente el catálogo INA.
