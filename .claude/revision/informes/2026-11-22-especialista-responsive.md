# Informe de especialista-responsive — 2026-11-22

## Revisión de pantallas de todos los tamaños (RESP)

Capturé 11 páginas públicas y 8 privadas (entrando con la cuenta demo) en los 7 anchos pedidos. Repetí en tema azul (320, 360 y 390) las páginas públicas y 4 privadas: mi-finca, siembras/nueva, siembras/s1 e historial. No hay desbordes de lado en ninguna página ni ancho (R-20 cumple). No toqué archivos.

Carpetas con evidencia, que llamo EV en los hallazgos:
- Páginas públicas: `C:/Users/PC/AppData/Local/Temp/claude/cff5e9b249d026e9/176261a1-31f1-4afb-a5bd-a4bf49f6e0eb/scratchpad/pub/`
- Páginas privadas: `.../scratchpad/priv/`
- Tema azul público: `.../scratchpad/azul/`
- Tema azul privado: `.../scratchpad/azulp/`

Los falsos positivos del reporte automático son enlaces del pie de página ("Inicio", "Mi finca", "Créditos de las fotos", de 22 px de alto) y la marca TerraFarm del encabezado y del pie (34 px). Son enlaces en lista o de texto, no botones. Los descarté.

### [RESP-01] Insignias y títulos de las tarjetas de "Nueva siembra" se parten letra por letra
- Severidad: alta
- Tipo: responsive
- Regla: R-21
- Dónde: #/siembras/nueva, ancho 320 px (peor caso), 360 y 390 px, temas crema y azul · `web/src/componentes/ListaSugerencias.tsx:42-48`, `web/src/estilos.css:410-411` (2 columnas en celular), `:437` y `:440` (reglas compactas), `:447-448` (`.icono-cultivo`, `.tarjeta-titulo`)
- Qué ve el agricultor: a 320 px, "Repollo" aparece como "Repoll / o", "Bueno" como "Bu / en / o" y "Excelente" como "Exc / el / en / te" (en una columna de 3 letras). A 360 y 390 px "Excelente" también se parte. Es la pantalla donde se elige el cultivo, la tarea principal.
- Por qué confunde o falla: en 2 columnas con foto de 46 px y relleno, al título le quedan unos 70 px. `.tarjeta-titulo` tiene `flex:1` sin `min-width` y la insignia no tiene `white-space:nowrap`. Las tarjetas de `/sembrar` usan otra estructura (foto arriba) y sí se ven bien.
- Propuesta: en `@media (max-width:699px)` dejar la cabecera en columna para `.rejilla-productos .tarjeta-cabeza` (foto arriba, título debajo, como `.tc-foto` en `/sembrar`):
  `.rejilla-productos .tarjeta-cabeza{flex-direction:column;align-items:flex-start}`
  `.insignia{white-space:nowrap}`
  `.rejilla-productos .tarjeta-titulo{min-width:0}`
  Alternativa: una sola columna por debajo de 400 px con `@media (max-width:399px){.rejilla-productos{grid-template-columns:1fr}}`. Esa regla tiene que ir al final del archivo, porque hay duplicados en las líneas 1058, 1131 y 1181.
- Evidencia: EV priv/`siembras_nueva-320-1.png`, `siembras_nueva-390-1.png`, azulp/`siembras_nueva-320-*.png`

### [RESP-02] El botón flotante "Reportar una plaga" tapa botones y texto en celular
- Severidad: alta
- Tipo: responsive
- Regla: R-23, R-24
- Dónde: todas las páginas privadas y públicas, ancho 320-390 px, ambos temas · `web/src/estilos.css:668-674` y `:711-714` (`bottom: calc(100px + …)`)
- Qué ve el agricultor: la píldora mide unos 245 × 56 px, el 75 % del ancho a 320 px. En #/siembras/nueva tapa el botón "Elegir repollo" y parte de "Ver más". En #/mi-finca tapa el botón de la finca siguiente. En #/siembras/s1 tapa la línea de tiempo. En #/dron tapa el texto de "Pendiente". En #/fincas/nueva choca con el pie de página. En #/historial tapa títulos de las siembras.
- Por qué confunde o falla: el botón queda justo sobre el contenido que se lee al desplazar, y a 320 px cubre casi la mitad de la tarjeta. No existe `padding-bottom` que lo evite, porque flota sobre el contenido mientras se desplaza.
- Propuesta: en `@media (max-width:599px)` volverlo un botón redondo de 56 × 56 con solo el ícono (`aria-label` ya existente o agregarlo) y texto visible solo desde 600 px. Por ejemplo `.boton-flotante{padding:0;width:56px;justify-content:center}` y ocultar el `<span>` del texto. Así tapa 56 px en vez de 245 px. En la app Android no aplica (`[data-nativo]`, línea 732).
- Evidencia: EV priv/`siembras_nueva-320-1.png`, `mi-finca-320-1.png`, `siembras_s1-320-1.png`, `dron-320-1.png`, `fincas_nueva-320-2.png`

### [RESP-03] Tabla "Lo que ya están sembrando sus vecinos" parte palabras en celular
- Severidad: media
- Tipo: responsive
- Regla: R-21
- Dónde: #/zona/CR30101, ancho 320, 360 y 390 px, temas crema y azul · `web/src/estilos.css:589-593` (`.tabla`, `.tabla th/td`)
- Qué ve el agricultor: encabezados "Cultivo", "Hectáreas", "Fincas" y "Cosecha" partidos en dos líneas, y celdas como "diciembre" y "febrero" también.
- Por qué confunde o falla: 4 columnas con relleno de 12 × 14 px y encabezados en mayúscula con espaciado de letras no caben en 292 px. La caja `.tabla-envoltura` ya tiene `overflow-x:auto`, pero la tabla se comprime en vez de desplazarse.
- Propuesta: `.tabla th,.tabla td{white-space:nowrap}` en celular (o `.tabla{min-width:420px}`), para que la caja se desplace de lado, que es el caso permitido por R-20. Opción complementaria: bajar el relleno a `10px 8px` y el tamaño del encabezado a 0.72rem.
- Evidencia: EV pub/`zona_CR30101-320-*.png`, `zona_CR30101-360-*.png`, azul/`zona_CR30101-320-*.png`

### [RESP-04] Botones tipo enlace de #/ingresar miden 32 px de alto
- Severidad: media
- Tipo: responsive
- Regla: R-22
- Dónde: #/ingresar, todos los anchos, tema crema (el tema azul no se capturó en esta ruta) · `web/src/estilos.css:159` (`.enlace { padding: 4px 0 }`)
- Qué ve el agricultor: dos botones de texto subrayado (148 × 32 y 122 × 32 px), de acciones tipo "¿Olvidó su contraseña?" o "Crear cuenta". El nombre exacto del texto no lo registró la herramienta.
- Por qué confunde o falla: miden menos de los 44 px recomendados en celular, aunque pasan el mínimo absoluto de 24 px.
- Propuesta: `.enlace{min-height:44px;padding:10px 0}`.
- Evidencia: EV pub/`reporte.json` (ingresar), `ingresar-320-0.png`

### [RESP-05] Enlace "Descargar la app para Android" del pie casi no se lee
- Severidad: media
- Tipo: accesibilidad
- Regla: R-25
- Dónde: pie de página (visto en #/siembras/nueva), ancho 768 px, tema crema · `web/src/estilos.css:959-960` (`.pie-columna a`) y la regla de la línea 979 (enlaces del tema crema con `--mesa-primario`)
- Qué ve el agricultor: "Descargar la app para Android" en verde oscuro sobre el fondo verde muy oscuro del pie.
- Por qué confunde o falla: la regla de la línea 979 pinta de verde primario todos los `a` dentro de `.contenido`. Ese enlace se salta la exclusión y queda con contraste bajo.
- Propuesta: agregar `.pie a` o la clase del enlace de descarga a la exclusión de esa regla, o `.pie .enlace-descarga{color:#cfeedd}`. Estimo contraste mucho menor a 4,5 : 1. No lo medí con una herramienta.
- Evidencia: EV priv/`siembras_nueva-768-0.png`

### [RESP-06] Una tarjeta suelta en la última fila de "Nueva siembra" a 768 px
- Severidad: baja
- Tipo: responsive
- Regla: Ninguna regla específica (diseño)
- Dónde: #/siembras/nueva, ancho 768 px · `web/src/estilos.css:412` (3 columnas desde 700 px)
- Qué ve el agricultor: 3 tarjetas arriba y "4. Café" solo abajo, con el lado derecho vacío.
- Por qué confunde o falla: es solo estético. Pasa igual con "Culantro" en #/zona/CR30101 a 320 px.
- Propuesta: opcional, dejar `.rejilla-productos` en 2 columnas entre 700 y 1099 px.
- Evidencia: EV priv/`siembras_nueva-768-0.png`, azul/`zona_CR30101-320-2.png`

### [RESP-07] Casillas de 24 × 24 px en #/fincas/nueva
- Severidad: baja
- Tipo: responsive
- Regla: R-22 (cumple el mínimo absoluto de WCAG 2.5.8)
- Dónde: #/fincas/nueva, todos los anchos · `web/src/estilos.css:198` (`.opciones-grandes input`)
- Qué ve el agricultor: dos casillas o botones de opción de 24 px. No vi cuánto mide la etiqueta que las envuelve (`label` con `display:flex`, línea 155), así que es una duda.
- Propuesta: si la etiqueta ocupa toda la fila no hace falta cambiar nada. Si no, subir a `width:28px;height:28px` y asegurar que la etiqueta tenga `min-height:44px`.
- Evidencia: EV priv/`reporte.json` (fincas/nueva), `fincas_nueva-320-1.png`

### [RESP-08] Títulos del historial con subrayado raro a 320 px
- Severidad: baja
- Tipo: consistencia
- Regla: R-21 (aproximado)
- Dónde: #/historial, ancho 320 px, tema crema · estilos de `.tarjeta-h` (`web/src/estilos.css:403`) o enlaces del tema crema (`:979`)
- Qué ve el agricultor: "Frijol — ✓ Buena cosecha" y "Papa — ◐ Regular" se ven subrayados y con la línea cortando el ícono. En las capturas los títulos de las siembras se ven con subrayado y un guion largo pegado. Parece que el título es un enlace con el estilo subrayado por defecto. No leí el componente para confirmarlo.
- Propuesta: duda: revisar si es un `<a>` dentro del título. Si es así, `text-decoration:none` en ese enlace, o separar el nombre y el estado en dos líneas.
- Evidencia: EV priv/`historial-320-1.png`

### Cosas que revisé y están bien
- Menú de abajo y botón flotante: el menú no tapa botones principales, `.contenido` y `.app` dejan relleno de abajo (líneas 679 y 710).
- Pantallas grandes (1280 y 1920): el contenido se limita al ancho máximo y no hay líneas larguísimas en las páginas que vi (#/mi-finca, #/dron, #/sembrar).
- Mapa de Costa Rica en #/sembrar a 1920 px: se ve completo y legible.
- Gráfico de temperatura de #/zona/CR30101 a 768 px: usable.
- Gráfico 3D de #/dron: usable con el dedo, tiene botones de giro de 44 px.
- Android (`data-nativo`): ocultar menú y botón flotante en las líneas 732-735 está bien. RESP-02 no aplica a la app.
- Los dos temas se ven coherentes. No hallé hallazgos exclusivos del tema azul, salvo que RESP-01 y RESP-03 se repiten igual.

### Tabla de páginas por ancho

Los rangos de columnas son 320 / 360 / 390 / 768 / 1024 / 1280 / 1920. "Sin captura vista" significa que el reporte automático no marcó nada, pero no abrí el .png de ese ancho.

| Página | 320 | 360 | 390 | 768 | 1024 | 1280 | 1920 |
|---|---|---|---|---|---|---|---|
| inicio | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| sembrar | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| zona/CR30101 | RESP-03, RESP-02 | RESP-03, RESP-02 | RESP-03, RESP-02 | ✓ | ✓ | ✓ | ✓ |
| cultivo/frijol | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| precios | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| alertas | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| capacitaciones | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| ajustes | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| creditos | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| ingresar | RESP-04 | RESP-04 | RESP-04 | RESP-04 | RESP-04 | RESP-04 | RESP-04 |
| registrarse | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| mi-finca | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| fincas/nueva | RESP-02, RESP-07 | RESP-07 | RESP-07 | RESP-07 | RESP-07 | RESP-07 | RESP-07 |
| siembras/nueva | RESP-01, RESP-02 | RESP-01, RESP-02 | RESP-01, RESP-02 | RESP-06, RESP-05 | ✓ | ✓ | ✓ |
| siembras/s1 | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| siembras/s1/cerrar | sin captura vista | sin captura vista | sin captura vista | ✓ | ✓ | ✓ | ✓ |
| historial | RESP-02, RESP-08 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |
| reportar-plaga | sin captura vista | sin captura vista | sin captura vista | ✓ | ✓ | ✓ | ✓ |
| dron | RESP-02 | RESP-02 | RESP-02 | ✓ | ✓ | ✓ | ✓ |

Limitaciones: `siembras/s1/cerrar` y `reportar-plaga` no los abrí uno por uno. Los ✓ de 768 a 1920 en las páginas privadas se apoyan solo en que el reporte automático no marcó nada, salvo mi-finca, dron y siembras/nueva, cuyas capturas sí vi. Los hallazgos RESP-04 a RESP-08 y los ✓ de esas páginas están menos verificados que RESP-01 a RESP-03.
