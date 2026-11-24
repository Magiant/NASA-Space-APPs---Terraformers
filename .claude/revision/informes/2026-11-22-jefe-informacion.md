# Informe de jefe-informacion — 2026-11-22

Comprobé en código los hallazgos clave (Zona.tsx, CultivosPorTemporada.tsx, Precios.tsx, Alertas.tsx, estilos.css, cursos.ts, utilidades.ts, es.ts, algolia.ts) y abrí la captura de TIE-01. No volví a capturar páginas. Lo que no pude simular (error de red, listas vacías) se marca "solo código".

## Confirmados (de más a menos grave)

### [INF-01] Los avisos de alerta quedan cortados en el celular y no hay botón para leerlos completos (TIE-01)
- Severidad: alta · Tipo: error · Regla: R-05
- Dónde: #/alertas?ver=alertas, 360 px · web/src/estilos.css:1194 (`line-clamp: 4`) y :1185 (2 columnas bajo 700 px) · Alertas.tsx:114
- Qué ve el agricultor: tarjetas de unos 160 px de ancho. Una dice "Revise los desagü…" y otra "Si cae ceniza, lave las hojas de…". El botón "Leer el aviso completo" solo sale si el texto pasa de 150 caracteres, y estos textos miden menos. Así que la acción queda cortada sin salida.
- Propuesta: en `@media (max-width: 699px)` poner `.lista-alertas { grid-template-columns: 1fr }` y quitar el `line-clamp` de `.alerta-descripcion`. Si se mantiene el recorte, mostrar siempre el botón cuando el texto esté cortado.
- Evidencia: scratchpad\o3\alertas_ver_alertas-360-1.png (la vi, se ve el corte).

### [INF-02] "Todos los cultivos" de la ficha de zona muestra solo 8 pero promete "todos" (SEM-01)
- Severidad: media (bajada de alta) · Tipo: consistencia · Regla: R-02, R-43
- Dónde: #/zona/CR30101, 360 px · Zona.tsx:57 (`limite={8}`), CultivosPorTemporada.tsx:26 y :35 · es.ts:210
- Qué ve el agricultor: la pestaña dice "Todos los cultivos · 8 cultivos" y el texto "Todos los que se dan bien aquí, sin importar el mes de siembra". Pero la pestaña "Para sembrar ahora" ya tiene 5 más "Otros 8 cultivos…", así que hay 13 o más y la lista está cortada a 8.
- Por qué falla: hay un comentario en el código que dice que esto es a propósito, pero el texto dice "todos". Pueden quedar fuera cultivos que sí se siembran ahora.
- Propuesta: no cortar "Todos" y mostrar el conteo real. Si se quiere cortar, el texto debe decir "Los 8 mejores de 13" y la pestaña, "8 de 13".
- Evidencia: scratchpad/es/zona_CR30101-360.txt

### [INF-03] Se recomienda Tomate como número 1 y la tabla de vecinos muestra que ya hay mucho sembrado, sin avisarlo (SEM-02)
- Severidad: alta · Tipo: consistencia · Regla: R-43, R-42
- Dónde: #/zona/CR30101 · Zona.tsx:54-100
- Qué ve el agricultor: "1 Tomate 88/100 Excelente. Ahora, en noviembre". Más abajo, "Tomate 64 ha, 27 fincas, cosecha diciembre", el más sembrado de la zona. El aviso general de la tabla no habla del tomate.
- Propuesta: en la tarjeta del cultivo, si ya hay muchas hectáreas, agregar "Ojo: en su zona ya hay 64 ha de tomate; si todos cosechan a la vez, el precio puede bajar." Versión en inglés: "Heads up: your area already has 64 ha of tomato; if everyone harvests at once, the price may drop." Sale de los datos de vecinos, no del puntaje. Corresponde a la decisión de producto: puede bajar el puntaje "Venta" o solo avisar.
- Evidencia: scratchpad/es/zona_CR30101-360.txt

### [INF-04] "Precios del mercado" nunca dice que es precio al por mayor ni de dónde sale (PRE-01 + PRE-09 + PRE-02)
- Severidad: alta · Tipo: ambiguo/datos · Regla: R-03, R-40, R-01
- Dónde: #/precios, todos los anchos · es.ts:427-443 · Precios.tsx:67-70 · publico.ts:262-291
- Qué ve el agricultor: "₡28 000 por saco 45 kg", pestañas "CENADA (PIMA)" y "CNP", sin explicación. En CNP el código elige "Productor", "Ferias", "CENADA" o "Borbón" según lo que haya, y la lista no muestra cuál se usó. Dos filas pueden ser de tipos distintos.
- Propuesta: subtítulo "Precio al por mayor: lo que paga el comerciante en el CENADA. Lo que recibe usted en la finca suele ser menor." Bajo las pestañas, una línea: "CENADA: mercado mayorista de Heredia, precio de cada día. CNP: Consejo Nacional de Producción, promedio de cada semana." En CNP, mostrar el mercado bajo cada precio ("al productor", "en feria"). Inglés: "Wholesale price: what the buyer pays at CENADA. What you get at the farm is usually lower."
- Evidencia: precios-360-0.png (CNP solo por código)

### [INF-05] "Bajó 6 % / Subió 12 %" no dice desde cuándo (PRE-03)
- Severidad: alta · Tipo: ambiguo · Regla: R-03
- Dónde: #/precios · Precios.tsx:13-24 · es.ts:438-440
- Qué ve el agricultor: "▼ Bajó 6 %" y "Precio anterior: ₡X" sin fecha.
- Propuesta: "Bajó 6 % desde el 12-11-2026" y "Precio anterior (12-11-2026): ₡X". En CNP, "desde la semana anterior". Hay que guardar la fecha del dato anterior.
- Evidencia: precios-360-0.png

### [INF-06] Puntaje y niveles no se explican (SEM-03)
- Severidad: alta · Tipo: ambiguo · Regla: R-03, R-01
- Dónde: tarjetas en #/sembrar, #/zona y #/cultivo (con `?zona`) · TarjetaCultivo.tsx:78-90 · es.ts:192, 209
- Qué ve el agricultor: "88/100", "Excelente", sin decir qué mide ni cuáles puntajes son cada nivel. En la ficha del cultivo no hay explicación.
- Propuesta: "88/100 es qué tan bien se da este cultivo en su distrito (clima, agua, suelo, riesgos y venta). 80 o más: Excelente · 60 a 79: Bueno." Ponerlo en la ayuda de la lista y en la ficha. Verifique los cortes reales (80/60) en `recomendacion.ts` antes de escribir los números.
- Evidencia: zona_CR30101-360-1.png, cultivo_frijol-360.txt

### [INF-07] Los niveles de alerta y las siglas IMN y CNE no se explican (TIE-03, ajustado)
- Severidad: media (bajada de alta) · Tipo: ambiguo · Regla: R-01, R-05
- Dónde: #/alertas?ver=alertas · es.ts:457 · Alertas.tsx:103-111
- Qué ve el agricultor: "Atención", "Vigilancia", "Alerta" y "Peligro" con colores, y "IMN" y "CNE" sin significado.
- Propuesta: bajo el subtítulo, "CNE: Comisión Nacional de Emergencias. IMN: Instituto Meteorológico Nacional." y una leyenda de una línea: "Vigilancia: esté pendiente · Atención: tome precauciones · Alerta: actúe hoy · Peligro: proteja su finca y su familia." Revisar con la CNE que esa gradación sea la oficial.
- Evidencia: scratchpad\o3\alertas_ver_alertas-360-0.png

### [INF-08] El pronóstico dice "Nublado" y "Llovizna" a la vez, y el 96 % no se entiende (TIE-02)
- Severidad: alta · Tipo: ambiguo · Regla: R-02
- Dónde: #/alertas (pestaña Tiempo) y #/zona/CR30101 · Pronostico.tsx:94-120, 182, 198
- Qué ve el agricultor: "21°C Nublado", luego "Ahora: Llovizna 96 %", luego "Hoy: Llovizna 24°/17° 96 % · 2 mm".
- Propuesta: la cabecera y la primera hora deben usar el mismo cielo. En la fila de días, "Lluvia: 96 % hoy · 2 mm en total". Dejo dicho que la causa (dos códigos distintos) la afirma el empleado y no la verifiqué en el código; confirmarlo antes de cambiar.
- Evidencia: scratchpad\o1\alertas-360.txt

### [INF-09] Decimales con punto en Zona y Cultivo, y "21°C" con otro formato (SEM-05 + TIE-05)
- Severidad: media · Tipo: consistencia · Regla: R-10
- Dónde: #/zona/CR30101 y #/cultivo/frijol · Zona.tsx:67-72 (`${v} °C`, `${v} mm`, `pH ${…}`) · Cultivo.tsx:91-96 · es.ts:375
- Qué ve el agricultor: "19.5 °C", "Entre 11.9 y 26.2 °C", "pH 6.1", "pH entre 5.5 y 7", mientras que en el pronóstico, justo encima, "21°C". Es la misma tarjeta de Zona.
- Propuesta: formatear con `toLocaleString(t.locale)` para "19,5 °C", "Entre 11,9 y 26,2 °C", "pH 6,1". Unificar a "21 °C" con espacio.
- Evidencia: zona_CR30101-360-3.png, zona_CR30101-360.txt, cultivo_frijol-360.txt

### [INF-10] Datos de la zona en lenguaje técnico y sin referencia (SEM-06)
- Severidad: media · Tipo: ambiguo · Regla: R-01, R-03
- Dónde: #/zona/CR30101 · Zona.tsx:67-72
- Qué ve el agricultor: "Temperatura 19.5 °C", "Balance +5 mm", "pH 6.1", "Franco (volcánico)", "Deslizamiento, Volcán".
- Propuesta: "Temperatura promedio del último mes"; "Le sobran 5 mm de agua: llovió un poco más de lo que usan las plantas"; "Acidez del suelo (pH) 6,1"; "Franco: tierra mezclada, ni muy arenosa ni muy pesada"; en riesgos, una acción corta ("Consulte a la CNE cómo prepararse"). Verifique que la temperatura sea de verdad el promedio del último mes.
- Evidencia: zona_CR30101-360-3.png

### [INF-11] Sensación, humedad y viento sin palabras simples (TIE-06, ajustado)
- Severidad: baja (bajada de media) · Tipo: ambiguo · Regla: R-01, R-03
- Dónde: Pronostico.tsx:200-205 · es.ts:345-347
- Qué ve el agricultor: "Sensación 23°", "Humedad 87 %", "Viento 6 km/h", "74 % · 8 mm".
- Propuesta: "Se siente como 23°" y "74 % de lluvia · 8 mm". Descarto "Aire muy húmedo" y "Viento suave", que son inventos de categorías sin regla que los pida.
- Evidencia: scratchpad\o1\alertas-360-1.png

### [INF-12] Fecha y fuente del pronóstico poco claras (TIE-07, ajustado)
- Severidad: baja · Tipo: datos · Regla: R-40, R-41
- Dónde: Pronostico.tsx:184,190,222 · es.ts:363-364
- Qué ve el agricultor: "Fuente: Open-Meteo · actualizado: 3:33 p. m." sin fecha, salvo si pasaron más de 24 horas.
- Propuesta: "actualizado hoy a las 3:33 p. m." y, sin señal, "Sin señal: este pronóstico es de hoy a las 3:33 p. m. y puede haber cambiado." Solo se lo vi en código y en captura con señal.
- Evidencia: scratchpad\o1\alertas-360-2.png

### [INF-13] La pestaña Alertas con zona elegida y 0 avisos no lo explica (TIE-08)
- Severidad: media · Tipo: ambiguo · Regla: R-05
- Dónde: #/alertas?ver=alertas, zona CR30101 · Alertas.tsx:85-98 · es.ts:455-456
- Qué ve el agricultor: "No hay alertas: Por ahora no hay avisos para su zona." No dice cuál zona ni que hay 3 avisos en otras zonas.
- Propuesta: "No hay avisos para Oriental. Hay 3 en otras zonas del país: toque 'Todo el país' para verlos." Inglés: "No notices for Oriental. There are 3 in other parts of the country: tap 'Whole country' to see them." Ajuste el texto del botón al real de en.ts.
- Evidencia: scratchpad\o2\alertas_ver_alertas-360.txt

### [INF-14] Dato de precios viejo se ve igual que uno de hoy (PRE-04)
- Severidad: media · Tipo: datos · Regla: R-41
- Dónde: #/precios · AvisoActualizado.tsx, Precios.tsx:63,89 · publico.ts:266-268
- Qué ve el agricultor: "Precios actualizados: 13-11-2026 · Fuente: PIMA" con hoy 22-11, sin aviso. La fecha mostrada es la de la primera fila (`lista[0]`).
- Propuesta: si pasan más de 3 días en CENADA (más de 10 en CNP), agregar "Hace 9 días: puede haber cambiado." Mostrar la fecha más reciente de la lista y no la de la primera fila.
- Evidencia: precios-360-0.png

### [INF-15] Con error o lista vacía, Precios dice "No encontramos ese producto" (PRE-05)
- Severidad: media · Tipo: error · Regla: R-02, R-05
- Dónde: #/precios · Precios.tsx:91,96 (confirmado: `!cargando && lista.length === 0` muestra `noHay` aun con `precios.error`)
- Propuesta: mostrar `noHay` solo si no hay error y `busca` no está vacío. Sin búsqueda y sin datos: "Todavía no hay precios de esta fuente. Vuelva a intentar más tarde." Solo código.

### [INF-16] La búsqueda de precios no ignora las tildes (PRE-06)
- Severidad: media · Tipo: error · Regla: R-30
- Dónde: Precios.tsx:60-62 (confirmado: solo `toLowerCase()`). "pina" no encuentra "Piña".
- Propuesta: normalizar los dos lados con `.normalize('NFD').replace(/\p{Diacritic}/gu, '')`.

### [INF-17] El gráfico de precios falla en silencio y no dice qué mide (PRE-07)
- Severidad: media · Tipo: error · Regla: R-05, R-41, R-03
- Dónde: Precios.tsx:44, GraficoLinea.tsx:23,103-110. Solo código: no se abrió en captura.
- Propuesta: con error, `ErrorCarga` con "Reintentar"; con menos de 2 puntos, "Todavía no hay suficiente historial de este producto."; un título sobre el gráfico, "Precio por saco de 45 kg, últimos 30 días".

### [INF-18] Unidades de precio sin "de" y partidas en dos líneas (SEM-10 + PRE-08)
- Severidad: media · Tipo: consistencia · Regla: R-11
- Dónde: web/src/utilidades.ts:83-86 (`porUnidad`), usada en Sembrar, Zona, Cultivo y Precios. Confirmado: devuelve `por ${u}` sin transformar.
- Qué ve el agricultor: "por caja 18 kg", "por saco 45 kg", "por quintal 46 kg", "por rollo 12 manojos", "por caja 100 unidades". En 360 px se parte "por rollo 12 / manojos".
- Propuesta: en `porUnidad`, insertar "de" cuando la unidad tenga forma "<envase> <cantidad> <medida>": "por saco de 45 kg", "por rollo de 12 manojos". En inglés, "per 45 kg sack". Arreglarlo una sola vez; también aplica a la demo en inglés ("per caja 18 kg", ver INF-20). Es de severidad media y no baja porque afecta la pantalla principal de precios.
- Evidencia: zona_CR30101-360-2.png, precios-360-0.png

### [INF-19] La lista de rotación contradice las plagas del catálogo (SEM-09)
- Severidad: media · Tipo: consistencia · Regla: R-43, R-42
- Dónde: #/cultivo/papa, "Qué sembrar después" · datos-ejemplo/publicos.ts:363. Texto confirmado: "El frijol devuelve nitrógeno y no comparte plagas con la papa ni el tomate." No volví a verificar la "Mosca blanca" compartida; el empleado la vio en las tarjetas de Oriental y existe esa plaga en el catálogo (publicos.ts:83).
- Propuesta: quitar "ni el tomate": "El frijol devuelve nitrógeno y no comparte las plagas principales de la papa." Verificar que sea cierto antes.

### [INF-20] Idioma: textos del catálogo y de los cursos quedan en español en la versión en inglés (SEM-08 + TIE-09 + CUR-01)
- Severidad: media (la de cursos, alta si se prioriza inglés) · Tipo: consistencia · Regla: R-07
- Dónde:
  - #/zona y #/cultivo, `?idioma=en`: "Soil: Franco (volcánico)", "Risks: Deslizamiento, Volcán", "Family Fabáceas", `efecto_suelo`, la frase `porque` de rotación (publicos.ts:362-371).
  - #/capacitaciones, en inglés: el selector "Topic" ofrece "Plagas" y "Producción"; las etiquetas "PLAGAS" y "PRODUCCIÓN" (Capacitaciones.tsx:105,126); el texto después de " · " en `tema`.
  - #/alertas, en inglés: títulos y texto de los avisos en español (publicos.ts:245). Esto es duda: puede ser a propósito si la fuente oficial está en español.
- Propuesta: traducir por clave, como ya se hace con el nombre del cultivo. Para cursos, `cursos.areas: { Plagas: 'Pests', Producción: 'Production', Agua: 'Water', Suelo: 'Soil', Mercado: 'Market' }` en es.ts y en.ts, mostrando ese nombre pero filtrando por el valor original. Los títulos de curso y los avisos oficiales pueden quedar en español con la nota "(in Spanish)".
- Evidencia: scratchpad/en/zona_CR30101-390.txt, terrafarm-revision\2026-11-22-21-33\capacitaciones-360-1.png

### [INF-21] "INA" sin explicar y el botón no dice qué hace (CUR-03)
- Severidad: media · Tipo: ambiguo · Regla: R-01, R-35
- Dónde: #/capacitaciones · es.ts:465,472 · Capacitaciones.tsx:135
- Qué ve el agricultor: "Capacitaciones del INA y otras instituciones" y "Ver en INA ↗".
- Propuesta: subtítulo "Cursos del Instituto Nacional de Aprendizaje (INA). Filtre por lo que siembra." y botón "Ver el curso en el INA ↗". Descarto escribir "gratuitos" y los pasos de inscripción hasta verificar que sea cierto para todos los cursos (en la demo, no). Inglés: "Courses from the National Learning Institute (INA)".
- Evidencia: capacitaciones-360-0.png

### [INF-22] Lista de cursos vacía sin salida (CUR-04)
- Severidad: baja (bajada de media) · Tipo: ambiguo · Regla: R-05
- Dónde: Capacitaciones.tsx:112-117 · es.ts:487-488. Solo código: la demo siempre trae 8.
- Propuesta: "No hay cursos con estos filtros. Quite alguno para ver más." con botón "Quitar los filtros" en las dos vistas.

### [INF-23] Singular y plural: "1 cursos", "1 horas" (CUR-05)
- Severidad: baja · Tipo: consistencia · Regla: R-12
- Dónde: es.ts:477 (`nCursos: (n) => \`${n} cursos\`` confirmado) y es.ts:470 (`horas: 'horas'`), y en en.ts:462.
- Propuesta: `n === 1 ? '1 curso' : …` y, para horas, "1 hora". Inglés "1 course" y "1 hour". Solo código.

### [INF-24] El curso "Granos básicos: frijol y maíz" se muestra "Para: Arroz" (CUR-02, ajustado)
- Severidad: baja (bajada de media) · Tipo: datos · Regla: R-42
- Dónde: web/src/logica/cursos.ts:17. Confirmado: la regla `/granos b[aá]sicos/` añade arroz aunque el título nombre solo frijol y maíz.
- Propuesta: no aplicar `granos básicos` si ya hay cultivos nombrados en el título. Es decisión de producto, porque en Costa Rica "granos básicos" sí incluye arroz.

### [INF-25] Tabla de vecinos con palabras partidas a 360 px (SEM-12 + TIE-10 parte de zona)
- Severidad: baja · Tipo: responsive · Regla: R-21
- Dónde: #/zona/CR30101, 360 px · Zona.tsx:84-98. "Hectáreas", "Fincas", "Cosecha" y "diciembre" se parten. Dato del `reporte.json` del empleado, no lo vi en imagen; la tabla va en su propia caja (R-20 se cumple).
- Propuesta: cabeceras "Ha", "Fincas" y "Cosecha" más cortas, o letra menor en la tabla.

### [INF-26] Enlaces del pie de 22 px de alto y logo de 34 px, en toda la app (SEM nota + TIE-10 + CUR-09)
- Severidad: media · Tipo: responsive · Regla: R-22
- Dónde: pie común y cabecera, todas las páginas y anchos, tema claro. Cuatro empleados lo marcan en `reporte.json` (`toque-chico`).
- Propuesta: dar al menos 44 px de alto a los enlaces del pie (relleno vertical) y al logo. Es un cambio único para toda la app: pasarlo al revisor del diseño general.
- Evidencia: reporte.json de cada carpeta; capturas -360-1.png de capacitaciones.

### [INF-27] Pestañas CENADA/CNP y similares con `tablist` incompleto (PRE-10, ampliado)
- Severidad: baja · Tipo: accesibilidad · Regla: R-52
- Dónde: Precios.tsx:73-82. Confirmado: `role="tab"` sin panel ni flechas. El mismo patrón se repite en CultivosPorTemporada.tsx (líneas 28-36 del interruptor) y, según el empleado de cursos, en Capacitaciones.
- Propuesta: botones normales con `aria-pressed`, o completar el patrón con `tabpanel` y flechas. Arreglarlo en el componente `interruptor`.

### [INF-28] "Cosecha: octubre" y "Riesgos: Sin dato" (SEM-13 + SEM-07)
- Severidad: baja · Tipo: datos · Regla: R-41, R-13
- Dónde: Zona.tsx:72 y :93. Si `z.riesgos` está vacío, sale "Sin dato" (confirmado en código); no se distingue "no hay riesgos" de "no tenemos el dato". La tabla de vecinos muestra "cosecha octubre" estando en noviembre.
- Propuesta: lista vacía, "No hay riesgos registrados para este distrito". Para la cosecha ya pasada, "octubre (ya cosechado)" o el año. Solo código para riesgos; la cosecha sí está en el .txt.

### [INF-29] El selector de lugares no ofrece reintento si falla (SEM-04)
- Severidad: media · Tipo: error · Regla: R-34, R-05
- Dónde: SelectorUbicacion.tsx:111,127-129. Solo código: no se pudo simular el error.
- Propuesta: con error, la opción dice "No se pudo cargar la lista" y aparece el botón "Intentar de nuevo"; explicar por qué "Usar mi ubicación" está deshabilitado.

### [INF-30] "Evite: Frijol." y "Dónde se da mejor" (SEM-11)
- Severidad: baja · Tipo: ambiguo · Regla: R-02, R-03
- Dónde: #/cultivo/frijol · Cultivo.tsx:125-127,157-160.
- Propuesta: "No lo repita en el mismo terreno" y "Oriental (Cartago) · 88/100".
- Evidencia: scratchpad/es/cultivo_frijol-360.txt

## Ajustados
- SEM-01: bajé de alta a media; el código tiene un comentario que dice que mostrar 8 es intencional. Falla el rótulo "todos" y el conteo, no la lógica.
- TIE-03: el empleado dijo que el orden Atención/Vigilancia/Alerta no sigue la gravedad. Es falso: el orden es Vigilancia (verde), Atención (amarillo), Alerta (naranja), Peligro (rojo), que sí sube. Quedó solo lo de explicar niveles y siglas; bajé a media.
- TIE-06: dejé solo "Se siente como" y "% de lluvia"; quité las categorías inventadas ("Viento suave", "Aire muy húmedo") por no tener regla.
- TIE-07: bajada a baja; la hora sola no es grave y ya hay fuente y hora.
- CUR-03: quité "gratuitos" y los pasos de inscripción, porque no los puedo verificar.
- SEM-10 + PRE-08: junté en INF-18 y subí a media porque toca Precios.
- CUR-02: bajada a baja; "granos básicos" incluye arroz en el uso común.
- CUR-04: bajada a baja; solo código.
- PRE-10: ampliada con las otras pestañas de la app.

## Descartados
- TIE-04 (aviso vencido en la demo): solo ocurre en la demo; en modo real se filtra por `fin`. Es un riesgo de datos falsos del ejemplo, no de la app real. Lo paso al supremo como nota, no como error.
- CUR-06 (provincias vacías, "undefined horas"): especulativo. En JSX un `undefined` no escribe "undefined"; solo dejaría un hueco, y no sé si la fuente real trae esos casos. No se puede comprobar.
- CUR-07 (explicación de "Recomendados" frente a "Todos los meses"): preferencia sin regla; el texto "Cultivos que se siembran de noviembre a enero" ya dice el criterio.
- CUR-08 (el filtro "Lo que siembro" cambia al pasar de pestaña): duda sin reproducir, funciona de forma coherente.

## Encontrados por el jefe

### [JINF-01] El mismo término "Alerta" nombra un nivel y la página
- Severidad: baja · Tipo: consistencia · Regla: R-06
- Dónde: es.ts:457 (`naranja: 'Alerta'`) frente a la pestaña "Alertas"/"Tiempo". Una tarjeta "ALERTA" naranja (Déficit de lluvia en Guanacaste) aparece dentro de la pestaña "Alertas", y no se distingue el nivel de la categoría.
- Propuesta: dejar el nombre de la página y renombrar el nivel naranja a "Precaución"; se verá junto a la leyenda de INF-07. Decisión del supremo.
- Evidencia: scratchpad\o3\alertas_ver_alertas-360-1.png

### [JINF-02] Cursos y Zona usan el mismo cultivo con enfoque distinto sin avisarlo
- Severidad: baja · Tipo: consistencia · Regla: R-43
- Dónde: #/capacitaciones y #/zona. Los cursos recomendados se filtran por el calendario de siembra ("noviembre a enero"), pero el curso de "Cultivo de tomate en invernadero" aparece como recomendado aunque la zona ya tiene mucho tomate (INF-03). No es una contradicción dura, pero ambas páginas recomiendan tomate. Si se añade el aviso de INF-03, convendría que Cursos use el mismo criterio o no lo contradiga.
- Propuesta: solo una nota; no cambiar nada hasta decidir INF-03.

## Notas para el supremo
1. **Idioma (INF-20):** el mismo problema de fondo en tres páginas: los textos que vienen del catálogo o de la base (riesgos, familias, temas de cursos, avisos, unidades de precio) no pasan por traducción. Conviene una regla o un cambio único: traducir por clave.
2. **Una sola función arregla dos hallazgos:** `porUnidad` (INF-18) y el formato numérico (`toLocaleString(t.locale)`, INF-09). Conviene un solo cambio con una función compartida y usarla en Zona, Cultivo y el pronóstico.
3. **Pie de la app (INF-26):** es del diseño general, no de estas cuatro páginas; que lo vea el revisor del diseño.
4. **Decisión de producto en INF-03:** ¿se baja el puntaje de "Venta" cuando hay mucha siembra vecina, o solo se avisa? Y en INF-24, ¿"granos básicos" incluye arroz?
5. **Demo frente a real:** TIE-04 y varios casos (error de red, listas vacías, INF-15, INF-17, INF-22, INF-29) no se pueden ver en la demo. Si hay tiempo, vale la pena una pasada simulando fallos.
6. **Corrección al orden de gravedad:** por INF-07, el orden de los cuatro niveles ya es correcto; no cambiar el orden de la lista.
7. No pude comprobar tema oscuro, inglés visual ni los anchos de 320 y 1920 px en ninguna página.

Captura confirmada: C:\Users\PC\AppData\Local\Temp\claude\cff5e9b249d026e9\176261a1-31f1-4afb-a5bd-a4bf49f6e0eb\scratchpad\o3\alertas_ver_alertas-360-1.png
