# especialista-responsive · 2026-11-27

Capturó 11 públicas y 8 privadas en 320/360/390/768/1024/1280/1920, crema; azul en 320/360/390 para algunas. El reporte automático no marca desborde, pero `.app{overflow-x:clip}` (estilos.css:894 y 1280) lo esconde; midió aparte las públicas a 320 y 360.

### [RESP-01] En zona/CR30101 el contenido es más ancho que la pantalla y queda cortado (alta, R-20/R-21)
- estilos.css:578 (.columnas { display:grid; gap:0 40px } sin columna definida) y 1202.
- div.col-principal mide 94 px de más a 320 y 54 a 360; section.tarjeta.pronostico 90/50; p.pronostico-lugar 71/31. La tarjeta "El tiempo" sale cortada.
- Propuesta: .columnas { grid-template-columns:minmax(0,1fr) } y .col-principal, .col-lateral { min-width:0 }.

### [RESP-02] Imágenes y panel de cuenta se salen 2 a 6 px (media, R-20)
- #/precios y #/capacitaciones a 320 (4 px) y 360 (6 px); #/ingresar e #/registrarse 2 px (div.cuenta, aside.cuenta-panel, section.cuenta-formulario).
- Propuesta: min-width:0 y max-width:100% en .cuenta y sus hijos; img { max-width:100% }.

### [RESP-03] "Volver" sticky tapa texto y botones al desplazar (media, R-23)
- estilos.css:1917. #/siembras/nueva a 768 tapa "Elegir cebolla"; #/zona a 320 tapa "Culantro"; #/dron a 390.
- Propuesta: quitar sticky (al menos en celular).

### [RESP-04] Botón flotante tapa "Ver zona" en Mi finca (media, R-23; RESP-N1 del 22-11)
- #/mi-finca 320-390 · estilos.css:711-714, 1124, 1713-1716.
- Propuesta: right 8px o .finca-cabeza { flex-wrap:wrap } a 320 px.

### [RESP-05] Casillas 24×24 en #/fincas/nueva (baja, R-22)
- Propuesta: label con min-height:44px; casilla 28 px.

### [RESP-06] Tarjeta suelta en la última fila (baja, sin regla)
- #/siembras/nueva 768; #/zona 1920. Opcional: 2 columnas en 600-1023 px.

Tabla: inicio, sembrar, cultivo, alertas, ajustes, créditos y privadas restantes ✓. zona con RESP-01/02/03/06; precios/capacitaciones/ingresar/registrarse RESP-02 a 320/360; mi-finca RESP-03/04; fincas/nueva RESP-05; siembras/nueva RESP-03/04/06; dron RESP-03 a 390.

Límites: no midió desborde oculto en privadas ni a 390+ ni en azul.
