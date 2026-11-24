# Informe de empleado-sembrar — 2026-11-22

REVISIÓN SEMBRAR, ZONA Y CULTIVO (SEM)

Capturas en `C:/Users/PC/AppData/Local/Temp/claude/cff5e9b249d026e9/176261a1-31f1-4afb-a5bd-a4bf49f6e0eb/scratchpad/es/` (360 y 1280 px, tema claro, es) y `.../en/` (390 px, tema azul, en). Cada hallazgo cita el `.txt` o `.png` correspondiente.

### [SEM-01] "Todos los cultivos" de la ficha de zona muestra menos cultivos de los que dice haber
- Severidad: alta
- Tipo: consistencia
- Regla: R-02, R-43
- Dónde: #/zona/CR30101, 360 px, tema claro · `web/src/componentes/CultivosPorTemporada.tsx:31-34` y `web/src/paginas/publicas/Zona.tsx:51`
- Qué ve el agricultor: en la pestaña "Para sembrar ahora" ve 5 cultivos y debajo "Otros 8 cultivos se dan bien aquí, pero se siembran en otros meses." con el botón "Ver todos los cultivos". La pestaña "Todos los cultivos" dice "8 cultivos".
- Por qué confunde o falla: 5 + 8 son al menos 13. Pero `limite={8}` corta la lista total a los 8 de mayor puntaje, así que "Ver todos" muestra menos de lo prometido. Puede dejar fuera cultivos que sí se siembran ahora, como Culantro con 77 puntos.
- Propuesta: no cortar "Todos" (o usar un límite mayor) y que el conteo sea el real (13). Si se corta, decir "Los 8 mejores de 13". El `limite` solo debería aplicar a la vista "ahora".
- Evidencia: `scratchpad/es/zona_CR30101-360.txt` y `zona_CR30101-360-2.png`.

### [SEM-02] Se recomienda Tomate como número 1 y la tabla de vecinos muestra que ya hay mucho sembrado, sin avisar
- Severidad: alta
- Tipo: consistencia
- Regla: R-43, R-42
- Dónde: #/zona/CR30101, todos los anchos · `web/src/paginas/publicas/Zona.tsx:54-100`
- Qué ve el agricultor: arriba "1 Tomate 88/100 Excelente. Ahora, en noviembre". Abajo la tabla "Tomate 64 ha, 27 fincas, cosecha diciembre". Es el cultivo más sembrado de la zona. Chile dulce, la recomendación 2, tiene 54 ha y 22 fincas.
- Por qué confunde o falla: la tabla trae un aviso general ("Si muchos siembran lo mismo, puede haber mucha oferta…"), pero la tarjeta no lo conecta con el cultivo recomendado. El puntaje "Venta" no refleja esa saturación.
- Propuesta: en la tarjeta del cultivo, si ya hay muchas hectáreas en la zona, agregar "Ojo: en su zona ya hay 64 ha de tomate; puede bajar el precio al cosechar". También puede bajar su puntaje de "Venta".
- Evidencia: `scratchpad/es/zona_CR30101-360.txt`.

### [SEM-03] El puntaje y el nivel no se explican: qué es el 88/100 y de dónde sale cada nivel
- Severidad: alta
- Tipo: ambiguo
- Regla: R-03, R-01
- Dónde: tarjetas en #/sembrar, #/zona y #/cultivo (con `?zona`), 360 px · `web/src/componentes/TarjetaCultivo.tsx:78-90`, `web/src/idiomas/es.ts:192` y `es.ts:209`
- Qué ve el agricultor: un óvalo "88/100", la insignia "Excelente" y, plegado, "¿Por qué este puntaje?". En la ficha del cultivo con zona, "Excelente 88/100" va sin ningún texto.
- Por qué confunde o falla: no dice que es una nota de qué tan bien se da ese cultivo en este distrito. Tampoco dice qué puntajes son "Excelente", "Bueno" o "No recomendado". Esa explicación solo aparece en la ayuda de la lista ("El orden sale del puntaje…"), y no en la ficha del cultivo.
- Propuesta: en la ayuda de la lista y en la ficha del cultivo, agregar "88/100 es qué tan bien se da este cultivo en su distrito (clima, agua, suelo, riesgos y venta). 80 o más: Excelente; 60 a 79: Bueno." Poner la leyenda de niveles dentro del desplegable.
- Evidencia: `scratchpad/es/zona_CR30101-360-1.png`, `cultivo_frijol-360.txt`.

### [SEM-04] El selector se queda en "Cargando la lista…" para siempre si la lista falla, y no ofrece reintento
- Severidad: media
- Tipo: error
- Regla: R-34, R-05, R-41
- Dónde: #/sembrar, cualquier ancho · `web/src/componentes/SelectorUbicacion.tsx:111,127-129`
- Qué ve el agricultor: si hay error se muestra `errorLista` ("No se pudo cargar la lista de lugares. Revise la señal e intente de nuevo."), pero sin botón para reintentar. El select de provincia sigue con la opción "Cargando la lista…". "Usar mi ubicación" queda deshabilitado sin explicación.
- Por qué confunde o falla: parece que sigue cargando cuando ya falló. Para reintentar tiene que recargar toda la página.
- Propuesta: si `s.error`, la opción dice "No se pudo cargar" y aparece un botón "Intentar de nuevo". Debajo de "Usar mi ubicación" deshabilitado, decir por qué.
- Evidencia: solo código. No pude simular el error de red.

### [SEM-05] Decimales con punto en vez de coma (R-10)
- Severidad: media
- Tipo: consistencia
- Regla: R-10
- Dónde: #/zona/CR30101 y #/cultivo/frijol, todos los anchos · `Zona.tsx:67-72` y `Cultivo.tsx:91-96`
- Qué ve el agricultor: "19.5 °C", "Entre 11.9 y 26.2 °C", "pH 6.1", "Suelo con pH entre 5.5 y 7". En inglés dice "1,435 m", pero en español "1 435 m".
- Por qué confunde o falla: se mezclan números con coma decimal (miles con espacio) y otros con punto. Los valores se imprimen en crudo, sin `toLocaleString`.
- Propuesta: formatear todos con `toLocaleString(t.locale)`: "19,5 °C", "pH 6,1", "entre 5,5 y 7".
- Evidencia: `scratchpad/es/zona_CR30101-360.txt`, `cultivo_frijol-360.txt`.

### [SEM-06] Datos de la zona en lenguaje técnico y sin referencia de comparación
- Severidad: media
- Tipo: ambiguo
- Regla: R-01, R-03
- Dónde: #/zona/CR30101, 360 px, sección "Cómo está la zona" · `Zona.tsx:67-72`
- Qué ve el agricultor: "Temperatura 19.5 °C / Entre 11.9 y 26.2 °C", "Agua suficiente / Balance +5 mm", "Suelo Franco (volcánico) / pH 6.1", y "Deslizamiento, Volcán".
- Por qué confunde o falla:
  - La temperatura no dice que es el promedio del último mes, ni de cuándo.
  - "Balance +5 mm" y "pH" no se explican.
  - "Franco" es término técnico.
  - Los riesgos no dicen qué hacer.
- Propuesta:
  - "Temperatura promedio del último mes: 19,5 °C".
  - "Le sobran 5 mm de agua: llovió un poco más de lo que usan las plantas".
  - "Acidez del suelo (pH) 6,1: es normal para la mayoría de cultivos".
  - "Franco: tierra mezclada, ni muy arenosa ni muy pesada".
  - En riesgos, agregar "Consulte a la CNE cómo prepararse".
- Evidencia: `scratchpad/es/zona_CR30101-360-3.png` y `.txt`.

### [SEM-07] "Sin dato" en Riesgos cuando la lista está vacía
- Severidad: media
- Tipo: datos
- Regla: R-41
- Dónde: #/zona (distritos sin riesgos), todos los anchos · `Zona.tsx:72`
- Qué ve el agricultor: "Riesgos: Sin dato" si `z.riesgos` está vacío.
- Por qué confunde o falla: no se distingue "no tenemos el dato" de "no hay riesgos registrados". Son lecturas opuestas. No lo vi en captura, solo en código.
- Propuesta: si la lista está vacía, "No hay riesgos registrados para este distrito". Reservar "Sin dato" para cuando la fuente falló.
- Evidencia: solo código.

### [SEM-08] Textos en español dentro de la versión en inglés (R-07)
- Severidad: media
- Tipo: consistencia
- Regla: R-07
- Dónde: #/zona/CR30101 y #/cultivo/frijol, `?idioma=en`, 390 px · `web/src/datos-ejemplo/publicos.ts:362-371` y `TarjetaCultivo.tsx`
- Qué ve el agricultor: "Soil: Franco (volcánico)", "Risks: Deslizamiento, Volcán / Deslizamiento: Medium", "Family Fabáceas", "Deja nitrógeno en el suelo: bueno para rotar.", "El frijol dejó nitrógeno: aprovéchelo…" (la frase de rotación `porque`), y "₡14 500 per caja 18 kg".
- Por qué confunde o falla: textos del catálogo de datos (`efecto_suelo`, `porque`, tipos de riesgo, textura, familia, unidad de precio) no se traducen.
- Propuesta: traducir estos campos por clave, como se hace con el nombre del cultivo.
- Evidencia: `scratchpad/en/zona_CR30101-390.txt`, `cultivo_frijol-390.txt`.

### [SEM-09] La frase de rotación contradice las plagas del propio catálogo
- Severidad: media
- Tipo: consistencia
- Regla: R-43, R-42
- Dónde: #/cultivo/papa, "Qué sembrar después" · `web/src/datos-ejemplo/publicos.ts:363`
- Qué ve el agricultor: "Papa → Frijol o Maíz o Repollo. El frijol devuelve nitrógeno y no comparte plagas con la papa ni el tomate."
- Por qué confunde o falla: en las tarjetas de Oriental, Frijol y Tomate tienen en común "Mosca blanca". La frase promete algo que el propio catálogo desmiente. `recomendacion.ts` usa esa misma coincidencia para rechazar sugerencias, así que la app se contradice.
- Propuesta: quitar "ni el tomate" o decir "no comparte las plagas principales de la papa (tizón, polilla)".
- Evidencia: `scratchpad/es/cultivo_papa-360.txt`, `zona_CR30101-360.txt`.

### [SEM-10] Unidades de precio sin "de" (R-11)
- Severidad: baja
- Tipo: consistencia
- Regla: R-11
- Dónde: tarjetas en #/sembrar y #/zona; #/cultivo · `web/src/utilidades.ts:83` (`porUnidad`)
- Qué ve el agricultor: "₡14 500 por caja 18 kg", "por saco 45 kg", "por quintal 46 kg", "por rollo 12 manojos", "por caja 100 unidades".
- Por qué confunde o falla: se lee "caja 18 kg" sin "de", y en 360 px el texto se parte en dos líneas ("por rollo 12 / manojos").
- Propuesta: "por caja de 18 kg", "por rollo de 12 manojos".
- Evidencia: `scratchpad/es/zona_CR30101-360-2.png`.

### [SEM-11] "Evite: Frijol." en la ficha del Frijol, y "Dónde se da mejor" con nombres repetidos y sin puntaje
- Severidad: baja
- Tipo: ambiguo
- Regla: R-02, R-03
- Dónde: #/cultivo/frijol · `Cultivo.tsx:125-127,157-160`
- Qué ve el agricultor: "Qué sembrar después: Frijol → Maíz o Papa o Repollo … Evite: Frijol." y "Oriental, Cartago, Cartago / Excelente / Liberia, Liberia, Guanacaste / Bueno".
- Por qué confunde o falla: no dice que "evite" es repetir el mismo cultivo (y la lista a veces incluye otros de la familia). En "Dónde se da mejor", el cantón y el distrito se repiten y no hay puntaje.
- Propuesta: "No lo repita en el mismo terreno". Mostrar "Oriental (Cartago)" y "88/100".
- Evidencia: `scratchpad/es/cultivo_frijol-360.txt`.

### [SEM-12] Palabra partida en la tabla de vecinos a 360 px
- Severidad: baja
- Tipo: responsive
- Regla: R-21
- Dónde: #/zona/CR30101, 360 px · `Zona.tsx:84-98`
- Qué ve el agricultor: el reporte automático marca "Hectáreas", "Fincas", "Cosecha" y "diciembre" partidas en dos líneas. No lo confirmé visualmente (solo en `reporte.json`), pero la tabla está en su propia caja, como pide R-20.
- Propuesta: achicar la letra o abreviar la cabecera ("Ha").
- Evidencia: `scratchpad/es/reporte.json`.

### [SEM-13] "Cosecha: octubre" en la tabla de vecinos sin año ni aclaración, cuando hoy es noviembre
- Severidad: baja
- Tipo: ambiguo
- Regla: R-13, R-41
- Dónde: #/zona/CR30101 · `Zona.tsx:93`
- Qué ve el agricultor: "Chile dulce 54 ha, 22 fincas, cosecha octubre" cuando estamos en noviembre.
- Por qué confunde o falla: no se sabe si ya cosecharon o si es la cosecha del año que viene.
- Propuesta: mostrar la fecha o "octubre (ya cosechado)".
- Evidencia: `scratchpad/es/zona_CR30101-360.txt`.

### Nota sobre el reporte automático
Todos los "toque-chico" del `reporte.json` son del logo y del pie (enlaces de 22 px de alto: "Inicio", "Sembrar"…). Los confirmé en las capturas, pero no son de mis páginas: se los dejo al revisor del diseño general. Los botones y selects propios de mis páginas no salieron marcados.

### Sin problemas
- La explicación del puntaje (barras con frases como "El clima le va muy bien") es clara.
- Las insignias de nivel llevan ícono más texto, no solo color (R-51).
- El manejo del GPS, con avisos y pasos para dar el permiso, y el límite de 20 s son sólidos.
- Los enlaces externos de cursos llevan `rel="noreferrer"` y no hay `dangerouslySetInnerHTML`.
- No vi `undefined`, `NaN` ni claves de traducción.
- El calendario de siembra de la ficha coincide con "Ahora, en noviembre" en las tarjetas.
- Las fechas van en formato día-mes-año.

### No pude revisar
- Un distrito elegido en `#/sembrar`: la captura abre sin zona. Revisé el flujo solo por código, incluido el desplazamiento automático.
- Error de red, carga lenta y distrito sin datos: no se pueden simular en modo demo. Lo comenté solo desde el código.
- El desplegable "¿Por qué este puntaje?" abierto y la dirección de la barra de riesgo (es inversa: más es peor, y está oculta a lectores de pantalla).
- El mapa táctil: interacción, zoom y toques errados. Solo leí el código de `MapaUbicacion.tsx`.
- El tema oscuro (azul) y el inglés: solo vi el texto, no las imágenes de contraste.
- Anchos de 320 y 1920 px: solo usé 360, 390 y 1280.
