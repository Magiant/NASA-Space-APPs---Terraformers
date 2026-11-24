# Informe de empleado-mi-finca — 2026-11-22

Revisión de Mi finca, siembras, historial y plagas. Capturas en `C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-21-32` (360 y 1280 px, tema crema, español). Todo lo de abajo lo vi en una captura o en el código; las dudas están marcadas como dudas.

### [FIN-01] La foto del reporte de plaga nunca se envía
- Severidad: alta
- Tipo: error
- Regla: R-34 y R-42 (la app promete algo y no lo cumple)
- Dónde: #/reportar-plaga, todos los anchos · web/src/paginas/privadas/ReportarPlaga.tsx:117-125 y 207-218; web/src/servicios/supabase.ts:158
- Qué ve el agricultor: el botón "Tomar o subir una foto", luego la foto en pantalla y el reporte "enviado".
- Por qué confunde o falla: la foto solo se guarda como `URL.createObjectURL` en el teléfono, y al servidor solo llega `con_foto: true`, sin el archivo. El agricultor cree que mandó evidencia y el técnico no recibe nada. Tampoco hay límite de tamaño, tipo ni reducción de la foto. Si algún día se sube, una foto de 10 MB sin señal no cabrá en la cola offline. Es una duda si esto es intencional en la demo; el código no sube nada.
- Propuesta: subir la foto reducida (unos 1280 px) a Storage. Mientras no se suba, cambiar el botón a "Foto (solo para usted, no se envía todavía)" o quitarlo.
- Evidencia: reportar-plaga-360-1.png, que muestra el botón de foto.

### [FIN-02] El área se muestra siempre en hectáreas con punto decimal, no en la unidad que usó el agricultor
- Severidad: alta
- Tipo: consistencia
- Regla: R-14 y R-10
- Dónde: #/mi-finca, #/siembras/s1, #/historial · MisFincas.tsx:54 y 68; MiSiembra.tsx:43; MiHistorial.tsx:61; CampoArea.tsx:9-12
- Qué ve el agricultor: lo que escribió como "2 manzanas" o "350 m²" aparece después como "1.3974 ha" o "0.035 ha". Con 350 m² (0,035 ha), el punto decimal no es el de Costa Rica. Las hectáreas con 4 decimales no le dicen nada.
- Por qué confunde o falla: la base guarda hectáreas y se pierde la unidad original. Además, esas pantallas imprimen `{s.area_ha}` sin `formatoHa`, así que sale con punto y no con coma. `NuevaSiembra` sí usa `formatoHa` y por eso dice "0,5 ha" en un lugar y "0.5 ha" en otro.
- Propuesta: usar siempre `formatoHa(...)`. Guardar la unidad que eligió la persona, o mostrar "0,035 ha (350 m²)" para áreas menores de 0,1 ha.
- Evidencia: mi-finca-360.txt y historial-360.txt (leer "ha"); NuevaSiembra.tsx:64 usa el formato correcto.

### [FIN-03] Los cultivos sugeridos van en un orden que no se explica y parece desordenado
- Severidad: alta
- Tipo: ambiguo
- Regla: R-42 y R-03
- Dónde: #/siembras/nueva, 360 px · web/src/logica/recomendacion.ts:73-76; ListaSugerencias.tsx:39
- Qué ve el agricultor: "1. Cebolla Excelente, 2. Frijol Excelente, 3. Repollo Bueno, 4. Café Excelente". Un "Excelente" queda debajo de un "Bueno".
- Por qué confunde o falla: el orden sale de un puntaje con bono por rotación que el agricultor no ve. Café es "Excelente" y va cuarto, con un número delante que parece un ranking oficial. Nadie dice "ordenado por: rotación después de zanahoria y zona".
- Propuesta: agregar arriba de la lista "Ordenados de mejor a menos conveniente para su finca, según la rotación (zanahoria antes) y el clima de la zona." Si los niveles no coinciden con el orden, mostrar también el puntaje, o agrupar por nivel y luego por rotación.
- Evidencia: siembras_nueva-360.txt y siembras_nueva-360-1.png.

### [FIN-04] "Excelente" se parte en "Excele / nte" en la insignia (confirma el reporte automático)
- Severidad: media
- Tipo: responsive
- Regla: R-21
- Dónde: #/siembras/nueva, 360 px, tema claro · componente InsigniaNivel, usado en ListaSugerencias.tsx:48
- Qué ve el agricultor: la insignia de Café se ve como "Excele" y "nte" en dos líneas dentro de la tarjeta de dos columnas.
- Por qué confunde o falla: la palabra queda cortada, y pasa en las tarjetas "Excelente" de la rejilla de dos columnas.
- Propuesta: `white-space: nowrap` en la insignia, o poner la insignia debajo del nombre cuando no cabe. Otra opción es usar una columna a 360 px.
- Evidencia: siembras_nueva-360-1.png; reporte.json marca `palabra-partida`.

### [FIN-05] Agregar una nota de seguimiento no avisa si falla, y sin señal se pierde
- Severidad: media
- Tipo: error
- Regla: R-34, R-05 y R-63
- Dónde: #/siembras/s1 · MiSiembra.tsx:32-37
- Qué ve el agricultor: toca "Agregar" y no pasa nada, o el texto sigue ahí sin explicación.
- Por qué confunde o falla: `agregar` no tiene `try/catch`, así que falla en silencio con un error no manejado. No hay cola offline como en los reportes de plaga, y el botón no se desactiva mientras envía, así que un doble toque duplica la nota.
- Propuesta: `try/catch` con aviso "No se guardó la nota. Revise su señal y vuelva a intentar; el texto sigue aquí.", desactivar el botón mientras guarda, y pasar la nota por la cola offline.
- Evidencia: solo en el código.

### [FIN-06] Cerrar siembra: se puede enviar dos veces y el campo de cantidad deja pasar números absurdos
- Severidad: media
- Tipo: error
- Regla: R-31, R-32 y R-34
- Dónde: #/siembras/s1/cerrar · CerrarSiembra.tsx:38-59 y 82
- Qué ve el agricultor: "Guardar resultado" no se desactiva mientras envía, y el campo "¿Cuánto cosechó?" acepta cualquier número, incluso uno enorme. La cantidad 0 o vacía se guarda sin avisar, y el resumen no dice que no hay cantidad.
- Por qué confunde o falla: si la red es lenta, un segundo toque puede dar "Esta siembra ya está cerrada." (supabase.ts:148), que es el mensaje técnico de un caso evitable. Sin señal, el `catch` muestra el mensaje crudo del error de red. Cerrar tampoco tiene cola offline: se dice "guardado" o no se guarda, sin otra opción. Además, a diferencia de `NuevaSiembra`, el error no tiene acción (R-05).
- Propuesta: añadir `enviando` con el botón en "Guardando…", poner un máximo razonable (por ejemplo `max="100000"`), y en caso de error de red decir "Sin señal: no se pudo cerrar la siembra. Vuelva a intentarlo cuando tenga señal; no se perdió nada de lo escrito."
- Evidencia: solo en el código; siembras_s1_cerrar-360-0.png muestra la pantalla inicial.

### [FIN-07] El botón flotante "Reportar una plaga" tapa contenido en las páginas de formulario y de historial
- Severidad: media
- Tipo: responsive
- Regla: R-23
- Dónde: #/historial, #/siembras/s1/cerrar y #/siembras/nueva, 360 px
- Qué ve el agricultor: el botón verde queda encima de la primera tarjeta del historial y de las opciones de cierre, aunque la captura no lo muestra encima de un campo.
- Por qué confunde o falla: tapa texto del contenido mientras se lee, y en `#/reportar-plaga` se ofrece el botón dentro de la misma página que reporta plagas, lo cual es redundante.
- Propuesta: espacio extra al final de la página (`padding-bottom`) y ocultar el botón en `#/reportar-plaga`.
- Evidencia: historial-360-0.png, siembras_s1_cerrar-360-0.png, siembras_nueva-360-1.png.

### [FIN-08] Historial en 360 px: tres tarjetas enormes antes de ver una sola siembra
- Severidad: media
- Tipo: responsive
- Regla: R-24 y R-03
- Dónde: #/historial, 360 px · MiHistorial.tsx:40-48
- Qué ve el agricultor: tres fichas de ancho completo ("1 Buena cosecha", "1 Regular", "1 Se perdió"), cada una de unos 130 px de alto, y la lista empieza después de bajar casi toda la pantalla.
- Por qué confunde o falla: se lee lento en el celular. Los totales solo cuentan siembras, sin decir cuántas hectáreas ni qué cultivo, y "1 Se perdió" no dice "de 3 siembras en total". Además `reportes` no entra en la condición de carga, así que la columna de reportes aparece tarde y un error de red allí no se muestra.
- Propuesta: poner las tres fichas en una sola fila de tres columnas pequeñas, o convertirlas en una línea "3 siembras: 1 buena cosecha, 1 regular, 1 se perdió". Añadir manejo de error para `reportes`.
- Evidencia: historial-360-0.png.

### [FIN-09] Cerrar una siembra con "Regular" o "Se perdió" y cambiar de opción conserva la cantidad escrita
- Severidad: baja
- Tipo: ambiguo
- Regla: R-04
- Dónde: #/siembras/s1/cerrar · CerrarSiembra.tsx:24 y 77-93
- Qué ve el agricultor: si escribe 20 con "Buena cosecha" y luego toca "Se perdió", el 20 sigue en el campo y la pregunta cambia a "cuánto perdió".
- Por qué confunde o falla: el número que contó como cosechado se guarda y se muestra como "Perdió 20 sacos" sin que lo note. El campo de unidad tampoco se reinicia.
- Propuesta: vaciar `cantidad` al cambiar de resultado, o avisar "Revise la cantidad".
- Evidencia: solo en el código.

### [FIN-10] En Nueva siembra no hay validación de fecha ni tope de área razonable en el campo
- Severidad: baja
- Tipo: error
- Regla: R-32
- Dónde: #/siembras/nueva · NuevaSiembra.tsx:147-152; CampoArea.tsx:45
- Qué ve el agricultor: puede poner una fecha de siembra de hace años o del año 3000, y la cosecha esperada se calcula sin avisar. El campo de área tiene `required` del navegador, que muestra un mensaje genérico en vez del aviso propio. Un valor como 1000000 m² solo se detecta al enviar.
- Por qué confunde o falla: una fecha futura distorsiona el avance ("Lleva 0 %") y la cosecha esperada.
- Propuesta: `max={hoy()}` en la fecha, con el texto "La fecha de siembra no puede ser futura. Si va a sembrar pronto, vuelva ese día." Quitar `required` del campo de área para que lo atrape el aviso propio, que deja el cursor en el campo.
- Evidencia: solo en el código.

### [FIN-11] "Controles pequeños" (confirma el reporte automático)
- Severidad: baja
- Tipo: responsive
- Regla: R-22
- Dónde: #/fincas/nueva, 360 y 1280 px · NuevaFinca.tsx:78-79
- Qué ve el agricultor: los radios "Sí" y "No" de la pregunta de riego miden 24×24 px, como marca el reporte (`input 24×24`). El resto de lo marcado (logo, enlaces del pie de 22 px de alto) es del diseño general, no de mis páginas.
- Por qué confunde o falla: con guantes o dedos sucios es fácil tocar el contrario.
- Propuesta: hacer que toda la etiqueta, no solo el círculo, mida al menos 44 px de alto.
- Evidencia: reporte.json de fincas/nueva.

Lo que revisé y no tenía problemas: el orden y la dependencia de las preguntas al cerrar (la pregunta cambia según el resultado y pide motivo solo si no fue exitosa); la confirmación antes de cerrar, con resumen de lo que se guarda; el aviso de siembra más grande que la finca con opción de agrandar; el aviso de salir con cambios sin guardar en todos los formularios; el singular y plural de unidades; la cola offline de reportes de plaga con distinción entre error de red y otros errores; y el campo de área con equivalencia en hectáreas.

Lo que no pude revisar: no revisé el tema oscuro (`--tema=azul`), el inglés (`--idioma=en`) ni los anchos de 390 y 768 px, porque solo capturé 360 y 1280 px en tema crema y español. Tampoco puede verse en la demo sin datos, con carga lenta, con error de red, con nombres largos, ni con fotos grandes reales. Esos casos los inferí solo del código, y no leí a fondo `es.ts`, `en.ts` ni `demo.ts` para buscar claves o textos faltantes (R-07).
