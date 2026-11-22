# Informe de jefe-finca — 2026-11-22

Comprobé los hallazgos con las capturas (historial-360-0, dron-360-3, siembras_nueva-360-1) y con el código. No pude revisar tema oscuro, inglés en pantalla ni los anchos de 390 y 768 px. Todo lo marcado "código" sale de leer los archivos, no de verlo en pantalla.

## Confirmados (de más a menos grave)

**1. [FIN-02] Área en hectáreas con punto y sin la unidad del agricultor** (alta, consistencia, R-14 y R-10)
- Dónde: web/src/paginas/privadas/MisFincas.tsx:54 y 68; MiSiembra.tsx:43; MiHistorial.tsx:61. Imprimen `{s.area_ha} ha` o `{f.area_ha} ha` sin `formatoHa`.
- Qué ve el agricultor: "1.3974 ha" o "0.035 ha" con punto. NuevaSiembra.tsx:64 y 145 sí usa `formatoHa` y muestra "0,5 ha". La misma finca aparece con dos formatos.
- Propuesta:
  - Usar `formatoHa(x, t.locale)` en los cuatro sitios.
  - Para áreas menores de 0,1 ha, mostrar "0,035 ha (350 m²)".
  - Redondear a 2 decimales como máximo.
- Pendiente de decisión: guardar la unidad original del agricultor exige cambiar la base de datos. Ver notas.
- Evidencia: mi-finca-360.txt, historial-360.txt.

**2. [DRO-01] "Sus plantas están sanas" con 21 % de estrés debajo** (alta, ambiguo, R-02)
- Dónde: EscaneoDron.tsx:33 (`salud()` mira solo el índice promedio) y :225 (`td.resumen[s]`, es.ts:744).
- Qué ve el agricultor: título "Sus plantas están sanas", debajo "21 % del terreno tiene plantas con estrés" y "10 de 47 parcelas para revisar".
- Por qué falla: el título ignora el área con estrés.
- Propuesta:
  - Si hay parcelas por revisar (o estrés mayor de 10 %) y el estado es `sana`, usar un cuarto texto en es.ts y en.ts.
  - Texto en español: "En general sus plantas están bien, pero {n} parcelas necesitan revisión".
  - Texto en inglés: "Overall your plants look fine, but {n} plots need checking".
- Evidencia: dron-360-0.png y dron-360-3.png.

**3. [CTA-01] Errores de entrar y crear cuenta siempre en español** (alta, consistencia, R-07 y R-63)
- Dónde: web/src/servicios/supabase.ts:34-55 (`mensajeAuth`), 74, 83, 96. El texto está fijo en español, sin pasar por `idiomas/`.
- Falla además en R-63: el `default` (línea 54) muestra `No se pudo completar: ${m}` con el mensaje crudo del servidor.
- Propuesta:
  - El servicio lanza un código (`credenciales`, `ya_existe`, `sin_conexion`, `clave_debil`…).
  - Ingresar.tsx y Registrarse.tsx lo traducen con textos de es.ts y en.ts, y los valores como el correo o los segundos pasan como parámetros.
  - `default`: "No se pudo completar. Intente de nuevo; si se repite, avise al equipo."
- Evidencia: solo código. La demo no llama a Supabase.

**4. [CTA-02] "Pide entrar" no se entiende** (alta, ambiguo, R-35 y R-06)
- Dónde: es.ts:30 y en.ts:29 (`pideEntrar`, con candado), usado en Inicio.tsx:56 y 70.
- Propuesta:
  - es: "🔒 Necesita cuenta (es gratis)".
  - en: "🔒 Needs an account (free)".
- Antes de poner "es gratis", confirmar que la cuenta de verdad es gratis. Ver notas.
- Evidencia: inicio-360-3.png.

**5. [FIN-01] La foto del reporte de plaga nunca se envía** (alta, error, R-34)
- Dónde: ReportarPlaga.tsx:86, 124 y 214. La foto solo vive como `createObjectURL` en el teléfono y al servidor llega `con_foto: true`.
- Qué ve el agricultor: toca "Tomar o subir una foto", ve la foto en pantalla y el reporte sale "enviado". El técnico no recibe nada.
- Propuesta:
  - Mejor opción: subir la foto reducida (unos 1280 px) a Storage.
  - Mientras no se suba, cambiar el texto del botón a "Foto (se queda en su teléfono, todavía no se envía)", en es y en en.
  - Una foto en la cola offline necesita límite de tamaño.
- Es una duda si es intencional en la demo. Confirmado que el código no sube nada.

**6. [CTA-06 + JFIN-01] No hay "¿Olvidó su contraseña?" y "pida ayuda al equipo" no dice cómo** (media, ambiguo, R-05)
- Dónde: supabase.ts:40, Ingresar.tsx:40-47.
- Comprobado: la búsqueda de "olvid", "resetPassword" y "forgot" en `web/src` no encuentra nada.
- Un agricultor que olvida la contraseña no tiene salida. Si intenta crear la cuenta de nuevo, llega al mensaje "Ya existe una cuenta…pida ayuda al equipo", sin contacto.
- Propuesta:
  - Agregar el enlace "¿Olvidó su contraseña?" con `resetPasswordForEmail` de Supabase.
  - Mientras tanto, dar un contacto concreto en el mensaje.
- Evidencia: ingresar-360-1.png.

**7. [FIN-03] Cultivos sugeridos con orden que no se explica** (media, ambiguo, R-42 y R-03)
- Bajé la severidad de alta a media: lo que se ve es un orden raro, no datos falsos.
- Dónde: recomendacion.ts:73-76, ListaSugerencias.tsx:39.
- Qué ve el agricultor: "3. Repollo Bueno" antes de "4. Café Excelente". El número parece un ranking.
- Propuesta:
  - Agregar arriba de la lista "Ordenados según su finca: primero los que mejor van después de zanahoria y con el clima de su zona."
  - Alternativa: ordenar por nivel y después por rotación.
- Evidencia: siembras_nueva-360-1.png.

**8. [FIN-05] Agregar nota de seguimiento falla en silencio y se puede duplicar** (media, error, R-34 y R-05)
- Dónde: MiSiembra.tsx:32-35. `await datos.agregarSeguimiento` no tiene `try/catch` ni estado "enviando".
- Propuesta:
  - `try/catch` con aviso "No se guardó la nota. Revise su señal y vuelva a intentar; el texto sigue aquí."
  - Botón en "Guardando…" mientras envía.
  - Ver las notas sobre cola offline.

**9. [CTA-04] Errores de carga sin acción y "Sin señal" sin fecha de lo guardado** (media, ambiguo, R-05, R-34 y R-41)
- Dónde: Estados.tsx:13-25, Plantilla.tsx:64-81. Incluye DRO-08, que repite lo mismo para EscaneoDron.tsx:61-64.
- Código: Estados.tsx sin leer a fondo, y no vi `ErrorCarga` en EscaneoDron.
- Propuesta:
  - `ErrorCarga` siempre muestra "Revise su señal y toque «Intentar de nuevo»." y el botón, que recarga si la página no trae `reintentar`.
  - En el dron, mostrar "No pudimos cargar el vuelo. Vuelva a intentar cuando tenga señal."
  - Agregar la antigüedad del vuelo ("hace 20 días") junto a la fecha. Esto cubre la parte R-41 de DRO-08.
- La parte del "Cargando…" con consejo tras 8 s es una idea, no un fallo comprobado. Dejarla como opcional.

**10. [DRO-02] Números del dron con punto decimal y sin espacio de miles** (media, consistencia, R-10)
- Dónde: EscaneoDron.tsx:41 (`dos = n.toFixed(2)`), es.ts:743 (`${n} ha`), :176 (m² sin formato).
- Qué ve el agricultor: "0.74 de 1" y "2.5 ha". La base es la misma que en FIN-02.
- Propuesta: formatear con `toLocaleString(t.locale)`. El inglés conserva el punto.
- Evidencia: dron-360.txt.

**11. [FIN-04] "Excelente" se parte en "Excele / nte"** (media, responsive, R-21)
- Confirmado en la captura: la insignia de Café a 360 px.
- Dónde: InsigniaNivel, usada en ListaSugerencias.tsx:48.
- Propuesta: `white-space: nowrap` con letra algo menor, o insignia debajo del nombre en tarjetas de dos columnas.
- Evidencia: siembras_nueva-360-1.png.

**12. [CTA-03] Pestaña "Mi finca" y enlace del pie no avisan que necesitan cuenta** (media, ambiguo, R-35)
- Dónde: Plantilla.tsx:20-26 y 120-124.
- Propuesta: candado pequeño y texto para lector de pantalla cuando no hay sesión. Conviene reutilizar `pideEntrar` del hallazgo 4.

**13. [FIN-07 + DRO-03] El botón flotante "Reportar una plaga" tapa contenido** (media, responsive, R-23)
- Comprobado en historial-360-0.png: tapa el título y la fecha de la primera tarjeta. En dron-360-3.png tapa el final de "¿Cómo mide el dron…?".
- No tapa campos de formulario en las capturas (siembras_nueva-360-1.png).
- Es un problema del armazón (Plantilla), no de cada página.
- Propuesta:
  - Reservar espacio abajo (`padding-bottom` mayor que la altura del botón más las pestañas) en el contenedor de página.
  - Ocultar el botón en #/reportar-plaga, donde es redundante.
  - Considerar ocultarlo también en #/dron, que ya tiene su propio botón. Es decisión de diseño.

**14. [FIN-06] Cerrar siembra: error crudo y sin acción** (media, error, R-05, R-31 y R-63)
- Ajustado: ver más abajo.
- Dónde: CerrarSiembra.tsx:53-58, supabase.ts:149.
- Propuesta:
  - En el `catch`, mostrar un texto propio con acción: "No se pudo cerrar la siembra. Revise su señal y vuelva a intentar; lo que escribió sigue aquí."
  - Dejar `max` razonable en la cantidad.

**15. [DRO-04] El mapa 3D es chico para el dedo a 360 px** (media, responsive, R-22)
- Parcelas de unos 25 × 12 px en el modo 3D por defecto. dron-360-2.png.
- No leí MapaFinca3D.tsx, así que no sé cómo funciona el zoom.
- Propuesta: aviso visible en celular, "Toque «Plano» para elegir parcelas con más precisión", o más alto del lienzo.

**16. [FIN-08] Historial en 360 px: tres fichas grandes antes de la lista** (media, responsive, R-24)
- Confirmado: historial-360-0.png. Las fichas son de ancho completo y la primera siembra queda debajo del pliegue.
- Propuesta: tres columnas compactas, o la línea "3 siembras: 1 buena cosecha, 1 regular, 1 se perdió".
- Parte sin comprobar: que `reportes` no entre en la condición de carga ni muestre error. Es lectura de código no verificada.

**17. [DRO-05] La pendiente no explica niveles ni el 30 %** (media, ambiguo, R-01)
- Dónde: es.ts:754-755.
- Propuesta: "12 % — Suave: baja 12 m por cada 100 m. Desde 30 % se considera fuerte." Y "curvas de nivel (siguiendo el nivel del terreno, sin bajar la cuesta)".
- Evidencia: dron-360-1.png.

**18. [CTA-05] El error de Registrarse no queda visible junto al campo** (media, ambiguo, R-32 y R-51)
- Dónde: Registrarse.tsx:63-70.
- Propuesta: dejar el texto del error visible bajo el campo, con ícono, además de la ventana.
- No lo probé en pantalla.

**19. [DRO-06 + DRO-07] Índice verde sin umbrales y bloque "Qué hacer" largo** (baja, ambiguo, R-01)
- Índice verde: "Verde y sano desde 0,6. Menos de 0,4 es problema." Leyenda: "Sanas (sin marca)".
- "Qué hacer": en dron-360-3.png el segundo punto (11 parcelas, ley forestal) es un párrafo largo.
- Propuesta para el segundo punto: "11 parcelas están a menos de 15 m de un río o quebrada: no corte árboles ni fumigue ahí. (Ley Forestal 7575, art. 33)".
- Dejar claro que son 11 parcelas de protección, distintas de las 10 por revisar.

**20. [FIN-11 + CTA-09] Controles chicos** (baja, responsive, R-22)
- Radios "Sí" y "No" de riego en NuevaFinca.tsx:78-79, de 24 × 24 px.
- Enlaces del pie de 22 px de alto, marca del encabezado de 34 × 34 px, botones de demo de 32 px.
- Propuesta: etiqueta completa clicable con alto mínimo de 44 px, y `padding` en los enlaces del pie y la marca.
- Evidencia: reporte.json.

**21. [FIN-09] Cantidad escrita se conserva al cambiar de resultado** (baja, ambiguo, R-04)
- Código: CerrarSiembra.tsx:24 y 77-93.
- Propuesta: vaciar `cantidad` y reiniciar `unidad` al cambiar `resultado`.

**22. [CTA-07] Siglas sin explicar en pie y Ajustes** (baja, ambiguo, R-01)
- "Fuentes de datos: NASA, Open-Meteo, PIMA, CNP, IMN, CNE, SoilGrids, GAEZ, INA."
- Propuesta: nombres completos una vez, o enlazar a Créditos.

## Ajustados

- FIN-03: bajé la severidad de alta a media. El orden es raro pero no muestra datos falsos. Dejé el texto exacto de la propuesta.
- FIN-06: la ventana de confirmación (CerrarSiembra.tsx:45) ya hace difícil el doble envío, así que "se puede enviar dos veces" es poco probable. Lo bajé a media y dejé solo el error crudo sin acción y el tope de la cantidad. La "cantidad 0 o vacía se guarda sin avisar" es falso: el código ya la guarda como vacía a propósito (línea 36-37).
- FIN-07, DRO-03: junté los dos. Es un problema del armazón y la causa común es el botón flotante.
- FIN-11, CTA-09: junté los dos. El problema es el mismo: controles bajo 44 px.
- DRO-02: precisé que es el mismo problema de fondo que FIN-02. Pueden arreglarse con una sola función de formato.
- DRO-08: la parte de error de red se junta con CTA-04. La parte de antigüedad del vuelo (R-41) queda como propuesta propia.
- CTA-06: lo junté con el hallazgo del jefe sobre contraseña olvidada. Lo comprobé con búsqueda en el código.
- FIN-01: aclaré que es una duda de si la demo debe subir fotos. El código no las sube.

## Descartados

- CTA-08 ("Together we grow"): es el lema de la marca, confirmado en Plantilla.tsx:58, 99, 115 y Ajustes.tsx:134. La propia revisión lo marca como duda. Lo paso a las notas.
- CTA-10 (nombre "TerraFarm" no se ve en 360 px): no rompe ninguna regla. R-06 no aplica. Es una preferencia de diseño, no un hallazgo.
- FIN-10 (fecha futura y `required` del campo de área): no lo comprobé en pantalla y los argumentos son sobre todo de opinión. Dejarlo como mejora opcional.

## Encontrados por el jefe

### [JFIN-01] Ya incluido en el hallazgo 6
La falta de recuperación de contraseña (búsqueda en `web/src` sin resultados) está dentro del hallazgo [CTA-06 + JFIN-01].

### [JFIN-02] Recorrido del agricultor nuevo
- Revisé el cierre de siembra: CerrarSiembra.tsx:55 manda a `/siembras/${id}`, y MiSiembra.tsx:65 ofrece el botón `ts.queAhora` hacia una nueva siembra. El paso de "qué hacer después" existe.
- No recorrí en pantalla el flujo completo: entrar, crear finca, nueva siembra, anotar, cerrar, historial. Falta ese recorrido de punta a punta.
- No vi exposición de datos personales en lo revisado: MisFincas.tsx:54 muestra distrito y cantón, no la ubicación exacta de la finca. No vi correos ni nombres ajenos en las páginas revisadas.

## Notas para el supremo

- Hay que decidir si se guarda la unidad original del área (manzanas, m², ha) o solo se muestra en hectáreas bien formateadas, con equivalencia para áreas pequeñas. Guardar la unidad exige cambiar la base de datos y los datos ya guardados. No tocar siembras ni fincas cerradas.
- Antes de poner "es gratis" en el texto de "Necesita cuenta", confirmar que la cuenta no tendrá costo.
- Decidir cómo recupera la contraseña un agricultor, con restablecimiento por correo o con un contacto del equipo, y poner un canal concreto en los textos.
- Decidir si las notas de seguimiento y el cierre de siembra deben pasar por la cola offline, como los reportes de plaga. Hoy el reporte de plaga sí la usa. Una foto grande en esa cola necesita límite de tamaño.
- El botón flotante y la función de formato de números (coma, espacio de miles) se repiten en varias páginas. Conviene arreglarlos una vez en el armazón, no página por página.
- "Together we grow": decidir si se deja en inglés como marca o se traduce.

Archivos clave:
- web/src/servicios/supabase.ts
- web/src/paginas/privadas/EscaneoDron.tsx
- web/src/paginas/privadas/MisFincas.tsx
- web/src/paginas/privadas/CerrarSiembra.tsx
- web/src/paginas/privadas/ReportarPlaga.tsx
- web/src/idiomas/es.ts
