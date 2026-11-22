# Informe de empleado-cuenta — 2026-11-22

Revisión de Inicio, cuenta, ajustes y navegación (CTA). Hice capturas en 360 y 1280 px, tema claro y español. Las leí junto con el código y los textos. No hice las capturas de 390 y 768 px, ni las de tema azul e inglés. Los problemas de inglés y de tema oscuro salen del código, no de capturas, y lo digo en cada hallazgo. Carpeta de capturas: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-21-33\

### [CTA-01] Los errores de entrar y crear cuenta salen siempre en español, aunque la app esté en inglés
- Severidad: alta
- Tipo: consistencia
- Regla: R-07, R-63
- Dónde: #/ingresar y #/registrarse, idioma English · web/src/servicios/supabase.ts:34-55, 74, 83, 92, 96
- Qué ve el agricultor: con la app en inglés, las ventanas de error dicen cosas como "Correo o contraseña incorrectos. Revise que el correo esté bien escrito…". El aviso de cuenta creada también sale en español: "Cuenta creada. Le enviamos un correo a «…»…". Los demás textos de esas ventanas sí están en inglés. Salen en español otros mensajes: "No hay conexión con el servidor…", "La contraseña es muy débil…" y "Ya existe una cuenta con…".
- Por qué confunde o falla: `mensajeAuth` y los `throw new Error('…')` tienen el texto fijo en español, sin pasar por `idiomas/*.ts`. Hay más mezcla de idiomas: el título de la ventana está en inglés y el cuerpo en español. El caso `default` también muestra el texto original del servidor: "No se pudo completar: {m}" (R-63).
- Propuesta: que el servicio lance un código de error (`credenciales`, `ya_existe`, `sin_conexion`, `clave_debil`…). Que `Ingresar.tsx` y `Registrarse.tsx` lo traduzcan con textos de `es.ts` y `en.ts`. El `default` debe decir "No se pudo completar. Intente de nuevo; si se repite, avise al equipo." sin mostrar el mensaje del servidor.
- Evidencia: solo lectura de código (en modo demo estos errores no se ven).

### [CTA-02] "Pide entrar" no se entiende (el caso que pidió la revisión)
- Severidad: alta
- Tipo: ambiguo
- Regla: R-35, R-06
- Dónde: #/ en 360 px y 1280 px, tema claro · web/src/idiomas/es.ts:30, web/src/paginas/publicas/Inicio.tsx:56 y 70
- Qué ve el agricultor: debajo de "Mi finca", "Reportar una plaga" y "Escaneo con dron" aparece, con un candado pequeño, "Pide entrar". En inglés dice "Sign-in required".
- Por qué confunde o falla: parece que la página le pide algo al agricultor, o que "pide entrar" es una acción. No dice que hace falta una cuenta. El tamaño es pequeño. R-35 pide justo "Necesita cuenta". Tampoco aclara que la cuenta es gratis.
- Propuesta: cambiar a "Necesita cuenta (es gratis)" en es y "Needs an account (free)" en en. Ese texto se reutiliza en `Tx` en los tres sitios.
- Evidencia: inicio-360-3.png

### [CTA-03] Los botones de abajo y la franja de "Pide entrar" no avisan antes de mandarlo a Entrar
- Severidad: media
- Tipo: ambiguo
- Regla: R-35, R-24
- Dónde: menú de abajo y encabezado, todas las páginas · web/src/componentes/Plantilla.tsx:20-26 y 120-124
- Qué ve el agricultor: la pestaña "Mi finca" del menú de abajo se ve igual que las demás, sin candado ni nota, aunque no haya cuenta. Lo mismo pasa con el enlace "Mi finca" del pie. Al tocarla, la pantalla salta a "Entrar" con el aviso "Para usar esta parte necesita entrar con su cuenta".
- Por qué confunde o falla: el aviso llega después de tocar. Solo la tarjeta de Inicio avisa antes.
- Propuesta: poner un candado pequeño en la pestaña "Mi finca" cuando `!usuario`, con el mismo texto que CTA-02 para lectores de pantalla.
- Evidencia: inicio-360-0.png

### [CTA-04] Los errores de carga no dicen qué hacer; el estado "sin señal" no dice qué falta enviar
- Severidad: media
- Tipo: ambiguo
- Regla: R-05, R-34
- Dónde: web/src/componentes/Estados.tsx:13-25 · web/src/componentes/Plantilla.tsx:64-72 y 77-81
- Qué ve el agricultor: `ErrorCarga` solo muestra el `mensaje` que le pasen y el botón "Intentar de nuevo" si la página lo trae. Si la página no pasa `reintentar`, no hay ninguna acción. `Cargando` solo muestra "Cargando…" sin tope de tiempo ni consejo si tarda. La banda de sin señal dice "Sin señal. Está viendo lo último que se guardó" pero no dice de cuándo es lo guardado (R-41).
- Por qué confunde o falla: con mala señal el agricultor se queda mirando un círculo sin saber si esperar o recargar.
- Propuesta: en `ErrorCarga`, añadir una línea fija bajo el mensaje: "Revise su señal y toque «Intentar de nuevo»." y mostrar siempre el botón (recargar si no hay `reintentar`). En `Cargando`, tras unos 8 segundos, añadir "Está tardando más de lo normal. Revise su señal." No pude comprobar el comportamiento con carga lenta (no se puede simular desde la captura).
- Evidencia: lectura de código.

### [CTA-05] Al crear la cuenta, el cursor puede quedar en un campo sin que se vea qué falta si se cierra la ventana de error
- Severidad: media
- Tipo: ambiguo
- Regla: R-32
- Dónde: #/registrarse · web/src/paginas/auth/Registrarse.tsx:63-70
- Qué ve el agricultor: al enviar con un dato mal, aparece una ventana ("Revise este dato") con el texto del error. Después de aceptarla, el campo recibe el foco con `aria-invalid`, pero en pantalla no hay un texto de error junto al campo. Solo hay una marca roja, que depende solo del color (R-51).
- Por qué confunde o falla: ya cerró la ventana y no queda el mensaje a la vista al lado del campo. En cambio, si falla el envío al servidor, el título es "No se pudo crear la cuenta" y no marca ningún campo.
- Propuesta: dejar el texto del error visible bajo el campo marcado, con ícono, además de la ventana. Esto lo veo en el código; no probé el envío en una captura.
- Evidencia: lectura de código; registrarse-360-0.png muestra el formulario sin error.

### [CTA-06] La cuenta que ya existe y "olvidé mi contraseña" no tienen salida
- Severidad: media
- Tipo: ambiguo
- Regla: R-05
- Dónde: #/ingresar · web/src/servicios/supabase.ts:40 · web/src/paginas/auth/Ingresar.tsx:40-47
- Qué ve el agricultor: al fallar la contraseña, la ventana ofrece "Intentar de nuevo" y "Crear una cuenta". Si el correo ya tiene cuenta y la contraseña es la mala, la oferta de crear una cuenta con ese correo termina en "Ya existe una cuenta con «…»… pida ayuda al equipo". No hay "Olvidé mi contraseña" ni forma de contactar al equipo; no pude encontrar ningún correo o enlace de ayuda en esas pantallas.
- Por qué confunde o falla: el agricultor queda en un círculo (entrar, crear, "ya existe"). "Pida ayuda al equipo" no dice a quién ni cómo.
- Propuesta: añadir un enlace "¿Olvidó su contraseña?" que use el restablecimiento de Supabase. Y en el texto "Ya existe una cuenta…" poner un medio de contacto concreto o ese enlace. Si no se va a ofrecer, avisarlo: hay que decidir cómo ayuda el equipo.
- Evidencia: ingresar-360-1.png (no hay enlace de contraseña olvidada).

### [CTA-07] Siglas en Ajustes y en el pie sin explicar
- Severidad: baja
- Tipo: ambiguo
- Regla: R-01
- Dónde: #/ajustes 360 px y pie de todas las páginas · web/src/idiomas/es.ts:35, web/src/paginas/publicas/Ajustes.tsx:129-132
- Qué ve el agricultor: "Fuentes de datos: NASA, Open-Meteo, PIMA, CNP, IMN, CNE, SoilGrids, GAEZ, INA."
- Por qué confunde o falla: son siglas que el agricultor no conoce. Se muestran dos veces (pie y Ajustes), solo como lista.
- Propuesta: escribir los nombres completos o poner "Créditos y fuentes" con enlace a una página donde se expliquen. Como mínimo, "Instituto Meteorológico Nacional (IMN)" y similares, una vez.
- Evidencia: ajustes-360-0.png

### [CTA-08] "Together we grow" queda en inglés en la app en español
- Severidad: baja
- Tipo: consistencia
- Regla: R-07
- Dónde: encabezado y pie · web/src/componentes/Plantilla.tsx:57-59, 105 y 117; Ajustes.tsx:128; web/src/idiomas/es.ts
- Qué ve el agricultor: "TerraFarm · Together we grow" en Ajustes, "Together we grow" bajo la marca en computadora y en el pie. En español no hay traducción.
- Por qué confunde o falla: es el lema del equipo y puede ser intencional, pero no está en `es.ts`. Es duda: si se quiere dejar en inglés, ignorar.
- Propuesta: mantenerlo como marca, o mostrar "Juntos sembramos" en español.
- Evidencia: ajustes-360-0.png

### [CTA-09] Enlaces del pie y botones de texto muy chicos para el dedo
- Severidad: baja
- Tipo: responsive
- Regla: R-22
- Dónde: pie de todas las páginas, 360 y 1280 px · web/src/componentes/Plantilla.tsx:107-124 · botones de demo en #/ingresar
- Qué ve el agricultor: `reporte.json` marca controles de menos de 40 px en el pie y en la página de Entrar. En 360 px, los enlaces del pie ("Inicio", "Sembrar", "Precios", "Tiempo", "Cursos", "Mi finca", "Créditos de las fotos") miden 332×22 px. La marca del encabezado mide 34×34 px. Los botones "agricultor@demo.cr" y "admin@demo.cr" miden 148×32 y 122×32 px (solo en modo demo).
- Por qué confunde o falla: no llega a 44×44 px, aunque pasa el mínimo absoluto de 24 px en parte; los de 22 px de alto no (en el eje vertical).
- Propuesta: dar al menos 44 px de alto (padding) a los enlaces del pie y a la marca; que los enlaces de demo midan 44 px.
- Evidencia: reporte.json (confirmado también en inicio-360-0.png y ingresar-360-1.png).

### [CTA-10] En el encabezado de 360 px se ve "Entrar" y "Con señal" pero no el nombre de la app
- Severidad: baja
- Tipo: consistencia
- Regla: R-06
- Dónde: encabezado en 360 px, todas las páginas · web/src/componentes/Plantilla.tsx:55-80
- Qué ve el agricultor: solo el ícono de la hoja, "Con señal", "Entrar" y el engranaje. En 1280 px sí aparece "TerraFarm". Además, "Entrar" está en el encabezado y en el menú de Ajustes ("Cuenta > Entrar"), y en Inicio no hay otro "Entrar".
- Por qué confunde o falla: no es un error grave; la pantalla de Entrar y Crear cuenta sí muestra la marca. El estado "Con señal" ocupa el espacio del nombre.
- Propuesta: duda de diseño; si se prefiere, poner el nombre "TerraFarm" y mover el estado de red a la banda ya existente.
- Evidencia: inicio-360-0.png

Revisado y sin problemas: la pestaña activa del menú de abajo se distingue (Inicio resaltado) y no tapa el contenido en las capturas de 360 px. El menú de abajo tiene 6 pestañas legibles. Los campos de Entrar y Crear cuenta tienen etiqueta visible. El interruptor Claro/Oscuro e Español/English, y el botón "Mostrar/Ocultar" de la contraseña, funcionan en la captura. La ventana para cerrar sesión pide confirmación y avisa de reportes sin enviar (por código). La página de créditos abre los enlaces con `rel="noreferrer"` y `target="_blank"` (R-62). Páginas públicas no tuvieron desplazamiento lateral en 360 y 1280 px según `reporte.json`. La ruta no encontrada ("No encontramos esa página" + "Ir al inicio") está en el código y dice qué hacer.

No pude revisar: capturas en 390 y 768 px; tema azul (oscuro) e inglés en capturas (los hallazgos CTA-01 y CTA-08 son de código); la ventana de error real al entrar o crear cuenta (el modo demo no llama a Supabase); correo sin confirmar y reenvío; sin señal real; carga lenta; el botón flotante "Reportar una plaga" (solo sale con sesión, no entré con `--entrar`); el menú de Ajustes abierto como desplegable; la ventana de `Confirmar.tsx` en pantalla (solo la leí parcialmente); `DescargarApp.tsx` en el pie y la tarjeta (solo vi la tarjeta en Inicio).
