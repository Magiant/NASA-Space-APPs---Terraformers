# empleado-precios · 2026-11-27

Revisó Precios.tsx, GraficoLinea.tsx, utilidades.ts, es.ts, en.ts y servicios/publico.ts. Capturas 360/390/768/1280 es claro y 360 en azul, carpeta C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-27-23-22. A 1280 px "toque-chico" solo en enlaces del pie (261×32).

### [PRE-01] "Se mantiene" aparece cuando no hay precio anterior para comparar
- Severidad: alta · Tipo: datos · Regla: R-41, R-03
- Dónde: web/src/servicios/publico.ts:233-243 (aRegistro), Precios.tsx:14-27
- Qué ve: "● Se mantiene" en un producto con un solo precio publicado.
- Por qué falla: sin precio anterior, el código usa previo = precio; cambio 0 y tendencia "estable". En la fila abierta saldría "Precio anterior: ₡X" igual al actual, sin fecha (fecha_anterior null).
- Propuesta: tendencia "sin comparar" con "Aún sin precio anterior para comparar" y ocultar "Precio anterior". Confirmado solo en código.

### [PRE-02] La fecha "Precios actualizados" es una sola para toda la lista
- Severidad: media · Tipo: datos · Regla: R-40, R-41
- Dónde: Precios.tsx:83-86 y 115, publico.ts:225-243
- Por qué falla: se muestra la fecha más reciente de la fuente, pero la consulta trae hasta 45 días y cada producto muestra su último dato; uno de hace un mes se ve igual que uno de ayer. El aviso "Hace N días" tampoco lo detecta.
- Propuesta: guardar p.fecha en la fila y mostrar "Precio del 05-11-2026" cuando difiera de la fecha de la fuente. Solo código.

### [PRE-03] El aviso de dato viejo no dice qué hacer
- Severidad: media · Tipo: ambiguo · Regla: R-05, R-02, R-03
- Dónde: es.ts:479
- Qué ve: pestaña "CENADA (PIMA) · Cada día" y debajo "Hace 14 días: el precio puede haber cambiado." en letra pequeña.
- Propuesta: "Estos precios tienen 14 días (13-11-2026) y pueden haber cambiado. Confirme el precio con el comprador antes de vender." con estilo de aviso. Inglés: "These prices are 14 days old and may have changed. Check with your buyer before selling."

### [PRE-04] El gráfico no dice unidad, período ni qué mide
- Severidad: media · Tipo: ambiguo · Regla: R-03, R-11, R-40
- Dónde: GraficoLinea.tsx:103-125, Precios.tsx:58
- Qué ve: línea, fecha inicial, "Mín. ₡X · Máx. ₡Y", fecha final. En la tabla plegable la columna se llama como el producto.
- Propuesta: título "Precio por saco de 45 kg, últimos 30 días" ("últimas N semanas" en CNP); columna "Precio (₡)". Solo código.

### [PRE-05] La búsqueda solo busca en la pestaña activa
- Severidad: baja · Tipo: ambiguo · Regla: R-30
- Dónde: Precios.tsx:82 y 122-124
- Propuesta: si hay coincidencias en la otra pestaña, decir "«X» está en CNP (3 resultados)" con botón para cambiar. Lo actual es aceptable mientras tanto.

### [PRE-06] En CNP se mezclan precios de distinto tipo
- Severidad: baja · Tipo: ambiguo · Regla: R-03, R-40
- Dónde: publico.ts:258-278, Precios.tsx:42
- Propuesta: en la línea de fuentes: "En CNP, cada producto muestra el mercado indicado al lado. El CNP publica con unas 3 semanas de atraso."

### [PRE-07] Inglés: "per bundle of 12 bunches" y fecha día-mes-año
- Severidad: baja · Tipo: consistencia · Regla: R-07, R-13
- Propuesta: "per roll of 12 bunches"; fecha con mes en palabras en inglés ("12 Nov 2026").

### [PRE-08] "CENADA (PIMA)" en la pestaña y "Fuente: PIMA" debajo
- Severidad: baja · Tipo: consistencia · Regla: R-06
- Dónde: Precios.tsx:114, es.ts:470-471, AvisoActualizado.tsx
- Propuesta: "Fuente: CENADA (PIMA)".

Sin problemas: subtítulo al por mayor; unidades con "de"; miles con espacio; fecha con guion no separable; tendencia con ícono; rejilla sin desborde; buscador con etiqueta y sin tildes; gráfico con teclado, pista, tabla, error con reintento.

No pudo revisar: fila abierta en celular; pestaña CNP en pantalla; búsqueda escribiendo; carga lenta, error, precio 0 (se muestra "₡0" sin aviso).
