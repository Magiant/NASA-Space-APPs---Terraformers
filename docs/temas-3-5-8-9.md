# Temas 3, 5, 8 y 9 y la aptitud

Estas son las piezas que faltaban para que la web muestre recomendaciones con datos reales. Todas usan la base común:
`ejecutarExtractor()` valida con Zod y hace el upsert por la llave de `TABLAS`.

## Orden de carga

```bash
npm run extraer -- cultivos          # tema 5: cultivos + secuencias
npm run extraer -- ecocrop           # tema 10: requisitos_cultivo (FAO EcoCrop)
npm run extraer -- gaez              # tema 10: gaez_zona (FAO GAEZ)
npm run extraer -- terreno           # tema 9: altitud y pendiente
npm run extraer -- capacidad-uso     # tema 10: usa la pendiente
npm run extraer -- precios-pima      # tema 3: boletines PIMA-CENADA
npm run extraer -- amenazas-estimar  # tema 8: escribe datos/riesgos/amenazas.csv (solo si no hay uno revisado)
npm run extraer -- amenazas          # tema 8: carga el CSV
npm run extraer -- aptitud           # resultado: cruza todo lo anterior
```

## Tema 3 · Precios PIMA-CENADA (`precios/pima.ts`)

| | |
|---|---|
| Fuente | Boletín Diario de Precios sugeridos de Frutas y Hortalizas PIMA-CENADA: https://www.pima.go.cr/boletin/ → https://bpm.pima.go.cr/cm.aspx?id=4 |
| Permiso | El `robots.txt` del PIMA solo bloquea `/wp-admin/` |
| Cómo entra | El portal arma la lista con JavaScript y solo entrega los PDF dentro de una sesión del navegador. Por eso se abre con Chrome sin ventana (DevTools) y el PDF se lee con `pdftotext -layout` |
| Qué guarda | Por producto: mínimo, máximo, moda y promedio en ₡ por unidad de comercialización. Los productos del catálogo llevan `cultivo_id` (papa, tomate…) |
| Cada cuándo | Diario (`diario.yml`). La llave evita duplicados y el portal lista unas 2 semanas de boletines |
| Requisitos | Chrome (`CHROME_PATH` si no está en la ruta normal) y `poppler-utils` |

El CNP (frijol, maíz, arroz y café) todavía no tiene extractor, así que esos cultivos no tienen precio.

## Tema 5 · Catálogo de cultivos (`cultivos/catalogo.ts`)

No hay una API pública con fichas de cultivos de Costa Rica. Por eso el catálogo es una tabla revisada por el equipo, con los mismos ids que usa la web.

- **Ciclo, agua del ciclo, raíz y efecto en el suelo:** fichas del MAG/INTA y FAO-56.
- **`local` (temperatura óptima, altitud y meses de siembra):** fichas del MAG/INTA.
- **Rangos de la FAO:** EcoCrop da rangos mundiales muy amplios (café arábica 14–28 °C), así que se usan solo como límites. Los pone el extractor `ecocrop`. Tomate se enlaza por código (`1379`) porque EcoCrop lo llama *Lycopersicon esculentum*.

Las secuencias de rotación se generan con reglas (CUL-01 a CUL-06), no a mano:

- **Prohibida:** misma familia, o plagas que quedan en el suelo.
- **Recomendada:** frijol antes o después de un cultivo que gasta nitrógeno, o raíces a distinta profundidad.
- **Neutral:** cultivos permanentes (café y piña).

## Tema 9 · Terreno (`cargas-unicas/terreno.ts`)

- **Altitud:** media, mínima y máxima de los mismos 5–20 puntos por distrito que usan clima y suelo.
- **Pendiente:** en cada punto se piden las alturas 100 m al este, oeste, norte y sur en OpenTopoData (SRTM 90 m) y se calcula con diferencias centrales. Se guarda el promedio del distrito.
- **Fuente de las alturas:** todas salen del mismo modelo y no gastan cupo de Open-Meteo (`soloOpenTopoData`, ELE-03).
- **Columnas:** solo escribe las suyas. `area_protegida_pct` y `capacidad_uso_clase` son de otros extractores.

## Tema 8 · Amenazas estimadas (`riesgos/estimar-amenazas.ts`)

La CNE solo publica sus mapas de amenazas en PDF por cantón. Mientras alguien los revisa a mano, `amenazas-estimar` escribe `extractores/datos/riesgos/amenazas.csv` con estimaciones. Cada fila dice en `fuente` de dónde sale y empieza con `estimado:`.

| Tipo | Regla |
|---|---|
| volcán | Distancia a Rincón de la Vieja, Arenal, Poás, Irazú o Turrialba (OVSICORI): < 10 km muy alto · < 20 km alto · < 35 km medio |
| deslizamiento | Pendiente media: ≥ 30 % muy alto · ≥ 20 % alto · ≥ 12 % medio · resto bajo |
| sequía | Meses con lluvia normal < 50 mm (NASA POWER): ≥ 6 muy alto · 4–5 alto · 2–3 medio · 1 bajo |
| inundación | Zona baja y plana: < 50 m y < 4 % alto · < 150 m y < 6 % medio |

**Si alguien corrige el CSV a mano, no vuelva a correr `amenazas-estimar`, porque lo sobrescribe.** Después de editarlo, corra solo `amenazas`.

## Aptitud (`aptitud/calcular.ts`)

No llama a ninguna API. Cruza clima, suelo, terreno, EcoCrop, amenazas y precios. Corre cada lunes (`semanal.yml`).

| Nota | Peso | Cómo |
|---|---|---|
| clima | 30 % | Temperatura media (60 %): óptimo MAG/INTA y límites de EcoCrop. Altitud (40 %): rango MAG/INTA, 0 a 600 m fuera de él |
| agua | 25 % | Lluvia del ciclo contra EcoCrop. Para cultivos de ciclo corto: lluvia anual × días del ciclo / 365 |
| suelo | 20 % | pH (80 %) y pendiente (20 %) |
| riesgo | 15 % | 100 menos: muy alto 35 · alto 20 · medio 8 |
| mercado | 10 % | Tendencia del precio PIMA de la última semana. Sin precio, el peso se reparte entre las demás notas |

**Nivel:**

- **descartado:** temperatura fuera del rango absoluto, altitud sobre el máximo de EcoCrop, o sin datos de clima.
- **excelente:** 85 o más.
- **bueno:** 65 o más.
- **no recomendado:** el resto.

**Mes de siembra:** el primero del calendario MAG/INTA.

**Límites conocidos:**

- NASA POWER sobreestima la lluvia en las montañas (Cartago ≈ 3 600 mm al año frente a ≈ 1 400 mm medidos).
- GAEZ no entra en la nota: sus píxeles de ≈ 9 km le dan 0 a la papa en Cartago. Queda guardado solo para comparar.
