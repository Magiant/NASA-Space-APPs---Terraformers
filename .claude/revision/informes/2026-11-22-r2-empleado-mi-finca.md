# Segunda pasada de empleado-mi-finca — 2026-11-22

Segunda pasada de Mi finca, siembras, historial y plagas (FIN-01 a FIN-11). Recapturé 360 y 1280 px en tema crema y español con `--entrar` (carpeta `C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-22-53`) y releí el código. De mis 11 hallazgos, 8 quedaron arreglados, 2 a medias y 1 sigue igual. Aparecieron 5 problemas nuevos, ninguno grave.

## Estado de mis hallazgos anteriores

- **FIN-01 (foto de la plaga no se envía): arreglado a medias.**
  - Mejoró: el reporte ya no manda `con_foto: true` (`ReportarPlaga.tsx:127`, ahora `false`), así que el técnico no cree que hay foto. Debajo del botón hay un texto fijo que dice "La foto se queda en su teléfono: todavía no se envía al técnico" (`tp.fotoNoSeEnvia`, `es.ts` y `en.ts:728`).
  - Sigue igual: el botón dice "Tomar o subir una foto", así que invita a hacer algo que no sirve para el reporte. Tampoco hay límite de tamaño ni tipo (`ReportarPlaga.tsx:214-218`). Con la foto elegida, la vista previa también queda sin límite de alto (`vista-foto`).
- **FIN-02 (área en ha con punto decimal): arreglado a medias.**
  - Mejoró: Mi finca, la siembra y el historial usan `formatoHa` (coma, 2 decimales, y 4 solo si es menor de 0,1 ha). El historial ahora dice "Cosechó 22 quintales en 1 ha".
  - Sigue igual: la unidad que escribió el agricultor (m² o manzanas) no se recuerda. Quien escribe "2 manzanas" ve "1,4 ha". Es una decisión de diseño, pero la propuesta de mostrar "(350 m²)" no se aplicó.
- **FIN-03 (orden de sugerencias sin explicar): arreglado.** Hay un texto bajo el título que dice "Ordenados según su finca… Por eso un «Bueno» puede ir antes que un «Excelente»" (`es.ts:692`, `ListaSugerencias.tsx:41`). Lo vi en `siembras_nueva-360-0.png`. El texto está también en inglés (`en.ts:661`).
- **FIN-04 ("Excele/nte" partido): arreglado.** `.insignia { white-space: nowrap }` (`estilos.css:1727`), y la tarjeta pone la foto arriba y el nombre con la insignia debajo (`estilos.css:1722`). En la captura se lee "Bueno" completo y `reporte.json` ya no marca `palabra-partida`.
- **FIN-05 (nota de seguimiento falla en silencio): arreglado a medias.**
  - Mejoró: `MiSiembra.tsx:53-66` tiene `try/catch`, un aviso que añade "su nota sigue escrita", y el botón muestra "Guardando…" y se desactiva.
  - Sigue igual: no hay cola sin señal, así que la nota solo se conserva mientras la persona no salga de la pantalla.
- **FIN-06 (cerrar siembra: doble envío y cantidades absurdas): arreglado a medias.**
  - Mejoró: se añadió `max="100000"` (`CerrarSiembra.tsx:92`). Sin cantidad se guarda vacía y no 0, y el resumen no la menciona. El error de red se traduce con `mensajeError`.
  - Sigue igual: el botón "Guardar resultado" no tiene estado de envío ni se desactiva (`CerrarSiembra.tsx:112`). El segundo toque podría ir mientras la primera petición sigue en curso. La ventana de confirmar suma una barrera (en `NuevaSiembra` ya había `enviando`), pero ese caso no está cubierto. Tampoco hay copia sin señal para cerrar.
- **FIN-07 (botón flotante tapa contenido): arreglado a medias.**
  - Mejoró: el botón es ahora un círculo de 56 px en pantallas chicas (`estilos.css:1710-1718`), y hay padding inferior (150 px).
  - Sigue igual: en `historial-360-0.png` el círculo todavía queda sobre el borde de la tarjeta, junto a "Cosechó 22 quintales en 1 ha". No revisé si sigue apareciendo en `#/reportar-plaga`.
- **FIN-08 (tres fichas enormes en el historial): arreglado.** Las fichas van en una sola fila de tres columnas, ocupan unos 115 px de alto y la lista empieza antes (`historial-360-0.png`). Dos cosas siguen igual y son menores. `reportes` sigue sin entrar en la condición de carga de `MiHistorial.tsx:28`. Además, con 420 px o menos de ancho la regla `estilos.css:511` pasa a 2 columnas.
- **FIN-09 (cantidad se conserva al cambiar de resultado): arreglado.** `elegirResultado` vacía la cantidad (`CerrarSiembra.tsx:31-34`). La unidad no se reinicia, pero es razonable.
- **FIN-10 (fecha futura y área): arreglado.** La fecha tiene `max={hoy()}` y además se valida al enviar con el texto `fechaFutura` (`NuevaSiembra.tsx:78` y `163`). Sigue el `required` nativo en el área.
- **FIN-11 (controles pequeños): sigue igual.** `reporte.json` marca "toque-chico" en `fincas/nueva` a 360 y 1280 px (`input 24×24`, los radios de riego, `NuevaFinca.tsx:79-80`).

## Problemas nuevos

### [FIN-12] El botón "Guardar resultado" no se bloquea mientras se confirma o se envía
- Severidad: media
- Tipo: error
- Regla: R-34
- Dónde: `CerrarSiembra.tsx:48-69`
- Qué pasa: `enviar` espera la ventana de confirmar y luego la petición, sin ningún estado de ocupado. Se puede abrir otra ventana encima o repetir el envío. Si llega "Esta siembra ya está cerrada" (`supabase.ts:148`), sale un error confuso sobre algo que sí salió bien.
- Propuesta: añadir `enviando` como en `NuevaSiembra`, con el botón en "Guardando…".

### [FIN-13] La nota y el cierre pierden su texto sin señal, sin copia ni cola
- Severidad: media
- Tipo: error
- Regla: R-63 y R-05
- Dónde: `MiSiembra.tsx:53-66`, `CerrarSiembra.tsx:63-68`
- Qué pasa: sin señal el aviso es honesto (error con `mensajeError`), pero el agricultor en campo tiene que volver a intentar a mano. Solo los reportes de plaga usan `cola`. No confirmé en el código qué diría la copia de lectura "sin señal" (`AvisoCopia`) en estas pantallas. No vi `AvisoCopia` en `NuevaFinca`/`NuevaSiembra`.
- Propuesta: pasar las notas por la cola, o al menos decir en el aviso que debe repetir cuando tenga señal.

### [FIN-14] El enlace de reportes y el mensaje de plaga sin señal usan una prueba por texto del error
- Severidad: baja
- Tipo: consistencia
- Regla: R-34
- Dónde: `ReportarPlaga.tsx:141`
- Qué pasa: sigue una expresión regular sobre `fetch|network|load failed` además del código `sin_conexion`. `errores.ts:22` también adivina por texto en inglés (`failed to fetch|network|…|timeout`). Si el servidor devuelve otro texto o idioma, un error de red real se mostraría como error del servidor y el reporte no iría a la cola. La duplicación es innecesaria: bastaría el código de `clasificar`.
- Propuesta: usar solo `codigo === 'sin_conexion'`.

### [FIN-15] `mensajeError` puede mostrar texto en español de la base tal cual
- Severidad: baja
- Tipo: consistencia
- Regla: R-07
- Dónde: `errores.ts:44-48`
- Qué pasa: un error sin código que no sea de red, permisos ni `TypeError` se devuelve tal cual (`return m`). Con el inglés activo, un mensaje de la capa demo (`demo.ts`) saldría en español. No lo vi en pantalla; es lo que muestra el código.
- Propuesta: lanzar siempre `ErrorApp` desde `demo.ts` para tener los dos idiomas.

### [FIN-16] La ventana de confirmar al guardar una siembra: lo que no vi
- Severidad: baja
- Tipo: ambiguo
- Dónde: `NuevaSiembra.tsx:82-87`
- Qué pasa: el flujo se ve bien en el código: resumen con área, finca y fechas, con `aceptar` propio. Pero la captura no llega a la ventana (el reporte automático no pasa el formulario). Si el área es mayor que la finca hay dos ventanas seguidas (agrandar, luego confirmar), y no me quedó claro si el agricultor entiende que son dos pasos distintos.
- Propuesta: probar en un celular real; si confunde, unirlas en una sola.

Lo que revisé y no tenía problemas: la ventana de confirmar antes de cerrar (resumen y tono de peligro), la dependencia de las preguntas según el resultado, el singular y plural de unidades, el aviso de salir sin guardar, el aviso de que la siembra es más grande que la finca, el orden y el texto de las sugerencias en español e inglés (cadenas de `ordenSugerencias`, `fechaFutura`, `notaSigue`, `fotoNoSeEnvia` existen en ambos idiomas), y el texto del historial.

Lo que no pude revisar: el tema oscuro (`--tema=azul`), los anchos de 390 y 768 px, y los casos que la demo no muestra (sin datos, carga lenta, error de red, nombres largos, fotos grandes). Esos casos los inferí solo del código. Tampoco abrí las capturas en inglés, ni vi la ventana de confirmar en una captura.
