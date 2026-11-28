# empleado-mi-finca · 2026-11-27

Capturas 360 y 768 px, crema, español, con --entrar, en C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-27-23-22. Ya corregidos: doble envío al cerrar, orden de sugerencias, palabra partida, cantidad al cambiar resultado, fecha futura, fichas del historial.

### [FIN-01] El botón flotante "Reportar plaga" tapa texto y botones en Mi finca y en el historial
- Severidad: media · Tipo: responsive · Regla: R-23
- Dónde: #/historial y #/mi-finca, 360 px · estilos del botón flotante
- Qué ve: en el historial tapa "Cosechó 22 quintales en 1 ha"; en Mi finca tapa "Ver zona" de "La Esperanza" y "Agua: Río o quebrada".
- Propuesta: no mostrar el flotante en páginas con su propio acceso (Mi finca, Mi historial); en el resto, margen inferior o derecho para que el contenido no quede debajo.
- Evidencia: historial-360-0.png, mi-finca-360-0.png

### [FIN-02] El botón de foto invita a algo que no llega al técnico
- Severidad: media · Tipo: ambiguo · Regla: R-05, R-42
- Dónde: #/reportar-plaga · ReportarPlaga.tsx:213-225
- Qué ve: botón "Tomar o subir una foto"; debajo "La foto se queda en su teléfono: todavía no se envía al técnico."
- Además: URL.createObjectURL nunca se libera (ReportarPlaga.tsx:220); sin tope de tamaño ni tipo.
- Propuesta: aviso antes del botón; botón "Ver una foto del daño (solo en su teléfono)"; liberar la URL.

### [FIN-03] La nota de seguimiento y el cierre de siembra no se guardan sin señal
- Severidad: media · Tipo: error · Regla: R-34
- Dónde: MiSiembra.tsx:53-66, CerrarSiembra.tsx:63-68. Solo el reporte de plaga usa la cola de envío.
- Propuesta: pasar nota y cierre por la misma cola y mostrar "Guardado en su teléfono; se envía cuando tenga señal". Solo código.

### [FIN-04] El área no se recuerda en la unidad que escribió el agricultor
- Severidad: baja · Tipo: consistencia · Regla: R-14
- Dónde: CampoArea.tsx:6-19. La base guarda solo hectáreas.
- Propuesta: guardar también la unidad y mostrar "1,4 ha (2 manzanas)".

### [FIN-05] Radios de riego 24×24 marcados "toque-chico"
- Severidad: baja · Tipo: accesibilidad · Regla: R-22
- Dónde: #/fincas/nueva · NuevaFinca.tsx:79-80. La tarjeta entera es tocable: casi falso positivo.
- Propuesta: ignorar o ajustar la herramienta para que cuente la etiqueta.

Sin problemas: sugerencias de Nueva siembra; formulario de Nueva finca con unidad y equivalencia; historial; Cerrar siembra bloquea con enviando y tope 100 000; aviso de salir sin guardar; selector de plaga.

No pudo revisar: tema azul, inglés, 390 px; ventana de confirmar; sin datos, error de red, foto grande.
