# Segunda pasada de empleado-cuenta — 2026-11-22

Hice capturas nuevas en 360 y 1280 px (carpeta `C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-22-53\`, sin problemas automáticos en `reporte.json`). Leí el código de los archivos tocados. No hice capturas en inglés ni en tema azul. La demo no llama a Supabase, así que lo real de "olvidé mi contraseña" y de `#/nueva-clave` lo revisé solo por código.

## Estado de mis hallazgos anteriores

- **CTA-01 (errores de cuenta siempre en español): ARREGLADO (por código).**
  - `supabase.ts` ahora lanza `ErrorApp` con código. Ver `mensajeAuth` en `web/src/servicios/supabase.ts:38-54` y `web/src/errores.ts`.
  - `Ingresar.tsx` y `Registrarse.tsx` traducen con `mensajeError(t, err)`.
  - El caso desconocido ya no muestra el texto del servidor: va a la consola y sale "No se pudo completar. Intente de nuevo; si se repite, avise al equipo." (`es.ts:908`).
  - No confirmé que `en.ts:879` tenga todas las claves de `errores`. Lo cubre el tipo `Textos`, y no corrí el compilador.
- **CTA-02 ("Pide entrar" no se entiende): ARREGLADO.** Ahora `pideEntrar` dice "🔒 Necesita cuenta" (`es.ts:36`) y "Needs an account" (`en.ts:32`). Todavía no dice que es gratis. Eso es opcional.
- **CTA-03 (la pestaña "Mi finca" no avisa antes): ARREGLADO a medias.**
  - Hay candado en la pestaña del menú de abajo y texto oculto para lectores de pantalla (`Plantilla.tsx:133-137`). Se ve en `inicio-360-0.png`.
  - Sigue sin candado el enlace "Mi finca" del pie (`Plantilla.tsx:107`) y la pestaña del encabezado de escritorio (`Plantilla.tsx:62-66`).
  - El candado sale muy pequeño (`.pestana-candado`, 0.7rem) y pegado a la esquina superior derecha. En 360 px casi no se distingue del borde de la pantalla. Ver el nuevo CTA-N3.
- **CTA-04 (carga y error sin consejo): ARREGLADO a medias.**
  - `ErrorCarga` ahora siempre tiene botón "Intentar de nuevo" (recarga la página si no hay `reintentar`) (`Estados.tsx:16-25`).
  - `Cargando` sigue igual: solo "Cargando…", sin aviso si tarda (`Estados.tsx:5-12`).
  - La banda de sin señal sigue sin decir de cuándo es lo guardado (`Plantilla.tsx:84-88`). `AvisoCopia` sí lo dice, pero solo donde se usa.
- **CTA-05 (error de campo sin texto visible): ARREGLADO.** Ahora queda un `<small class="campo-error">` con ícono bajo el campo (`Registrarse.tsx:49-50`, `142`, `155`, `174`). Si falla el envío al servidor, el título "No se pudo crear la cuenta" sigue sin marcar un campo. Es aceptable.
- **CTA-06 (sin salida al olvidar la contraseña): ARREGLADO a medias.**
  - Hay un botón "¿Olvidó su contraseña?" en `Ingresar.tsx:120`. El texto de "ya existe" ahora lo menciona (`es.ts:914`). Ver los hallazgos nuevos abajo.
  - Sigue sin haber un medio de contacto concreto. "Avise al equipo" aparece en `servidor`, `permiso`, `sin_perfil`, `registro_cerrado` y `perfil_fallo`, sin decir cómo ni a quién (`es.ts:907-923`).
- **CTA-07 (siglas sin explicar): ARREGLADO.** `es.ts:42` y `en.ts:37` ahora traen los nombres completos (por ejemplo "IMN (Instituto Meteorológico Nacional)"). `PIMA` queda sin explicar y `CENADA` sin explicar a qué corresponde.
- **CTA-08 ("Together we grow" en inglés): SIGUE IGUAL.** Sale en `Plantilla.tsx:58`, `99` y `115`. Es posible que sea el lema de marca, así que es una duda y no un error.
- **CTA-09 (objetivos táctiles chicos): ARREGLADO (por CSS).** `estilos.css:1768` pone `min-height: 44px` a los enlaces del pie. `reporte.json` no marca nada. No medí la marca del encabezado (34×34) ni los botones de demo.
- **CTA-10 (el encabezado en 360 px no muestra el nombre): SIGUE IGUAL.** Era una duda de diseño. `inicio-360-0.png` sigue mostrando ícono, "Con señal", "Entrar" y engranaje.

## Hallazgos nuevos

### [CTA-N1] Un enlace de recuperación vencido o inválido no avisa nada si se abre en otra ruta
- Severidad: media
- Tipo: ambiguo
- Regla: R-05
- Dónde: `web/src/contexto/AuthContext.tsx:32-38` · `Ingresar.tsx:42-51`
- Qué ve el agricultor: solo el evento `PASSWORD_RECOVERY` lleva a `#/nueva-clave`. Si el enlace del correo ya venció, Supabase devuelve el error en la dirección (`error_code=otp_expired`) y no dispara ese evento. El agricultor aterriza en Inicio sin ningún aviso. La pantalla "El enlace venció" (`es.ts:593`) solo se ve si entra a mano a `#/nueva-clave`. Esto lo deduzco del código y no lo probé con Supabase real.
- Propuesta: al arrancar, si la dirección trae `error_code=otp_expired` o `error_description`, ir a `#/nueva-clave` (que ya muestra el aviso) o mostrar una ventana con "El enlace venció. Pida otro en Entrar".

### [CTA-N2] `#/nueva-clave` solo tiene un campo de contraseña y no hay confirmación
- Severidad: baja
- Tipo: ambiguo
- Regla: R-32
- Dónde: `NuevaClave.tsx:47-68`
- Qué ve el agricultor: solo hay un campo, con "Mostrar", y la ayuda "Al menos 8 caracteres". No hay medidor de fuerza ni lista de requisitos, como sí tiene Registrarse. Si el servidor rechaza la contraseña por débil (`clave_debil`), el agricultor se entera después de enviar.
- Además: la validación nativa `minLength` muestra el texto del navegador en el idioma del navegador, no el de la app. Al guardar con éxito navega a `/mi-finca`, aunque `usuario` podría seguir en null un momento.
- Propuesta: reutilizar los requisitos de Registrarse o dejar un texto de ayuda que mencione mayúsculas y números. Y hacer una revisión propia con el mismo texto de `claveCorta`, sin depender del mensaje del navegador.
- Evidencia: lectura de código. En la demo la página solo muestra "El enlace venció" (`nueva-clave-360-0.png`).

### [CTA-N3] El candado de "Mi finca" es muy pequeño y está recortado en la esquina
- Severidad: baja
- Tipo: responsive
- Regla: R-22, R-51
- Dónde: `inicio-360-0.png` (menú de abajo, "Mi finca") · `estilos.css:1736-1738`
- Qué ve el agricultor: un candado de unos 11 px, en un emoji sin contraste fijo, en el borde derecho superior de la pestaña. Un lector de pantalla sí lo anuncia, pero a la vista casi no se nota.
- Propuesta: usar el ícono SVG `candado` (ya existe) a unos 14-16 px, con fondo o contorno, y colocarlo dentro del área de la pestaña.

### [CTA-N4] "¿Olvidó su contraseña?" no impide tocar varias veces seguidas
- Severidad: baja
- Tipo: ambiguo
- Regla: R-34
- Dónde: `Ingresar.tsx:42-51`, botón en la línea 120
- Qué ve el agricultor: `olvide()` no tiene estado "enviando". Con mala señal el agricultor puede tocarlo varias veces y provocar el error `muchos_correos` o `esperar`. El texto de esos errores es claro, pero el botón no da ninguna señal de que está trabajando mientras espera.
- Propuesta: deshabilitar el botón y mostrar "Enviando…" mientras se espera.
- Además: el botón queda dentro del bloque de la contraseña, bajo el campo. Con la demo (`ingresar-360-*`) solo explica que no se envían correos. Eso es correcto.

## Revisado y sin problemas
- Los textos de "olvidé mi contraseña" están en español e inglés (`es.ts:584-593`, `en.ts:554-563`).
- La respuesta "Si «correo» tiene una cuenta…" no revela si el correo existe.
- Los errores de entrada traducidos y el flujo de crear cuenta, con el campo marcado y texto visible.
- `NuevaClave` maneja bien la sesión inexistente (`!cargando && !usuario`).
- El botón flotante de "Reportar una plaga" ya se oculta en esa ruta.
- Las capturas de `ingresar`, `registrarse`, `ajustes` y `nueva-clave` en 360 y 1280 px no tienen desbordes.

## No pude revisar
- Capturas en 390 y 768 px, tema azul e inglés.
- El envío real del correo de recuperación y el enlace con Supabase real (la demo no lo llama).
- Carga lenta y sin señal real.
- La ventana de `Confirmar.tsx` abierta.
- El comportamiento visual de los mensajes de error reales en pantalla.
