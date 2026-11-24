# Segunda pasada de empleado-precios — 2026-11-22

Segunda pasada de Precios (#/precios). Revisé el código de Precios.tsx, GraficoLinea.tsx, utilidades.ts y los textos es/en. Corrí la captura a 360 y 1280 px en español y tema claro, y miré precios-360-0 y precios-360-1. El reporte automático sale "sin problemas automáticos" en ambos anchos. Carpeta de capturas: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-22-53

## Estado de mis hallazgos anteriores

- **PRE-01 (precio al por mayor): arreglado.** El subtítulo dice "Precio al por mayor: lo que paga el comerciante en el mercado. Lo que recibe usted en la finca suele ser menor." Se ve en la captura. No lo vi en inglés, solo leí en.ts, que tiene la misma idea. Queda un detalle menor: el subtítulo dice "el mercado" y no nombra CENADA. El nombre aparece justo debajo, en la línea de fuentes. No lo repetí en el detalle de cada fila, pero ya no hace falta.
- **PRE-02 (CNP mezcla tipos de precio): arreglado a medias.** En CNP la fila ahora añade el mercado: `· {p.mercado}` en Precios.tsx:41. Además hay una línea fija bajo las pestañas, "CNP: … promedio nacional de cada semana". Solo lo vi en el código, porque la captura es de la pestaña CENADA. Sigue sin avisar que unos productos son precio al productor y otros de feria, y que no son comparables entre sí.
- **PRE-03 (contra qué fecha se compara): arreglado.** La captura muestra "Bajó 6 % desde el 12-11-2026", y el detalle dice "Precio anterior (fecha)". Solo falta la fecha cuando la base no la trae; ese caso cae al texto sin fecha. Problema nuevo en PRE-11.
- **PRE-04 (dato viejo): arreglado.** La captura muestra "Precios actualizados: 13-11-2026 · Fuente: PIMA" y debajo "Hace 9 días: el precio puede haber cambiado." El umbral es de más de 3 días en PIMA y más de 10 en CNP. La fecha ya es la más reciente de la fuente, no la de la primera fila.
- **PRE-05 (error y "No encontramos ese producto"): arreglado en el código.** Ese mensaje solo sale sin error y sin carga. Con búsqueda dice "No encontramos «X» en CENADA (PIMA). Pruebe con otra palabra o en la otra pestaña." Sin búsqueda dice "Todavía no hay precios de esta fuente. Vuelva a intentar más tarde." No lo vi en pantalla.
- **PRE-06 (tildes): arreglado en el código.** `sinTildes` normaliza los dos lados y pasa a minúsculas (Precios.tsx:70-81). No lo probé escribiendo en la página.
- **PRE-07 (gráfico): arreglado a medias.**
  - Ahora muestra `ErrorCarga` con reintento si falla, y "Todavía no hay suficiente historial de este producto." si hay menos de 2 puntos.
  - Sigue igual en dos cosas: el gráfico no tiene título con la unidad ni el período, y no tiene eje. Solo muestra fecha inicial y final y "Mín./Máx.".
  - Lo bueno ya existente: se toca o arrastra, tiene teclado, una pista y una tabla plegable.
  - No abrí una fila en captura, así que no confirmé cómo se ve en celular.
- **PRE-08 (unidades sin "de"): arreglado.** La captura muestra "por saco de 45 kg", "por caja de 100 unidades", "por rollo de 12 manojos" y "por saco de 20 unidades". `porUnidad` ahora arma la frase completa, con un caso especial para "java". No revisé el singular ("1 unidad").
- **PRE-09 (siglas): arreglado.** Una línea bajo las pestañas explica CENADA, PIMA y CNP, y se ve en la captura.
- **PRE-10 (pestañas como tablist incompleto): arreglado.** Ahora son botones con `aria-pressed` dentro de un `role="group"`.

## Problemas nuevos

### [PRE-11] "desde el 12-11-2026" se parte en dos líneas por el guion
- Severidad: baja
- Tipo: visual
- Regla: R-20
- Dónde: #/precios, 360 px, tema claro · Precios.tsx:14-25, es.ts:477-478
- Qué ve el agricultor: "▼ Bajó 6 % desde el 12-" y en la línea siguiente "11-2026". Pasa en las filas de Cebolla, Papa blanca y Chile dulce (precios-360-1.png).
- Por qué confunde: la fecha queda cortada y cuesta leerla.
- Propuesta: poner la fecha en un `<span style="white-space:nowrap">`, o usar guiones sin salto (U+2011). También se puede escribir "desde el 12-11" sin el año.
- Evidencia: precios-360-1.png

### [PRE-12] Las filas de 360 px quedan apretadas y de altura muy distinta
- Severidad: baja
- Tipo: visual
- Dónde: #/precios, 360 px · Precios.tsx:38-46
- Qué ve el agricultor: el nombre y la unidad ocupan una columna estrecha. "Papa blanca" se parte en dos líneas y "por saco de 45 kg" en dos o tres. La tendencia, que ahora es más larga, también se parte, así que las filas miden alturas muy distintas.
- Propuesta: en pantallas angostas apilar el precio y la tendencia debajo del nombre, a todo el ancho.
- Evidencia: precios-360-1.png

## Revisado y sin problemas
- La lista a 360 y 1280 px, sin desplazamiento de lado.
- Miles con espacio (₡25 000).
- Iconos ▲ ▼ ● junto al texto.
- "Se mantiene".
- El buscador tiene etiqueta oculta.

## No pude revisar
- Tema azul e inglés en captura; solo leí en.ts, y las claves nuevas están en ambos idiomas.
- Pestaña CNP en pantalla.
- Fila abierta y gráfico en celular.
- Carga lenta, error de red, sin datos, nombres largos y valores en cero o muy grandes. La demo no los muestra, así que están razonados solo desde el código.
