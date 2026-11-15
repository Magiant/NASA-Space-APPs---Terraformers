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
| `puntos.ts` | "Promedio dentro del polígono": 5–20 puntos en cuadrícula dentro de cada distrito (siempre los mismos). |
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
14 días pedidos. Con los 492 distritos son **≈ 3 955 puntos**:

| Corrida | Llamadas aprox. |
|---|---|
| Diaria (8 días) | ≈ 3 955 (40 % del cupo diario) |
| 1 mes de historia | ≈ 8 760 (casi todo el cupo de un día) |
| 1 mes de historia con `--puntos-max=5` | ≈ 5 450 |

Por eso la carga histórica se detiene al llegar a `--presupuesto` (9 000 por defecto) y es
**reanudable**: al volver a correrla salta los meses que Supabase ya tiene completos. El extractor
mantiene su propio ritmo por debajo de 400/min y 4 500/hora.
