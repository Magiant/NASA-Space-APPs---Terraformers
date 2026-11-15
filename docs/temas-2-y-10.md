# Temas 2 (humedad del suelo) y 10 (compatibilidad del sector)

Extractores que llenan las tablas de `009_datos_extraidos.sql` con los esquemas de `datos.ts`. Solo agregan archivos en sus carpetas: no tocan `package.json`, `main.ts`, workflows ni archivos compartidos. Las líneas para conectarlos están abajo.

Cada archivo exporta `TABLA`, `FUENTE` (y `COLUMNAS` si la tabla es compartida) y una función `extraer…()` que devuelve filas con la forma exacta de `datos.ts`. No escriben en Supabase: eso lo hace `ejecutarExtractor()`.

## Qué hay

| Archivo | Tabla | Qué guarda | Cada cuánto | Necesita al correr |
| --- | --- | --- | --- | --- |
| `humedad/open-meteo.ts` | `humedad_suelo` | `humedad_m3_m3` y `temp_suelo_c` en `0-7cm`, `7-28cm`, `28-100cm` (fuente `open-meteo`) | Diario, últimos 7 días | `distritos` |
| `humedad/power.ts` | `humedad_suelo` | GWETTOP/ROOT/PROF → `humedad_relativa` en `superficie`, `raiz`, `perfil` (fuente `nasa-power`) | Semanal, últimos 14 días | `distritos` |
| `cargas-unicas/soilgrids.ts` | `suelos_zona` | pH, arcilla, arena, limo, carbono, nitrógeno, CIC, densidad, textura USDA | Una vez | `distritos` |
| `cargas-unicas/ecocrop-requisitos.ts` | `requisitos_cultivo` | Temperatura, lluvia y pH (óptimo y absoluto), altitud máxima, texturas, drenaje, profundidad | Una vez | `cultivos` (tema 5) |
| `cargas-unicas/gaez.ts` | `gaez_zona` | Aptitud FAO (%), mes de siembra, duración del ciclo | Una vez | `distritos`, `cultivos` |
| `cargas-unicas/capacidad-uso.ts` | `terreno_zona` (solo `capacidad_uso_clase`) | Clase I–VIII indicativa del Decreto 41960 | Una vez | `terreno_zona.pendiente_pct` (tema 9), `suelos_zona` |
| `cargas-unicas/areas-protegidas.ts` | `terreno_zona` (solo `area_protegida_pct`) | % del distrito en áreas protegidas | Una vez | `distritos`, `WDPA_API_TOKEN` |
| `cargas-unicas/censo.ts` | `censo_canton` | Área (ha) y fincas por cantón y cultivo | Una vez | Excel del Censo 2014 bajado a mano, `distritos`, `cultivos` |
| `humedad/utilidades.ts` | — | Puntos dentro del polígono, consultas con reintento, promedios | — | — |
| `humedad/smap.ts` | — | No hecho (opcional): requiere cuenta Earthdata | — | — |

**Orden de carga:** tema 0 (`distritos`) → tema 5 (`cultivos`) y tema 9 (pendiente) → `soilgrids` → `ecocrop-requisitos`, `gaez`, `censo`, `areas-protegidas` → `capacidad-uso` (usa la pendiente y el suelo ya guardados). Si algo se corre antes, no se rompe: guarda menos filas.

## Líneas para el líder

Usan la base común del tema 1 (rama `feat/base-extractores-clima`): `ejecutarExtractor()` de `comun/ejecutar.ts`, `cargarDistritos()` de `comun/distritos.ts` y `obtenerSupabase()`. **Se conectan después de que esa rama esté en `dev`.**

`extractores/src/main.ts`: agregar al objeto `EXTRACTORES` (Node ≥ 22.18 corre los `.ts` tal cual):

```ts
  // Temas 2 y 10 · Humedad del suelo y compatibilidad del sector (docs/temas-2-y-10.md)
  'humedad-open-meteo': (a) => correr(a, 'humedad-open-meteo', import('./humedad/open-meteo.ts').then((m) => cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo }).then(m.extraerHumedadOpenMeteo)), 'humedad_suelo'),
  'humedad-power':      (a) => correr(a, 'humedad-power', import('./humedad/power.ts').then((m) => cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo }).then(m.extraerHumedadPower)), 'humedad_suelo'),
  'soilgrids':          (a) => correr(a, 'soilgrids', import('./cargas-unicas/soilgrids.ts').then((m) => cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo }).then(m.extraerSuelos)), 'suelos_zona'),
  'ecocrop':            (a) => correr(a, 'ecocrop', import('./cargas-unicas/ecocrop-requisitos.ts').then(async (m) => m.extraerRequisitos(await leer('cultivos'))), 'requisitos_cultivo'),
  'gaez':               (a) => correr(a, 'fao-gaez', import('./cargas-unicas/gaez.ts').then(async (m) => m.extraerGaez(await cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo }), await leer('cultivos'))), 'gaez_zona'),
  'areas-protegidas':   (a) => correr(a, 'wdpa', import('./cargas-unicas/areas-protegidas.ts').then((m) => cargarDistritos({ codigos: a.distritos, archivo: a.distritosArchivo }).then((d) => m.extraerAreasProtegidas(d))), 'terreno_zona', ['area_protegida_pct']),
  'censo':              (a) => correr(a, 'inec-censo-2014', import('./cargas-unicas/censo.ts').then(async (m) => m.extraerCenso(process.env.CENSO_EXCEL!, await cargarDistritos(), await leer('cultivos'))), 'censo_canton'),
  'capacidad-uso':      (a) => correr(a, 'decreto-41960', import('./cargas-unicas/capacidad-uso.ts').then(async (m) => m.calcularCapacidadUso(await leer('terreno_zona'), await leer('suelos_zona'))), 'terreno_zona', ['capacidad_uso_clase']),
```

Y estos dos ayudantes en el mismo `main.ts` (o en `comun/`):

```ts
import { ejecutarExtractor } from './comun/ejecutar.ts'
import { cargarDistritos } from './comun/distritos.ts'
import { obtenerSupabase } from './comun/supabase.ts'
import type { NombreTabla } from '@terraformes/compartido'

/** Lee una tabla completa (todas tienen < 1000 filas: cultivos, suelos_zona, terreno_zona). */
const leer = async (t: string) => { const { data, error } = await obtenerSupabase().from(t).select('*'); if (error) throw error; return data as any[] }
/** Corre un extractor de los temas 2 y 10 con el patrón común: validar con Zod → upsert por lotes → extracciones. */
const correr = async (a: Argumentos, fuente: string, filas: Promise<unknown[]>, tabla: NombreTabla, columnas?: string[]) =>
  void (await ejecutarExtractor({ fuente, tabla, columnas, lotes: [await filas], simulacion: a.simulacion }))
```

Workflows (pasos, con el comando del tema 1):

```yaml
# diario.yml
- run: npm run extraer -- humedad-open-meteo
# semanal.yml
- run: npm run extraer -- humedad-power
# unica-vez.yml (el actions/cache sobre extractores/.cache/ evita volver a bajar los mapas de SoilGrids)
- run: npm run extraer -- soilgrids
- run: npm run extraer -- ecocrop
- run: npm run extraer -- gaez
- run: npm run extraer -- areas-protegidas   # env: WDPA_API_TOKEN: ${{ secrets.WDPA_API_TOKEN }}
- run: npm run extraer -- capacidad-uso
# El censo se corre en local con el Excel bajado a mano: CENSO_EXCEL=ruta/al/cuadro.xlsx npm run extraer -- censo
```

Probar sin Supabase: agregar `--simulacion --distritos-archivo=test/fixtures/distritos-muestra.json`.

Dependencias que faltan en `extractores/package.json` (`@turf/turf` ya está):

```json
"geotiff": "^2.1.3",
"xlsx": "file:vendor/xlsx-0.20.3.tgz"
```

SheetJS recomienda instalarlo desde su CDN, no desde npm (la versión de npm está desactualizada y tiene fallas de seguridad). npm 12 no instala URLs remotas: bajar `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (sha256 `8dc73fc3…99fe8`) a `extractores/vendor/` y usar la ruta `file:`.

Variables de entorno nuevas: `WDPA_API_TOKEN` (token gratis en <https://api.protectedplanet.net/request>), solo para `areas-protegidas`.

## Reglas y supuestos (para validar con el equipo)

| Código | Regla |
| --- | --- |
| PTS-01 | Puntos por distrito = 5 + 1 por cada 25 km², máximo 20, en una rejilla regular dentro del polígono (siempre los mismos puntos: correr dos veces da lo mismo). Sin polígono: el punto del distrito. |
| POW-01 | POWER da un valor por celda de 0,5° × 0,625°. Se consulta cada celda una vez (≈ 30 en todo el país) y `n_puntos` = celdas distintas promediadas. |
| SG-01 | SoilGrids: en vez de la API REST punto por punto (5 consultas/min ≈ 8 horas), se baja el mapa del país una vez por propiedad (WCS, 7 descargas, ≈ 2 min) y se lee el valor en los puntos de PTS-01. |
| TEX-01 | Textura con el triángulo USDA (arena, limo = 100 − arcilla − arena, arcilla), nombres en español. |
| NUL-01 | Días que la fuente todavía no publica (POWER ≈ 3 días de atraso, `-999`) no se guardan; el upsert los completa en la corrida siguiente. Distrito sin dato de suelo (urbano) → valores `null` y `n_puntos = 0`. |
| ECO-01 | `texturas`, `drenaje` y `profundidad_suelo` usan el rango absoluto de EcoCrop (TEXTR, DRAR, DEPR), porque la tabla filtra lo que se puede sembrar. Unión con `cultivos`: primero `ecocrop_id`, luego el nombre científico completo (así "Zea mays ssp. saccharata" no hereda los datos de "Zea mays") y por último género + especie. |
| GZ-01 | Unión GAEZ ↔ `cultivos` por género + especie (tabla `ESPECIES_GAEZ` en `gaez.ts`). Aptitud = secano, insumos bajos, 1981–2010, índice 0–10000 → %. |
| GZ-02 | Si dos cultivos GAEZ caen en el mismo cultivo (arroz secano y arroz inundado), gana la mayor aptitud. Mes de siembra = el día de inicio más repetido entre los puntos (no se promedian días del año). |
| GZ-03 | Las capas se leen del GeoTIFF global de cada capa (enlace `download_url` del servicio) solo en la ventana de Costa Rica: `exportImage` devolvió archivos cortados. |
| CU-01 | Capacidad de uso **indicativa**: el decreto evalúa 14 limitantes; aquí solo hay datos para pendiente (e1), textura superficial (s2) y fertilidad (s4). Clase = la peor de esas tres. Sin pendiente no se clasifica (`null`). Faltan: erosión, profundidad, subsuelo, pedregosidad, toxicidad, salinidad, drenaje, inundación, zona de vida, período seco, neblina y viento: la clase real puede ser peor, nunca mejor. |
| CU-02 | Fertilidad solo con el criterio de pH del decreto (5.2.4.1: alta > 6,5 · media > 5,5–6,5 · baja 4,5–5,5 · muy baja < 4,5), porque SoilGrids no da suma de bases ni acidez. Solo con pendiente < 55 %. |
| WD-01 | % protegido = área de la unión de las intersecciones distrito ∩ área protegida, entre el área del distrito (las áreas traslapadas no se cuentan dos veces). Un área con geometría vacía o rota se omite y se avisa cuántas fueron, en vez de detener toda la carga. |
| CEN-01 | El sitio del INEC bloquea descargas automáticas (403): el cuadro de cultivos por cantón se baja a mano y se pasa la ruta del Excel. Se busca la hoja con columnas de cantón, cultivo, superficie/área y fincas; cantón por nombre; cultivo por nombre o id de `cultivos`. Lo que no se une se avisa en consola. **Hay que confirmarlo con el archivo real.** |

Umbrales del decreto usados (Decreto 41960-MAG-MINAE, art. 1, Cuadro 1, pág. 9–10):

| Factor | I | II | III | IV | V | VI | VII | VIII |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pendiente (%) | 0–3 | 4–8 | 9–15 | 16–30 | — | 31–55 | 56–75 | > 75 |
| Textura 0–30 cm | Media | Mod. fina o mod. gruesa | Fina o muy fina | — | Gruesa | — | — | — |
| Fertilidad | Alta | Media | — | Baja | — | Muy baja | — | — |

Prueba con el ejemplo práctico del decreto (sección 6): pendiente 12 % (III) + textura FAL (II) + fertilidad baja (IV) → clase IV. ✔

## Prueba en vivo con 3 distritos (14 nov 2026)

| Distrito | Open-Meteo 0–7 cm (13 nov) | POWER raíz (11 nov) | Suelo |
| --- | --- | --- | --- |
| CR10101 Carmen | 5 puntos | — | Sin dato (zona urbana), todo `null` |
| CR30110 Llano Grande | 0,477 m³/m³, 16,6 °C, 6 puntos | 0,91 | pH 5,42 · arcilla 28,1 % · franco arcillosa · carbono 80,3 g/kg |
| CR50501 Filadelfia | 10 puntos | — | pH 6,27 · arcilla 35,3 % · franco arcillosa |

GAEZ con 6 cultivos de ejemplo (papa, café, frijol, maíz, arroz, piña): 15 filas. Café: Carmen 43,6 %, Llano Grande 12,4 %, Filadelfia 18,7 %. Papa: Llano Grande 11,6 %. Piña no existe en GAEZ (solo EcoCrop). EcoCrop: los 6 cultivos con pareja; papa 15–25 °C, 500–800 mm, pH 5–6,2, hasta 2800 m.

Todas las filas pasan los esquemas de `datos.ts`. Áreas protegidas y censo están probados solo con datos de ejemplo (sin token WDPA ni Excel del INEC todavía).

## Cómo correrlo en local

Pruebas sin internet (23), con el runner de Node como el resto de extractores:

```bash
npm run test:extractores
```

Probar el suelo con los 3 distritos de ejemplo, sin Supabase:

```bash
cd extractores && node --input-type=module -e "import { extraerSuelos } from './src/cargas-unicas/soilgrids.ts'; import d from './test/fixtures/distritos-muestra.json' with { type: 'json' }; console.log(await extraerSuelos(d))"
```

## Para el líder

0. Después de mergear la base del tema 1, `humedad/utilidades.ts` repite `comun/puntos.ts` y `comun/http.ts`. Ojo: el tema 1 usa 5 + área/30 puntos y aquí 5 + área/25. Hay que unificarlo en un PR aparte para que `n_puntos` signifique lo mismo en todas las tablas.

1. El esquema `Distrito` exige lat ≥ 8: Isla del Coco (CR60110, lat 5,53, lng −87,06) no pasa y hace fallar el lote de distritos.
2. `comun/supabase.ts` lee `VITE_SUPABASE_URL`; el documento de prompts dice `SUPABASE_URL`.
3. Acordar con el tema 5 que `cultivos.nombre_cientifico` venga lleno (y `ecocrop_id` si se sabe): es lo que une EcoCrop, GAEZ y el censo.
