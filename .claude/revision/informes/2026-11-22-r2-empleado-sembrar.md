# Segunda pasada de empleado-sembrar — 2026-11-22

SEGUNDA PASADA, SEMBRAR, ZONA Y CULTIVO (SEM)

Capturas nuevas en `C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-22-53` (es, claro, 360 y 1280 px) y `...\2026-11-22-22-54` (en, azul, 390 px). El reporte automático salió "sin problemas automáticos" en mis rutas.

## Estado de mis hallazgos anteriores

- **SEM-01 (Todos muestra menos de lo prometido): ARREGLADO.** `CultivosPorTemporada.tsx` ya aplica el límite solo a "ahora"; "Todos" usa `cultivos`. La captura dice "13 cultivos" y "Otros 8 cultivos…", que suman bien.
- **SEM-02 (Tomate recomendado y ya muy sembrado): ARREGLADO A MEDIAS.** Ahora hay avisos "Ojo: en su zona ya hay 64 ha de tomate sembradas. Si todos cosechan a la vez, el precio puede bajar." Pero salen como bloque suelto al final de la lista, bajo "Ver todos los cultivos". No están dentro de la tarjeta del cultivo. A 360 px el agricultor llega a ellos después de bajar las 5 tarjetas y no los liga con el Tomate nº 1 (`zona_CR30101-360.txt`). El puntaje "Venta" tampoco cambia (no lo verifiqué en el código).
- **SEM-03 (puntaje sin explicar): ARREGLADO en `#/zona`.** El desplegable "¿Por qué este puntaje?" lleva `quePuntaje`: "88/100 dice qué tan bien se da este cultivo en este distrito. Cuenta el clima (30 %)… 85 o más: Excelente · 65 a 84: Bueno · menos de 65: No recomendado." El texto está en `es.ts:218`, pero el desplegable abierto no lo vi en captura. En #/cultivo/frijol (sin zona) no hay puntaje que explicar; el "81/100" de "Dónde se da mejor" sigue sin leyenda propia (ver SEM-N3).
- **SEM-04 (selector sin reintento): ARREGLADO en código.** `SelectorUbicacion.tsx:148-149` muestra el error con un botón `t.comun.reintentar`. Solo lo vi en el código, no pude simular el error. Duda: el botón hace `window.location.reload()`, así que recarga toda la página y el agricultor pierde lo que llevara hecho.
- **SEM-05 (decimales con punto): ARREGLADO.** "19,5 °C", "11,9 y 26,2", "pH 6,1", "entre 5,5 y 7", "1 435 m". En inglés "6.1" y "1,435 m".
- **SEM-06 (datos técnicos): ARREGLADO en casi todo.**
  - Agua: "Llovió 5 mm más de lo que usan las plantas".
  - "Acidez del suelo (pH): 6,1 · Materia orgánica alta".
  - Riesgos: "Pregunte en la CNE o en la municipalidad cómo prepararse".
  - Sigue igual: la temperatura dice "19,5 °C" y "Entre 11,9 y 26,2 °C" sin "promedio del último mes" (aparece abajo, en el gráfico). "Franco (volcánico)" sigue sin explicarse, y "CNE" no se explica en esa frase.
- **SEM-07 ("Sin dato" en riesgos vacíos): ARREGLADO en código.** `Zona.tsx:84` usa `tz.sinRiesgos`. Solo lo vi en el código.
- **SEM-08 (español dentro del inglés): ARREGLADO.** En `?idioma=en` ya no vi "Franco", "Deslizamiento" ni "Fabáceas" sin traducir. Sí queda la redacción rara de SEM-N2.
- **SEM-09 (rotación papa y tomate): ARREGLADO A MEDIAS.** Ahora dice "no comparte las plagas principales de la papa y el tomate (tizón, polilla)". Ya no promete que no comparten ninguna plaga. Pero ahora mezcla "papa y tomate" en la ficha de la Papa, y la frase queda forzada.
- **SEM-10 (unidades sin "de"): ARREGLADO.** "por caja de 18 kg", "por rollo de 12 manojos", "por caja de 100 unidades".
- **SEM-11 ("Evite: Frijol" y "Dónde se da mejor"): ARREGLADO A MEDIAS.**
  - "No siembre después en el mismo terreno: Frijol." ya es claro.
  - "Dónde se da mejor" ahora lleva "Oriental, Cartago · 81/100" y la insignia.
  - Siguen los nombres largos repetidos, como "San Isidro de El General, Pérez Zeledón, San José". Cuando distrito y cantón son el mismo, ya se evita repetirlos ("Alajuela").
- **SEM-12 (palabra partida en tabla de vecinos): SIGUE IGUAL, sin confirmar.** El reporte automático ya no marca nada. En las capturas nuevas no vi la tabla partida, pero no la miré en imagen a 360 px.
- **SEM-13 ("cosecha octubre" sin aclarar): SIGUE IGUAL.** La tabla dice "Chile dulce 54 ha, 22 fincas, octubre" cuando hoy es noviembre. No se sabe si ya cosecharon. Sigue siendo `mes(t, s.mes_cosecha)`.

## Problemas nuevos

### [SEM-N1] Los avisos "Ojo" quedan separados de la tarjeta y tapados por el menú en la captura
- Severidad: media
- Tipo: consistencia
- Regla: R-43, R-23
- Dónde: #/zona/CR30101, 360 px, tema claro · `Zona.tsx` cerca de la línea 64
- Qué ve el agricultor: dos cuadros amarillos "Ojo: en su zona ya hay 64 ha de tomate…" y "…54 ha de chile dulce…" debajo de "Ver todos los cultivos". Ninguno está dentro de la tarjeta del Tomate o del Chile dulce.
- Por qué confunde o falla: el aviso no está donde se decide. En la captura `zona_CR30101-360-3.png` el encabezado fijo se superpone al texto del aviso. Eso puede ser un artefacto de la captura (el encabezado es fijo y la captura se hace por partes), así que lo reporto como duda.
- Propuesta: poner el aviso dentro de la tarjeta del cultivo, o justo debajo de la lista con "Ojo con Tomate: ya hay 64 ha…".
- Evidencia: `zona_CR30101-360-3.png`, `zona_CR30101-360.txt`.

### [SEM-N2] Unidades de precio en inglés mal ordenadas
- Severidad: baja
- Tipo: consistencia
- Regla: R-07, R-11
- Dónde: #/zona/CR30101, `?idioma=en`, 390 px · `zona_CR30101-390.txt:39,78`
- Qué ve el agricultor: "₡11 000 per 100 units box", "₡3 000 per 12 bunches bundle", "₡28 000 per 45 kg sack". En el inglés natural sería "per box of 100 units". También "Family Bean family (Fabaceae)" en la ficha, donde se repite "Family".
- Propuesta: usar el orden "per box of 100 units" en inglés, y "Family: Fabaceae (bean family)".
- Evidencia: `zona_CR30101-390.txt`, `cultivo_frijol-390.txt:5`.

### [SEM-N3] Niveles en "Dónde se da mejor" sin leyenda y umbrales distintos a los de antes
- Severidad: baja
- Tipo: ambiguo
- Regla: R-03
- Dónde: #/cultivo/frijol y #/cultivo/papa, 360 px · `cultivo_frijol-360.txt`
- Qué ve el agricultor: "Oriental, Cartago · 81/100 / Bueno". La explicación "85 o más: Excelente" solo está dentro del desplegable de las tarjetas de #/zona.
- Por qué confunde o falla: en la ficha del cultivo el agricultor ve la nota sin saber qué es ni de dónde sale.
- Propuesta: una línea sobre la lista, por ejemplo "Nota de 0 a 100: qué tan bien se da en cada distrito".
- Evidencia: `cultivo_frijol-360.txt`.

## Sin problemas
- No vi `undefined`, `NaN` ni claves de traducción en las capturas nuevas.
- El calendario de la ficha coincide con "Ahora, en noviembre".
- Las insignias de nivel llevan ícono más texto.
- Las fechas van en día-mes-año.
- Las unidades de precio ya van con "de".

## No pude revisar
- Error de red, carga lenta y distrito sin datos: no se pueden simular en modo demo.
- El desplegable "¿Por qué este puntaje?" abierto y el mapa táctil: no los abrí.
- El tema azul: solo leí el texto, no revisé el contraste en las imágenes.
- Los anchos de 320 y 1920 px.
- `#/sembrar` con distrito elegido.
