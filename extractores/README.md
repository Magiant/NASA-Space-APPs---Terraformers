# Extractores

Bajan datos de cada fuente, los validan con Zod y los guardan en Supabase (fuente de verdad).
Reglas completas: el PDF "Terraformes — prompts para los extractores". Columnas y llaves:
`packages/compartido/src/esquemas/datos.ts` y `supabase/migrations/009_datos_extraidos.sql`.

## Base común (`src/comun/`) — úsenla en todos los temas

| Archivo | Para qué |
|---|---|
| `ejecutar.ts` | **`ejecutarExtractor()`**: recibe lotes de filas normalizadas → valida con el esquema de `TABLAS` → upsert por lotes con su `claveUnica` → registra la corrida en `extracciones`. Si un lote no pasa Zod, no se guarda y se anota el error. Con `columnas: [...]` usa `.pick()` (tablas compartidas). Con `simulacion: true` no escribe nada y deja una muestra en `extractores/salida/`. |
| `registro.ts` | Abre y cierra la fila de `extracciones` (`en_curso` → `ok` / `sin_cambios` / `error`). |
| `distritos.ts` | Lee los distritos de Supabase (o de `--distritos-archivo` para probar sin base). |
| `puntos.ts` | "Promedio dentro del polígono": regla única **PTS-01** para todos los temas (5 + 1 por cada 25 km², máx. 20), rejilla regular dentro del distrito (siempre los mismos puntos). |
| `power.ts` | NASA POWER **por celda** (≈ 30 celdas para todo el país), con la altitud de cada celda. |
| `appeears.ts` | AppEEARS (NASA): login con usuario y contraseña de Earthdata, tarea por puntos, espera y lectura del CSV. Para ECOSTRESS, SMAP, SRTM y MODIS. |
| `elevacion.ts` | Altitud real de puntos: `terreno_zona` (tema 9) o la Elevation API de Open-Meteo. |
| `http.ts` | GET de JSON con reintentos y espera ante 429/5xx. |
| `argumentos.ts` | Opciones de línea de comandos comunes. |
| `supabase.ts` | Cliente con `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (se crea al primer uso). |

Para agregar un tema: un archivo que entregue lotes normalizados a `ejecutarExtractor()`, una línea
en `src/main.ts` y un paso en el workflow que toque (`diario.yml`, `semanal.yml` o `unica-vez.yml`).

## Cómo correr en local

Requisitos: Node 22.18 o más nuevo (corre los `.ts` sin compilar) y `npm install` en la raíz.

```bash
npm run test:extractores
```
```bash
npm run extraer -- clima --simulacion --distritos=CR10101,CR30110,CR50101
```
`--simulacion` no escribe en Supabase. Para guardar de verdad, quitarlo y tener en `.env` (raíz)
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. Sin la tabla `distritos` cargada (tema 0) se puede
probar con `--distritos-archivo=<json>` (lista de objetos con el esquema `Distrito`).

## Tema 1 · Clima (Open-Meteo)

- `src/clima/open-meteo.ts` → **diario** (`diario.yml`): últimos 7 días completos de los 492 distritos
  en `clima_diario` con `fuente = 'open-meteo'`, `temp_corregida_altitud = true` (Open-Meteo ya
  ajusta la temperatura a la altitud de cada punto).
- `src/cargas-unicas/clima-historico.ts` → **una vez** (`unica-vez.yml`):
  `npm run extraer -- clima-historico --desde=2025-01-01 --hasta=2025-12-31`.

Cupo gratis de Open-Meteo: < 10 000 llamadas/día, 5 000/hora, 600/min; cada punto = 1 llamada por cada
14 días pedidos. Con los 492 distritos son **≈ 4 024 puntos** (regla PTS-01):

| Corrida | Llamadas aprox. |
|---|---|
| Diaria (8 días) | ≈ 4 024 (40 % del cupo diario) |
| 1 mes de historia | ≈ 8 900 (casi todo el cupo de un día) |
| 1 mes de historia con `--puntos-max=5` | ≈ 5 450 |

Por eso la carga histórica se detiene al llegar a `--presupuesto` (9 000 por defecto) y es
**reanudable**: al volver a correrla salta los meses que Supabase ya tiene completos. El extractor
mantiene su propio ritmo por debajo de 400/min y 4 500/hora.

La humedad del suelo (tema 2) también usa ~4 000 puntos de Open-Meteo al día: entre los dos se usa
~80 % del cupo diario, por eso en `diario.yml` nunca corren en la misma hora (lo decide la revisión de datos nuevos, `src/comun/novedades.ts`) y queda
poco margen para la carga histórica del clima.

## Tema 7 · Temperatura del sector (NASA POWER)

- `src/clima/power.ts` → **semanal** (`semanal.yml`): últimos 21 días (POWER publica con ~3 días de
  atraso) en `clima_diario` con `fuente = 'nasa-power'`.
- `src/cargas-unicas/temperatura-historica.ts` → **una vez**: por defecto desde 2021
  (`--desde=2001-01-01` para más años; ≈ 180 000 filas por año: revisar el espacio de Supabase).
- `src/clima/comparar.ts` → `npm run extraer -- temperatura-comparar`: diferencia POWER − Open-Meteo
  en CR30110, CR21101 y CR10501 (montaña). Solo lee.
- `supabase/migrations/012_vistas_clima.sql`: vistas `clima_mensual`, `clima_normales`,
  `clima_anomalias` y `clima_records` (probadas en Postgres con PGlite).

Corrección por altitud obligatoria: `T_corregida = T − 0.0065 × (altitud_real − altitud_POWER)`,
punto por punto. La altitud de POWER viene en su respuesta; la real, de `terreno_zona.altitud_m` o de
la Elevation API de Open-Meteo (Copernicus 90 m). Sin altitud real, la temperatura queda null (nunca
sin corregir). POWER no publica ET0 FAO: `evapotranspiracion_ref_mm` = null en esta fuente.

## Tema 4 · Estudio hídrico (`agua_zona`)

| Comando | Cada cuánto | Qué hace |
|---|---|---|
| `agua-open-meteo` | diario, después de `clima` | Suma por semana (lunes) y mes la lluvia y la ET0 que **ya están en `clima_diario`**: cero llamadas a Open-Meteo |
| `agua-ecostress` | semanal | ECOSTRESS por AppEEARS: ET real (`ECO_L3T_JET.002/ETdaily`, mm/día; ALEXI no cubre Costa Rica) y estrés (`ECO_L4T_ESI.002/ESI`), sin nubes ni agua |
| `agua-historica` | una vez | Agrega todo `clima_diario` (open-meteo y nasa-power), año por año |

- `balance_mm = lluvia − ET real` si hay ECOSTRESS para ese periodo; si no, `lluvia − ET0`.
- ET real del periodo = ET diaria media de las pasadas de ECOSTRESS × días del periodo. ECOSTRESS no
  pasa todos los días y hay mucha nube: muchos periodos quedan en null (correcto).
- AppEEARS **no acepta el token de Earthdata** (probado: 403); usa `EARTHDATA_USERNAME` y
  `EARTHDATA_PASSWORD` (login → token de ~48 h en cada corrida).
