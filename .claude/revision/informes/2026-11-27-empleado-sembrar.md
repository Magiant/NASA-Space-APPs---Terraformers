# empleado-sembrar · 2026-11-27

Capturas: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-27-23-22 (es, claro, 360/390/768/1280) y ...\2026-11-27-23-23 (en, azul, 390).

Ya corregido (confirmado en captura): avisos "Ojo: ya hay 64 ha de tomate…" dentro de la tarjeta; tabla de vecinos "octubre (ya pasó)"; línea de la nota 0 a 100; unidades de precio en inglés "per box of 18 kg"; "Familia: Fabáceas".

### [SEM-01] Nota de la ficha en español dentro del inglés
- Severidad: media · Tipo: consistencia · Regla: R-07
- Dónde: #/cultivo/papa, ?idioma=en, 390 px · web/src/datos-ejemplo/publicos.ts:171,174,177; lo pinta Cultivo.tsx en "Qué necesita"
- Qué ve: en "What it needs" aparece "Gasta mucho potasio del suelo." En tomate y repollo igual ("Gasta mucho potasio y calcio.", "Gasta mucho nitrógeno."). Frijol sí funciona porque tiene traducción en en.ts:679.
- Propuesta: código en el dato (p. ej. gasta_potasio) traducido en es.ts y en.ts.
- Evidencia: cultivo_papa-390.txt (carpeta ...23-23).

### [SEM-02] El aviso de oferta no cambia el puntaje ni el orden
- Severidad: media · Tipo: datos · Regla: R-43, R-42
- Dónde: #/zona/CR30101, 360 px · Zona.tsx (conjunto saturados)
- Qué ve: Tomate nº 1 con "88/100 Excelente" y en la misma tarjeta "Ojo: ya hay 64 ha de tomate… el precio puede bajar". Chile dulce nº 2 igual.
- Por qué confunde: "excelente" y "ojo" a la vez; la explicación del puntaje dice que cuenta el precio. Duda: no revisó si el puntaje "Venta" ya descuenta algo.
- Propuesta: aclarar en "¿Por qué este puntaje?" que la nota no cuenta lo que ya sembraron los vecinos, o bajarlos en el orden.

### [SEM-03] Temperatura sin decir qué promedio es
- Severidad: baja · Tipo: ambiguo · Regla: R-01, R-03
- Dónde: #/zona/CR30101, 360 px · Zona.tsx (ficha Temperatura)
- Qué ve: "Temperatura 19,5 °C / Entre 11,9 y 26,2 °C"; "Franco (volcánico)" sin explicar; "CNE" sin su nombre en la ficha de riesgos.
- Propuesta: "19,5 °C de promedio en el último mes"; "Franco (volcánico): tierra suelta, que retiene bien el agua"; "CNE (Comisión de Emergencias)".

### [SEM-04] Enlaces del pie de menos de 40 px de alto
- Severidad: baja · Tipo: responsive · Regla: R-22
- Dónde: todas las rutas a 1280 px · reporte.json. Enlaces del pie miden 261×32 px.
- Propuesta: subir el alto a 44 px.

### [SEM-05] El calendario de siembra no marca el mes actual
- Severidad: baja · Tipo: ambiguo · Regla: R-13
- Dónde: #/cultivo/frijol, 360 px · Cultivo.tsx:58-66
- Propuesta: marcar el mes actual con borde o etiqueta "Hoy".

### [SEM-06] "Intentar de nuevo" recarga toda la página (duda)
- Severidad: baja · Tipo: error · Regla: R-33, R-34
- Dónde: web/src/componentes/SelectorUbicacion.tsx:149 (window.location.reload()). Solo código.
- Propuesta: volver a pedir la lista sin recargar.

### [SEM-07] Mapa de provincias con rótulos solo en tres provincias (duda)
- Severidad: baja · Tipo: ambiguo · Regla: R-22, R-30
- Dónde: #/sembrar, 360 px. Mapa de ~180 px; solo Guanacaste, Limón y Puntarenas rotuladas; las del centro son piezas chicas. Hay lista debajo y zoom.
- Propuesta: rotular todas o dar más alto al mapa en celular.

Sin problemas: sin undefined/NaN/claves; coma decimal y espacio de miles; unidades con "de"; insignias con ícono y texto; calendario coincide con "Ahora, en noviembre"; textos de GPS con pasos; mapa con role, teclado y aria-label.

No pudo revisar: error de red, carga lenta, distrito sin datos, GPS negado en vivo; "¿Por qué este puntaje?" abierto; #/sembrar con distrito; 320 y 1920 px.
