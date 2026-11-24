# Informe de empleado-precios — 2026-11-22

Revisión de Precios del mercado (#/precios). Revisé las capturas a 360, 390, 768 y 1280 px en tema claro y en español, el código de los cuatro archivos y los textos es/en. No corrí `--tema=azul` ni `--idioma=en`, ni abrí el gráfico en una captura. Detalle al final.

### [PRE-01] Nunca dice que es precio al por mayor
- Severidad: alta
- Tipo: ambiguo
- Regla: R-03, R-40
- Dónde: #/precios, 360 px, tema claro · web/src/idiomas/es.ts:427-443, Precios.tsx:67-70
- Qué ve el agricultor: "Precios del mercado · Toque un producto para ver cómo ha cambiado su precio." y "₡28 000 por saco 45 kg".
- Por qué confunde: nada dice que es lo que paga el comerciante al por mayor en el CENADA. El agricultor puede creer que es lo que le pagarán a él.
- Propuesta: subtítulo "Precio al por mayor: lo que paga el comerciante en el CENADA. Lo que recibe usted en la finca suele ser menor." Poner esa frase también en el detalle de cada fila.
- Evidencia: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-21-32\precios-360-0.png

### [PRE-02] La pestaña CNP mezcla precios de otro tipo (productor, ferias) sin decirlo
- Severidad: alta
- Tipo: datos
- Regla: R-03, R-40, R-41
- Dónde: #/precios, pestaña CNP · web/src/servicios/publico.ts:262-291
- Qué ve el agricultor: la misma lista de "Precios del mercado". El código elige "Productor", "Ferias", "CENADA" o "Borbón" según lo que haya, y la pantalla no muestra cuál se usó. El mercado solo aparece al abrir la fila.
- Por qué confunde: el precio de un producto puede ser al productor y el de otro de feria. No son comparables entre sí ni con la pestaña CENADA.
- Propuesta: mostrar el mercado bajo cada precio ("Promedio nacional · al productor") y una línea fija bajo la pestaña CNP que explique qué mide.
- Evidencia: el código. No vi la pestaña CNP en captura; la captura solo mostró CENADA.

### [PRE-03] "Subió / Bajó X %" no dice contra qué fecha se compara
- Severidad: alta
- Tipo: ambiguo
- Regla: R-03
- Dónde: #/precios, todos los anchos · Precios.tsx:13-24, es.ts:438-440, publicas/publico.ts:226-236
- Qué ve el agricultor: "▼ Bajó 6 %", "▲ Subió 12 %".
- Por qué confunde: el código compara con el boletín anterior. En PIMA puede ser un día, pero con fines de semana o feriados puede ser más. En CNP son semanas. "Precio anterior: ₡X" tampoco trae fecha.
- Propuesta: guardar la fecha del dato anterior y escribir "Bajó 6 % desde el 12-11-2026" y "Precio anterior (12-11-2026): ₡X". En CNP, "desde la semana anterior".
- Evidencia: precios-360-0.png

### [PRE-04] Dato viejo se ve igual que uno de hoy; en CNP el atraso no se avisa
- Severidad: media
- Tipo: datos
- Regla: R-41, R-13
- Dónde: #/precios · web/src/componentes/AvisoActualizado.tsx, Precios.tsx:63,89, publico.ts:266-268
- Qué ve el agricultor: "Precios actualizados: 13-11-2026 · Fuente: PIMA". Hoy es 22-11, son 9 días, y no hay advertencia. Los comentarios del código dicen que el CNP publica con unas 3 semanas de atraso, pero la pantalla no lo dice.
- Por qué confunde: parece información reciente.
- Propuesta: si la fecha tiene más de 3 días en PIMA (o más de 10 en CNP) agregar "Hace 9 días. Puede haber cambiado." La fecha mostrada es la de la primera fila (`lista[0]`), no necesariamente la de todas.
- Evidencia: precios-360-0.png

### [PRE-05] Si falla la carga, además del error dice "No encontramos ese producto"
- Severidad: media
- Tipo: error
- Regla: R-02, R-05
- Dónde: #/precios, error de red o sin datos · Precios.tsx:91,96
- Qué ve el agricultor: con error o con lista vacía, `!cargando && lista.length === 0` también muestra "No encontramos ese producto." junto al error.
- Por qué confunde: el mensaje culpa a la búsqueda cuando el problema es de red o de datos. Sin datos y sin búsqueda, tampoco hay un mensaje propio.
- Propuesta: mostrar `noHay` solo si no hay error y `busca` no está vacío. Sin búsqueda y sin datos: "Todavía no hay precios de esta fuente. Vuelva a intentar más tarde." Con búsqueda sin resultados: "No encontramos «X» en CENADA. Pruebe en la pestaña CNP o con otra palabra."
- Evidencia: el código. No lo vi en captura.

### [PRE-06] La búsqueda no ignora las tildes
- Severidad: media
- Tipo: error
- Regla: R-30
- Dónde: #/precios · Precios.tsx:60-62
- Qué ve el agricultor: solo se usa `toLowerCase()`. Escribir "pina" no encuentra "Piña", ni "limon" encuentra "Limón". Las mayúsculas sí funcionan.
- Propuesta: normalizar los dos lados con `.normalize('NFD').replace(/\p{Diacritic}/gu, '')`.
- Evidencia: el código. No lo probé en la página.

### [PRE-07] El gráfico falla en silencio y no dice qué mide
- Severidad: media
- Tipo: error, ambiguo
- Regla: R-05, R-41, R-03
- Dónde: Precios.tsx:44, GraficoLinea.tsx:23,103-110
- Qué ve el agricultor: si falla la carga del historial, `historico.error` se ignora y se queda "Cargando" para siempre. Si hay menos de 2 puntos, el gráfico devuelve `null` y no se ve nada ni se explica. El gráfico solo tiene fecha inicial y final y "Mín./Máx."; no hay eje ni texto de qué período cubre ni de qué unidad es.
- Propuesta: mostrar `ErrorCarga` con "Reintentar" si hay error. Si hay pocos datos: "Todavía no hay suficiente historial de este producto." Poner encima del gráfico un título como "Precio por saco de 45 kg, últimos 30 días".
- Evidencia: el código. No abrí una fila en captura, así que no confirmé el aspecto del gráfico en celular. La tabla plegable existe en el código (`grafico.verTabla`).

### [PRE-08] Las unidades no usan "de"
- Severidad: baja
- Tipo: consistencia
- Regla: R-11, R-12
- Dónde: #/precios · utilidades.ts:83-86
- Qué ve el agricultor: "por saco 45 kg", "por caja 100 unidades", "por rollo 12 manojos", "por saco 20 unidades". La función solo antepone "por" al texto que viene de la base.
- Propuesta: formatear la unidad a "por saco de 45 kg", "por caja de 100 unidades", "por rollo de 12 manojos". Revisar también el singular ("1 unidad") cuando venga de la base.
- Evidencia: precios-360-0.png, precios-360-1.png

### [PRE-09] Siglas PIMA y CNP sin explicación
- Severidad: baja
- Tipo: ambiguo
- Regla: R-01
- Dónde: #/precios, pestañas y "Fuente: PIMA" · es.ts:430-431
- Qué ve el agricultor: "CENADA (PIMA)" y "CNP". La sigla PIMA solo se aclara en el pie y el CNP en ningún lado.
- Propuesta: debajo de las pestañas, "CENADA: mercado mayorista de Heredia, precio de cada día. CNP: Consejo Nacional de Producción, promedio de cada semana".
- Evidencia: precios-360-0.png

### [PRE-10] Las pestañas CENADA/CNP son `tablist` incompleto
- Severidad: baja
- Tipo: accesibilidad
- Regla: R-52
- Dónde: Precios.tsx:73-82
- Qué ve el agricultor: `role="tablist"` y `role="tab"` sin panel asociado ni navegación con flechas. Con lector de pantalla se anuncian como pestañas, pero no se comportan como tales. El campo de búsqueda tiene etiqueta oculta (correcto).
- Propuesta: usar `aria-pressed` en botones normales, o completar el patrón con `role="tabpanel"` y flechas.

Revisado y sin problemas (en español, tema claro):
- La lista de precios en todos los anchos, sin desplazamiento de lado.
- Miles con espacio ("₡28 000").
- Iconos ▲ ▼ ● junto al texto, así que el color no es la única señal (R-51).
- Botones de fila grandes.
- "Se mantiene" para los cambios menores de 2 %.
- El contenido de `reporte.json` en precios: solo marca los enlaces del pie (22 px de alto), que son del pie común de la app y no de esta página.

No pude revisar:
- Tema oscuro (`--tema=azul`) e inglés (`--idioma=en`). No los corrí; solo leí `en.ts`, que tiene las mismas claves de precios.
- Pestaña CNP, fila abierta y gráfico en celular.
- Estados de carga lenta, error de red, sin datos, nombres largos y valores en cero o muy grandes. La captura solo usa datos demo, y estos casos están razonados solo desde el código.
