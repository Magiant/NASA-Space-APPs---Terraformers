# Tema 7 · Análisis térmico: olas de calor, cultivos y plagas

Se adaptó a la estructura común un prototipo independiente ("clima NASA por distrito"). El prototipo
funcionaba solo (CommonJS, su propio catálogo de distritos, escribía directo en Supabase y Algolia) y no
encajaba con la base de los extractores. Aquí se conservó lo que **no existía** en el repo.

## Qué se agregó

| Archivo | Qué hace |
|---|---|
| `extractores/src/clima/termico.ts` | Funciones puras: umbrales por mes (percentil), **olas de calor**, cobertura de datos, **evaluación térmica de cultivos** y **de plagas**, validación de perfiles de plaga. |
| `extractores/src/clima/olas.ts` | Extractor `olas-calor`: lee `clima_diario` (sin APIs), detecta las olas y las guarda en `olas_calor`. Corre semanal después de `temperatura-power`. |
| `extractores/src/comun/geometria.ts` | `puntoRepresentativo()`: un punto que siempre cae **dentro** del distrito (el centroide puede caer en otro distrito si la forma es de "C", tiene huecos o islas). Para el tema 0. |
| `supabase/migrations/013_olas_calor.sql` | Tabla `olas_calor` con lectura pública. Se aplica sola al llegar a `dev` (ver `docs/migraciones.md`). |
| `packages/compartido/src/esquemas/datos.ts` | Esquema Zod `OlaCalor` y su entrada en `TABLAS`. |
| `extractores/test/termico.test.ts` | 14 pruebas sin red, adaptadas de las del prototipo. |

## Reglas

| Código | Regla |
|---|---|
| OLA-01 | Umbral del mes = percentil 90 de las máximas diarias de ese mes en todo el histórico del distrito y la fuente. Se necesitan **2 años** con datos en ese mes; si no, ese mes no tiene umbral ni olas. |
| OLA-02 | Ola = **3 o más días seguidos** con la máxima **por encima** (no igual) del umbral de su mes. |
| OLA-03 | Un día sin máxima o una fecha que falta **rompe** la racha (no se asume calor). |
| OLA-04 | Las olas que cruzan de mes se guardan enteras. `abierta = true` si seguía el último día de la serie; la llave es el día de inicio, así que en la corrida siguiente se actualiza. |
| TER-01 | Cultivo: con los rangos de `requisitos_cultivo` (EcoCrop). Un solo día con la máxima sobre `temp_abs_max_c` o la mínima bajo `temp_abs_min_c` → `fuera_tolerancia_por_extremos`, **aunque la media esté bien**. Media fuera del óptimo → `fuera_rango_optimo`. |
| TER-02 | Plaga: cuenta los días con la media **dentro** del rango favorable. Más calor no siempre es más riesgo. Avisa con `dias_favorables_alerta` o más. |
| TER-03 | Sin el 90 % de los días con las tres temperaturas → `datos_insuficientes`: no se aprueba un cultivo ni se avisa de una plaga. |
| TER-04 | Todo perfil de plaga necesita **fuente** (ficha del SFE/MAG, artículo…). Lo pide el tema 11 cuando entregue las plagas. |

Las funciones de cultivos y plagas quedan listas para que las use `aptitud/calcular.ts`: no tienen
tabla propia.

## Qué NO se trajo del prototipo y por qué

| Del prototipo | Por qué no |
|---|---|
| Resumen mensual, normales, anomalías y récords | Ya existen como vistas en `012_vistas_clima.sql`. |
| Descarga de NASA POWER | Ya la hace `clima/power.ts` (tema 7), con corrección por altitud. |
| Catálogo IGN propio (`data/distritos_cr.json`) y menús de consola | La llave común es `codigo_distrito` de la tabla `distritos` (tema 0); la web ya tiene su selector. |
| Datos horarios de NASA GEOS | Sin tabla ni pantalla que los use todavía. Se puede retomar si hace falta pronóstico horario. |
| Escritura directa en Supabase y Algolia | Los extractores solo entregan filas a `ejecutarExtractor()`; Algolia se llena en un paso aparte. |
| Política "solo URLs de NASA" para perfiles | Los rangos de cultivos vienen de EcoCrop (FAO) y los de plagas de fichas locales, no de NASA. Se exige fuente, no un dominio. |

## Correrlo

```bash
npm run extraer -- olas-calor --simulacion --distritos=CR30101,CR30501
node --test extractores/test/termico.test.ts
```
