# empleado-cuenta · 2026-11-27

Capturas en C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-27-23-22\ (inicio, ingresar, registrarse, ajustes, creditos; 360/390/768/1280, claro, es). Azul en ...23-24\ y en ...23-25\, solo 360 px.

### [CTA-01] El botón "Volver" queda fijo encima del formulario y tapa campos y botones
- Severidad: alta · Tipo: responsive · Regla: R-23
- Dónde: #/registrarse e #/ingresar, 360 px · web/src/estilos.css:1917 (.boton-volver { position: sticky; top: 72px; z-index: 20 })
- Qué ve: al bajar, "Volver" flota bajo el encabezado y tapa el campo "Correo" (registrarse-360-1.png), la palabra "Crear" del botón "Crear cuenta" (registrarse-360-2.png) y la etiqueta "Password" en inglés (23-25\ingresar-360-1.png).
- Propuesta: "Volver" sin pegarse (position: relative) en pantallas de formulario; si se quiere fijo, solo en lectura y con margen.

### [CTA-02] El texto gris de la portada de Inicio casi no se lee sobre la foto en tema claro
- Severidad: media · Tipo: accesibilidad · Regla: R-25
- Dónde: #/, 360 px, claro · inicio-360-0.png
- Qué ve: "Datos de satélites de la NASA y de fuentes de Costa Rica para decidir qué sembrar…" en gris medio sobre cielo y pasto claros. Apreciación visual, no medida.
- Propuesta: oscurecer el párrafo o un degradado claro más opaco detrás. En azul se lee bien.

### [CTA-03] "Together we grow" en inglés en la versión en español, y como título en Ajustes
- Severidad: baja · Tipo: consistencia · Regla: R-07
- Dónde: Ajustes.tsx:134, Plantilla.tsx:72, 116, 132
- Propuesta: si no es lema de marca, traducir ("Crecemos juntos"); si lo es, título "Acerca de TerraFarm" y el lema en pequeño. Duda: puede ser lema.

### [CTA-04] Enlaces del pie en pantalla ancha miden 32 px de alto
- Severidad: baja · Tipo: responsive · Regla: R-22
- Dónde: 1280 px · estilos.css:1914. Decisión ya tomada (comentario en el CSS lo explica). En celular miden 44 px. Sin acción.

### [CTA-05] La banda sin señal no dice de cuándo es lo que se ve
- Severidad: baja · Tipo: datos · Regla: R-41
- Dónde: Plantilla.tsx:84-88
- Propuesta: añadir "Lo que ve es lo último guardado en este teléfono".

### [CTA-06] "Cargando" no dice nada si tarda
- Severidad: baja · Tipo: ambiguo · Regla: R-05
- Dónde: Estados.tsx:6-17. "Cargando…" solo para lector de pantalla.
- Propuesta: tras ~8 s mostrar "Está tardando. Revise su señal…". Solo código.

### [CTA-07] Pendientes del informe anterior (lectura de código)
- Mensajes "avise al equipo" sin decir cómo (es.ts:907-923).
- "¿Olvidó su contraseña?" no se bloquea mientras envía (Ingresar.tsx:42-51).
- Enlace de recuperación vencido (otp_expired) no avisa si no va por #/nueva-clave.
- NuevaClave solo valida con el aviso del navegador.

Sin problemas: sin desbordes ni palabras partidas en las cinco rutas; azul con buen contraste; inglés sin claves; menú de abajo con candado y sección activa; Entrar claro; errores de Registrarse bajo el campo; Confirmar.tsx modal con foco en Cancelar y Esc; página no encontrada con "Ir al inicio".

No pudo revisar: sin señal real, carga lenta, correo de recuperación, Confirmar abierto, 390+ en azul/inglés, app Android.
