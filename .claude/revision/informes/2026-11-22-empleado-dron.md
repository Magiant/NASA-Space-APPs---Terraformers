# Informe de empleado-dron — 2026-11-22

Revisión de Escaneo con dron (#/dron). Capturas en C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-21-32\ (dron-360/390/768/1280, tema crema, español). Solo revisé la finca La Esperanza.

### [DRO-01] El título dice "sanas" y debajo dice que hay estrés
- Severidad: alta
- Tipo: ambiguo
- Regla: R-02
- Dónde: #/dron, 360 px, tema claro · web/src/paginas/privadas/EscaneoDron.tsx:33 y :225-226
- Qué ve el agricultor: "Sus plantas están sanas", debajo "21 % del terreno tiene plantas con estrés.", y más abajo "10 de 47 parcelas para revisar".
- Por qué confunde o falla: el título sale solo del promedio (índice verde 0,74 ≥ 0,6) y ignora el área con estrés. El agricultor lee "todo bien" y se pierde las 10 parcelas que debe revisar.
- Propuesta: calcular el título también con el área con estrés. Si el estrés pasa de 10 %, usar "En general sus plantas están bien, pero 10 parcelas necesitan revisión".
- Evidencia: dron-360-0.png y dron-360-3.png (lista "Qué hacer")

### [DRO-02] Números con punto decimal en vez de coma
- Severidad: media
- Tipo: consistencia
- Regla: R-10
- Dónde: #/dron, todos los anchos, es · EscaneoDron.tsx:41 (`dos = n.toFixed(2)`), :114; es.ts:743, 749, 793, 795
- Qué ve el agricultor: "0.74 de 1" y "2.5 ha".
- Por qué confunde o falla: en Costa Rica se escribe "0,74" y "2,5 ha". Los m² grandes (por ejemplo 1520) y las hectáreas tampoco llevan espacio de miles. En inglés el punto sí es correcto.
- Propuesta: formatear con el idioma activo (`toLocaleString('es-CR')`) en `dos`, en las hectáreas y en los m².
- Evidencia: dron-360.txt y dron-360-0.png

### [DRO-03] El botón flotante "Reportar una plaga" tapa contenido del mapa y del resumen
- Severidad: media
- Tipo: responsive
- Regla: R-23
- Dónde: #/dron, 360 px · captura 0 (tapa "Cada cuadro es una parcela…"), captura 1 (tapa el texto de ayuda del mapa) y captura 3 (tapa la parte baja de "¿Cómo mide el dron…?")
- Qué ve el agricultor: el botón verde flotante queda encima del texto en cada pantalla. Además, la misma acción ya aparece dos veces en la página ("Qué hacer" y el detalle de parcela).
- Por qué confunde o falla: tapa texto mientras se lee y el botón en la parte baja de la página compite con el de "Qué hacer".
- Propuesta: dejar espacio al final de la página (padding inferior) y valorar ocultar el flotante en esta ruta, ya que la página tiene su propio botón. Es un hallazgo del shell, no solo de esta página.
- Evidencia: dron-360-0.png, dron-360-1.png, dron-360-3.png

### [DRO-04] El mapa 3D es muy pequeño para tocarlo con el dedo
- Severidad: media
- Tipo: responsive
- Regla: R-22
- Dónde: #/dron, 360 px, modo 3D (el modo por defecto) · web/src/componentes/MapaFinca3D.tsx
- Qué ve el agricultor: un bloque de unos 280 × 130 px con 47 parcelas. Cada parcela mide aproximadamente 25 × 12 px, y la fila F queda muy aplastada por la perspectiva.
- Por qué confunde o falla: con el dedo es fácil tocar la parcela vecina. Los símbolos • miden 3 px. Hay zoom (acercar/alejar en el código), pero en la captura no se ve ningún aviso de que existe. No abrí MapaFinca3D.tsx en detalle, así que no verifiqué cómo funciona el zoom.
- Propuesta: dar más alto al lienzo en celular, o avisar "Toque Plano para elegir parcelas con más precisión" cuando el ancho sea menor de 400 px.
- Evidencia: dron-360-2.png

### [DRO-05] La pendiente no explica sus niveles ni el 30 %
- Severidad: media
- Tipo: ambiguo
- Regla: R-01, R-03
- Dónde: #/dron · EscaneoDron.tsx:251; es.ts:754-755
- Qué ve el agricultor: "Pendiente 12 % — Suave". Cuando pasa de 30 % dice "Fuerte: siembre en curvas de nivel".
- Por qué confunde o falla: solo existen dos niveles (suave y fuerte), sin el "moderada" que se esperaría. No se explica qué es un 12 %, ni a partir de qué valor es fuerte. "Curvas de nivel" es un término técnico sin explicación.
- Propuesta: "12 % — Suave: baja 12 m por cada 100 m. Desde 30 % se considera fuerte." Y en curvas: "siembre en curvas de nivel (siguiendo el nivel del terreno, sin bajar la cuesta)".
- Evidencia: dron-360-1.png

### [DRO-06] El índice verde y su rango se explican poco, y la leyenda no aclara los símbolos
- Severidad: baja
- Tipo: ambiguo
- Regla: R-01, R-51
- Dónde: #/dron · es.ts:748-750, 790; EscaneoDron.tsx:38
- Qué ve el agricultor: "Índice verde 0.74 de 1 · Más cerca de 1 = plantas más verdes y sanas". En la leyenda aparece "Sanas" sin símbolo, "Algo de estrés (•)" y "Con problemas (!)".
- Por qué confunde o falla: no se dice desde qué valor hay estrés (menos de 0,6) ni cuál es el valor de problemas (menos de 0,4). El "Sanas" sin símbolo es correcto, pero la leyenda deja la duda de si falta algo.
- Propuesta: "Verde y sano desde 0,6. Menos de 0,4 es problema." Y en la leyenda, "Sanas (sin marca)".
- Evidencia: dron-360-1.png y dron-360-2.png

### [DRO-07] "Qué hacer" mezcla la lista de parcelas con la protección legal, sin ordenar por importancia
- Severidad: baja
- Tipo: ambiguo
- Regla: R-05
- Dónde: #/dron, 360 px · EscaneoDron.tsx:421-426
- Qué ve el agricultor: "Revise las parcelas E2, F3, B6, E3, A6, B7, D3, E4 y 2 más…". Después, un párrafo largo de 11 parcelas a menos de 15 m de un río, con la cita de la Ley Forestal. Los dos son acciones dispersas dentro de una lista de texto largo.
- Por qué confunde o falla: la lista de parcelas está primero (bien, es lo más urgente), pero el texto de la ley es muy largo para un celular. Además, "11 parcelas" de protección y "10 parcelas" para revisar son dos conjuntos distintos y no se aclara.
- Propuesta: acortar a "11 parcelas están a menos de 15 m del río: no corte árboles ni fumigue ahí." y dejar la cita de la ley en un enlace aparte.
- Evidencia: dron-360-3.png

### [DRO-08] Casos sin comprobar en el código
- Severidad: baja
- Tipo: error
- Regla: R-34, R-41
- Dónde: EscaneoDron.tsx:61-64, 84
- Qué ve el agricultor: solo "Cargando…" mientras espera. Si `useCargar` falla (error de red), no hay mensaje en la página; esto lo vi en el código, no en una captura.
- Por qué confunde o falla: no vi manejo de error de `datos.misFincas()` ni de `vuelosDron`. Se vería la página vacía o una portada sin datos, sin decir que falló. Tampoco se muestra de qué fecha es el vuelo respecto a hoy: "Vuelo del 02-11-2026" no dice si es viejo (R-41).
- Propuesta: mostrar "No pudimos cargar el vuelo. Vuelva a intentar cuando tenga señal." con un botón. Añadir "hace 20 días" junto a la fecha.
- Evidencia: solo código (no reproducido en la demo)

Lo que revisé y no tenía problemas:
- Los números del resumen coinciden: 21 % de estrés y 10 de 47 parcelas.
- Las fechas van en día-mes-año.
- El inglés está completo y no vi claves sueltas ni `undefined`.
- Los chips de vuelo y los selectores se ven bien a 360 px, sin desplazamiento de lado.
- El orden de las parcelas a revisar va de peor a mejor.
- El reporte.json solo marca controles chicos del pie de página y de la marca del encabezado (shell), no de la página del dron.

No pude revisar:
- Capturas con `--tema=azul` y con `--idioma=en`: no las corrí, solo leí los textos en inglés en en.ts.
- Capturas a 390, 768 y 1280 px: se generaron pero solo abrí las de 360 px.
- Los casos sin datos, error de red, nombres largos y valores en cero: la demo no los muestra, solo se vieron en el código.
- El funcionamiento interno de MapaFinca3D.tsx y elementosFinca.ts: no los abrí a fondo.
