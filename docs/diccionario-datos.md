# Diccionario de datos (puntos 2 y 10)

Fuente de verdad: los esquemas Zod en `packages/compartido/src/esquemas/`. Si este documento y el código difieren, manda el código; avisar para corregir este archivo.

## Reglas comunes

- **Llave:** el código INEC de distrito (`CR30110`). Cantón = primeros 5 caracteres (`CR301`), provincia = primeros 3 (`CR3`).
- **Valor etiquetado (`Valor`):** casi todo campo es un objeto `{ valor, unidad, fuente, fecha, origen, regla?, advertencia? }`.
  - `fecha`: fecha del **dato** (YYYY-MM-DD), no de la consulta.
  - `origen`: `satelite` | `modelo` | `derivado`. (`sensor` y `manual` quedan para la app.)
  - `valor: null` siempre trae `advertencia`. Nunca 0 en lugar de "sin dato".
  - `origen: "derivado"` siempre trae `regla` (código en [supuestos.md](supuestos.md)).
- **Envoltura (`ResultadoExtraccion`):** toda función devuelve `{ datos: T[], meta }`.

| Campo de `meta` | Tipo | Significado |
| --- | --- | --- |
| `fuentes[]` | `{ id, url, fechaDatos, ok }` | Cada fuente consultada y si respondió |
| `fechaDatos` | `YYYY-MM-DD` \| null | Fecha de los datos (la más antigua entre fuentes) |
| `generadoEn` | ISO 8601 con hora | Momento de la corrida |
| `coberturaPct` | 0–100 | % de registros con sus valores principales no nulos |
| `advertencias[]` | texto | Avisos que no impiden entregar |
| `errores[]` | `{ fuente, mensaje, distritos? }` | Fuentes que fallaron; el resto igual se entrega |

**Fuentes (`fuente`):** `nasa-power`, `open-meteo-era5land`, `soilgrids`, `fao-gaez`, `ecocrop`, `decreto-41960`, `hdx-inec`.

## Distrito — `obtenerDistritos()`

Semilla fija (`datos/distritos.json`, 492 filas, HDX/INEC vigente desde 2024-12-03). Campos planos (no `Valor`).

| Campo | Tipo | Ejemplo |
| --- | --- | --- |
| `codigo` | `CR` + 5 dígitos | `CR30110` |
| `nombre` | texto | `Llano Grande` |
| `canton.codigo` / `canton.nombre` | `CR` + 3 dígitos / texto | `CR301` / `Cartago` |
| `provincia.codigo` / `provincia.nombre` | `CR` + 1 dígito / texto | `CR3` / `Cartago` |
| `lat`, `lon` | grados WGS84, 5 decimales | `9.933`, `-83.92325` |

## HumedadDistrito — `obtenerHumedadDistritos()` (punto 2)

Siempre en vivo. Frecuencia sugerida: diaria. `HumedadPunto` es igual, sin `codigoDistrito`/`nombreDistrito` (para fincas después).

| Campo | Tipo / unidad | Valores | Fuente | origen | Ejemplo CR30110 |
| --- | --- | --- | --- | --- | --- |
| `codigoDistrito`, `nombreDistrito` | texto | — | hdx-inec | — | `CR30110`, `Llano Grande` |
| `id`, `lat`, `lon` | texto, grados | — | hdx-inec | — | |
| `fecha` | YYYY-MM-DD | día de la lectura | — | — | `2026-11-11` |
| `elevacionM` | Valor, m | ≥ 0 | open-meteo-era5land | modelo | 2318 |
| `humedadVolPct[]` | `{ profundidadCm:{desde,hasta}, humedadVolPct: Valor % }` | capas 0–7, 7–28, 28–100 cm; 0–100 % | open-meteo-era5land | modelo | 47.7 / 48.4 / 47.6 |
| `indiceHumedadPower.superficie` | Valor, fracción | 0–1 (GWETTOP, **no es %**) | nasa-power | satelite | 0.90 |
| `indiceHumedadPower.raiz` | Valor, fracción | 0–1 (GWETROOT) | nasa-power | satelite | 0.91 |
| `indiceHumedadPower.perfil` | Valor, fracción | 0–1 (GWETPROF) | nasa-power | satelite | 0.92 |
| `temperaturaAireC` | Valor, °C | corregida por altitud | nasa-power | derivado (T-01) | 15.2 |
| `humedadRelativaPct` | Valor, % | 0–100 (RH2M) | nasa-power | satelite | 90.2 |
| `lluviaMm` | Valor, mm/día | ≥ 0 (PRECTOTCORR) | nasa-power | satelite | 6.2 |
| `estado` | Valor | `seco` \| `normal` \| `humedo` | nasa-power | derivado (EST-01) | — |
| `percentilMes` | Valor, percentil | 0–100 | nasa-power | derivado (EST-01) | — |
| `riesgoHongos.nivel` | Valor | `bajo` \| `medio` \| `alto` | nasa-power | derivado (S-01..S-03) | — |
| `riesgoHongos.motivos[]` | texto | condiciones cumplidas | — | — | `["HR ≥ 90 %"]` |
| `riesgoHongos.supuestos[]` | texto | códigos de regla | — | — | `["S-01","S-02","S-03"]` |

Retraso de fuentes: POWER ≈ hoy − 3 días; Open-Meteo ≈ hoy − 1 día. Cada `Valor` dice su propia `fecha`.

## ZonaSuelo — `obtenerZonasSuelo()` (punto 10, datos de la zona)

Semilla (`datos/zonas-suelo.json`); `forzarActualizacion: true` la reconstruye. Frecuencia: manual o semanal. Promedio (o moda, en clases) de los píxeles dentro del polígono del distrito.

| Campo | Tipo / unidad | Valores | Fuente | origen |
| --- | --- | --- | --- | --- |
| `ph` | Valor | 3–10 (pH en agua, 0–5 cm) | soilgrids | modelo |
| `arcillaPct`, `arenaPct` | Valor, % | 0–100 | soilgrids | modelo |
| `limoPct` | Valor, % | 100 − arcilla − arena | soilgrids | derivado (TEX-01) |
| `carbonoOrganicoGKg` | Valor, g/kg | ≥ 0 | soilgrids | modelo |
| `materiaOrganicaPct` | Valor, % | ≥ 0 | soilgrids | derivado (MO-01) |
| `nitrogenoGKg` | Valor, g/kg | ≥ 0 | soilgrids | modelo |
| `cicCmolKg` | Valor, cmol(+)/kg | ≥ 0 | soilgrids | modelo |
| `densidadAparenteGCm3` | Valor, g/cm³ | ≈ 0.5–2 | soilgrids | modelo |
| `texturaUsda` | Valor, clase | 12 clases USDA (`franco arcilloso`, …) | soilgrids | derivado (TEX-01) |
| `tipoSuelo` | Valor, clase | nombre HWSD (`Andosol`, …) | fao-gaez | modelo |
| `fertilidad` | Valor | `sin limitacion` \| `ligera` \| `moderada` \| `severa` \| `muy severa` | fao-gaez (nutrientes) | modelo |
| `drenaje` | Valor | mismas clases (oxígeno para raíces) | fao-gaez | modelo |
| `pendienteClase` | Valor, clase GAEZ | clase de pendiente mediana | fao-gaez | modelo |
| `capacidadUso.clase` | Valor | `I` … `VIII` | decreto-41960 | derivado (CU-*) |
| `capacidadUso.indicativa` | `true` | siempre | — | — |
| `capacidadUso.factoresUsados[]`, `factoresNoDisponibles[]` | texto | p. ej. `pendiente` / `pedregosidad` | — | — |
| `capacidadUso.versionDecreto` | texto | `41960-MAG-MINAE` | — | — |
| `aptitudGaez` | mapa cultivo → Valor % | 0–100; verificación cruzada | fao-gaez | modelo |
| `coberturaPixelesPct` | mapa fuente → % | 0–100 | — | — |

Ejemplo (valores de muestra verificados): CR30110 pH 5.4, arcilla 27.5 %, carbono orgánico 89.5 g/kg. Los 25 distritos sin dato de SoilGrids (24 urbanos del Valle Central + Isla del Coco `CR60110`) van en `null` con advertencia.

## RequisitoCultivo — `obtenerRequisitosCultivos()` (punto 10, requisitos)

Semilla (`datos/ecocrop.csv` + `datos/gaez-ecocrop.csv`). Frecuencia: manual. Un `Rango` es `{ min, optMin, optMax, max }` (números o null).

| Campo | Tipo / unidad | Valores | Fuente | origen |
| --- | --- | --- | --- | --- |
| `id` | texto | id EcoCrop, o `gaez:<nombre>` | ecocrop / fao-gaez | — |
| `nombreCientifico`, `nombreComun` | texto | — | ecocrop | — |
| `gaezCultivo` | texto \| null | nombre GAEZ si hay pareja | fao-gaez | — |
| `sinEcocrop` | booleano | `true` = solo aptitud GAEZ | — | — |
| `temperaturaC` | Valor\<Rango\>, °C | | ecocrop | modelo |
| `lluviaAnualMm` | Valor\<Rango\>, mm/año | | ecocrop | modelo |
| `ph` | Valor\<Rango\> | | ecocrop | modelo |
| `texturas` | Valor\<texto[]\> | `pesado` \| `medio` \| `liviano` \| `organico` | ecocrop | modelo |
| `drenaje` | Valor\<texto[]\> | `pobre` \| `bien drenado` \| `excesivo` | ecocrop | modelo |
| `cicloDias` | Valor\<{min,max}\>, días | | ecocrop | modelo |
| `altitudMaxM` | Valor, m | | ecocrop | derivado (ALT-01) |
| `pendienteMaxPct` | Valor, % | | ecocrop | derivado (PEN-01) |
| `toleranciaSequia` | Valor | `alta` \| `media` \| `baja` | ecocrop | derivado (SEQ-01) |
| `toleranciaInundacion` | Valor | `alta` \| `media` \| `baja` | ecocrop | derivado (INU-01) |

Nota: `origen` de EcoCrop se marca `modelo` (es una base de conocimiento experta, no una medición).
