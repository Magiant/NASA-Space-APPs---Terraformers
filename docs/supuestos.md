# Supuestos y reglas derivadas

Cada valor con `origen: "derivado"` lleva el código de su regla en el campo `regla`. Todos están **pendientes de validación** por el equipo. Para cambiar un umbral: editar esta tabla y la constante con el mismo código en el código.

| Código | Regla | Por qué | Estado |
| --- | --- | --- | --- |
| T-01 | Temperatura corregida = T_POWER − 0,0065 × (altitud real − altitud de la celda POWER) | Gradiente térmico estándar −6,5 °C/km; POWER usa la altitud de su celda (0,5° × 0,625°) | Pendiente |
| MO-01 | Materia orgánica % = carbono orgánico (g/kg) × 1,724 / 10 | Factor de van Bemmelen | Pendiente |
| TEX-01 | Limo = 100 − arcilla − arena; clase con el triángulo USDA | Estándar internacional | Pendiente |
| EST-01 | Seco < P20, normal P20–P80, húmedo > P80 del índice de raíz POWER, mismo mes y celda, 2001–2025 | Corte usual en monitoreo de sequía; misma fuente que la lectura diaria | Pendiente |
| S-01 | Riesgo de hongos exige índice de superficie > P80 del mes | "Suelo demasiado húmedo" del pedido | Pendiente |
| S-02 | … y humedad relativa ≥ 90 % | Umbral típico de hongos foliares | Pendiente |
| S-03 | … y temperatura (T-01) entre 15 y 28 °C | Rango típico de crecimiento de hongos | Pendiente |
| ALT-01 | Altitud máxima = (27 − temperatura mínima absoluta del cultivo) / 0,0065 | Altitud donde la media de Costa Rica (≈ 27 °C a nivel del mar) baja al mínimo del cultivo | Pendiente |
| PEN-01 | Pendiente máxima: anuales labradas 15 %, perennes arbustivas 30 %, árboles 50 % | Según forma de vida de EcoCrop | Pendiente |
| SEQ-01 | Tolerancia a sequía por lluvia mínima: < 500 mm alta, 500–1000 media, > 1000 baja | Un cultivo que vive con poca lluvia tolera sequía | Pendiente |
| INU-01 | Tolerancia a inundación: acepta drenaje pobre = alta; solo bien drenado = baja; resto media | Campo de drenaje de EcoCrop | Pendiente |
| CU-* | Umbrales de capacidad de uso | Transcritos del Decreto 41960-MAG-MINAE con artículo y página en `datos/decreto-41960.json`; ninguno inventado | Se revisa contra el PDF |
