# Informe de empleado-tiempo — 2026-11-22

REVISIÓN TIEMPO Y ALERTAS (TerraFarm), 22-11-2026

Capturas en C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-21-32 y en C:\Users\PC\AppData\Local\Temp\claude\cff5e9b249d026e9\176261a1-31f1-4afb-a5bd-a4bf49f6e0eb\scratchpad\o1 a o5. Las carpetas o1 a o5 son capturas propias hechas con una copia de capturar.mjs que fija la zona CR30101. No toqué archivos del proyecto.

### [TIE-01] La tarjeta de alerta corta el consejo en el celular y no hay forma de leerlo
- Severidad: alta
- Tipo: error
- Regla: R-05
- Dónde: #/alertas?ver=alertas, 360 px, tema claro · web/src/estilos.css:1171 y 1186-1193 (`.alerta-descripcion` con `-webkit-line-clamp: 4`) · web/src/paginas/publicas/Alertas.tsx:114
- Qué ve el agricultor: dos tarjetas lado a lado, cada una de unos 160 px de ancho. Una dice "Revise los desagü…" y la otra "Si cae ceniza, lave las hojas de…". La acción queda cortada.
- Por qué confunde o falla: el botón "Leer el aviso completo" solo aparece si el texto pasa de 150 caracteres (Alertas.tsx:114). Estos textos miden menos, así que el CSS los corta en 4 líneas y no hay botón para abrirlos. El aviso más importante queda sin su instrucción.
- Propuesta: mostrar una sola columna en celular (`grid-template-columns: 1fr` bajo 700 px) y quitar el recorte. Otra opción es mostrar siempre "Leer el aviso completo" cuando el texto esté recortado, medido por la pantalla y no por el número 150.
- Evidencia: scratchpad\o3\alertas_ver_alertas-360-1.png

### [TIE-02] El pronóstico se contradice: "Nublado" ahora, "Llovizna" en la hora y "96 %" hoy
- Severidad: alta
- Tipo: ambiguo
- Regla: R-02
- Dónde: #/alertas (pestaña Tiempo) y #/zona/CR30101, 360 y 1280 px · web/src/componentes/Pronostico.tsx:182, 198, 94-96, 115-120
- Qué ve el agricultor: arriba "21°C / Nublado". Debajo, "Próximas 24 horas, Ahora: Llovizna 96 %". Luego "Hoy: Llovizna 24°/17° 96% · 2 mm". También "Es probable que llueva en la próxima hora." Al agricultor le dicen "nublado" y "llovizna" a la vez, sin explicación.
- Por qué confunde o falla: el cielo de "ahora" sale de un código distinto al de la hora siguiente (la hora "Ahora" usa el código horario y la cabecera otro). La fila "Hoy" mezcla la lluvia máxima del día con el cielo del día. No se aclara que el 96 % es la probabilidad más alta de todo el día.
- Propuesta: usar el mismo código del cielo en la cabecera y en la primera hora. En la fila de días escribir "Lluvia: 96 % hoy, 2 mm en total". Agregar la frase "Llovizna sobre todo hasta las 7 p. m." cuando la lluvia no dura todo el día.
- Evidencia: scratchpad\o1\alertas-360.txt y o1\alertas-360-1.png

### [TIE-03] No se explica qué significan los niveles de alerta ni a quién afectan
- Severidad: alta
- Tipo: ambiguo
- Regla: R-01, R-05, R-51
- Dónde: #/alertas?ver=alertas, 360 y 1280 px · web/src/idiomas/es.ts:457 (`nivel`) · Alertas.tsx:103-111
- Qué ve el agricultor: etiquetas "Atención", "Vigilancia" y "Alerta" (verde, amarillo y naranja). Las siglas "IMN" y "CNE" aparecen en la tarjeta y en el subtítulo sin decir qué son.
- Por qué confunde o falla: la escala no se explica en ninguna parte. "Vigilancia" va en verde y parece lo más leve, pero "Atención" (amarillo) queda arriba de él, y el orden de la lista (Atención, Vigilancia, Alerta) no sigue la gravedad. Tampoco hay una acción estándar por nivel ("qué hacer"). Eso solo aparece, a veces, dentro del texto del aviso.
- Propuesta: debajo de "Avisos oficiales de la CNE y del IMN" poner: "CNE: Comisión Nacional de Emergencias. IMN: Instituto Meteorológico Nacional." y una leyenda de una línea: "Vigilancia: esté pendiente · Atención: tome precauciones · Alerta: actúe hoy · Peligro: proteja su finca y su familia." Ordenar la lista de mayor a menor gravedad.
- Evidencia: scratchpad\o3\alertas_ver_alertas-360-0.png y -1.png

### [TIE-04] Aviso vencido mostrado como vigente (solo en la demo, duda sobre producción)
- Severidad: media
- Tipo: datos
- Regla: R-41
- Dónde: #/alertas?ver=alertas · web/src/servicios/algolia.ts:129-130 (la demo no filtra por fecha) vs web/src/servicios/publico.ts:168 (el modo real sí filtra `fin.gte.hoy`)
- Qué ve el agricultor: "ATENCIÓN · Lluvias fuertes... Desde 13-11-2026 hasta 16-11-2026", en una fecha en que hoy es 22-11. El aviso ya terminó y sigue arriba, y cuenta en el "3" de la pestaña.
- Por qué confunde o falla: en la demo parece un aviso actual. En modo real se filtra, así que es un riesgo bajo. Es una duda porque no probé el modo real.
- Propuesta: filtrar también en la demo por `fin >= hoy`. Si se quiere conservar el historial, marcar "Terminó el 16-11-2026".
- Evidencia: scratchpad\o3\alertas_ver_alertas-360.txt

### [TIE-05] Decimales con punto en "Cómo está la zona"
- Severidad: media
- Tipo: consistencia
- Regla: R-10
- Dónde: #/zona/CR30101, 360 y 1280 px · web/src/idiomas/es.ts:375 (`entre`) y la tarjeta Temperatura de Zona
- Qué ve el agricultor: "19.5 °C" y "Entre 11.9 y 26.2 °C". Justo encima, el pronóstico usa "21°C", "Humedad 87 %", "Viento 6 km/h".
- Por qué confunde o falla: en Costa Rica se escribe "19,5 °C". Además, "21°C" y "19.5 °C" no tienen el mismo formato, ni en el espacio ni en el decimal.
- Propuesta: formatear con la coma ("19,5 °C", "Entre 11,9 y 26,2 °C") y unificar el espacio ("21 °C").
- Evidencia: terrafarm-revision\2026-11-22-21-32\zona_CR30101-360-3.png

### [TIE-06] Sensación, humedad y viento sin palabras simples ni contexto
- Severidad: media
- Tipo: ambiguo
- Regla: R-01, R-03
- Dónde: #/alertas, 360 px · es.ts:345-347 · Pronostico.tsx:200-205
- Qué ve el agricultor: "Sensación 23°", "Humedad 87 %", "Viento 6 km/h". La hora trae "96%" sin la palabra lluvia (solo la gota, y el texto largo está oculto para lectores de pantalla). La fila de días muestra "41%" y "74% · 8 mm".
- Por qué confunde o falla: no dice contra qué se compara. "Sensación 23°" no se explica como "se siente como". "8 mm" y "13 mm" no tienen equivalente en palabras. La gota sola como ícono depende de la interpretación.
- Propuesta: "Se siente como 23°", "Aire muy húmedo (87 %)", "Viento suave (6 km/h)". En la fila de días "74 % de lluvia · unos 8 mm (aguacero)" o similar.
- Evidencia: scratchpad\o1\alertas-360-1.png

### [TIE-07] El pronóstico dice la hora de actualización, pero no la fecha ni qué hacer sin señal
- Severidad: media
- Tipo: datos
- Regla: R-40, R-41, R-34
- Dónde: Pronostico.tsx:184, 190, 222 · es.ts:363-364
- Qué ve el agricultor: "Fuente: Open-Meteo · actualizado: 3:33 p. m." Sin señal: "Sin señal: se muestra el pronóstico guardado (…)". Solo se agrega el día si pasaron más de 24 horas.
- Por qué confunde o falla: la hora sola no aclara si es de hoy. Si el pronóstico guardado tiene 20 horas, "3:33 p. m." parece reciente. "Open-Meteo" no se explica. El mensaje sin señal no dice si el pronóstico sigue sirviendo.
- Propuesta: "Pronóstico de Open-Meteo (servicio meteorológico en línea), actualizado hoy a las 3:33 p. m." y, sin señal, "Sin señal: este pronóstico es de hoy a las 3:33 p. m. y puede haber cambiado. Se actualizará cuando vuelva la conexión."
- Evidencia: scratchpad\o1\alertas-360-2.png

### [TIE-08] Pestaña Alertas: sin zona y sin aviso en la zona
- Severidad: media
- Tipo: ambiguo
- Regla: R-05, R-43
- Dónde: #/alertas?ver=alertas, zona CR30101 elegida · Alertas.tsx:85-98 · es.ts:455-456
- Qué ve el agricultor: "No hay alertas: Por ahora no hay avisos para su zona." El selector "En Oriental / Todo el país" queda a la vista, y la pestaña no muestra contador porque con la zona hay 0 alertas.
- Por qué confunde o falla: en Cartago el volcán Irazú tiene aviso, pero está ligado a "Tierra Blanca" y "Cot", así que desde Oriental no se ve. Se dice "su zona" sin decir cuál. El agricultor tampoco sabe que existen avisos para todo el país (3) a menos que toque el botón.
- Propuesta: "No hay avisos para Oriental. Hay 3 avisos en otras zonas del país: toque 'Todo el país' para verlos."
- Evidencia: scratchpad\o2\alertas_ver_alertas-360.txt

### [TIE-09] Los avisos en inglés siguen en español
- Severidad: baja
- Tipo: consistencia
- Regla: R-07
- Dónde: #/alertas?ver=alertas, `--idioma=en` · web/src/datos-ejemplo/publicos.ts:245 (los textos de los avisos están solo en español)
- Qué ve el agricultor: con la app en inglés, la interfaz está en inglés pero el título y el texto de cada aviso siguen en español ("Lluvias fuertes en el Caribe…"). Es duda: puede ser a propósito porque la fuente oficial está en español. Verifiqué la página en inglés con tema azul solo en la pestaña Tiempo, y las alertas solo por el código y por los datos de ejemplo.
- Propuesta: dejar una nota "Official notice (Spanish)" o traducir los avisos de demostración.
- Evidencia: scratchpad\o5\alertas-360.txt (pestaña Tiempo en inglés) y datos-ejemplo/publicos.ts

### [TIE-10] Controles de menos de 40 px y palabras partidas del reporte automático
- Severidad: baja
- Tipo: responsive
- Regla: R-22, R-21
- Dónde: #/alertas y #/zona/CR30101, 360 px (el reporte marca `toque-chico` en las dos, `palabra-partida` solo en la zona)
- Qué ve el agricultor: los enlaces del pie ("Inicio", "Sembrar", "Precios", "Tiempo", "Cursos", "Mi finca") miden 22 px de alto y el logo 34×34 px. Estos controles son del pie y de la cabecera de toda la app, no de mi parte. `palabra-partida` en la zona: "Hectáreas", "Fincas", "Cosecha" y "diciembre" de la tabla de vecinos se parten en dos líneas. Lo confirmé en el reporte, pero esa tabla no es mi parte.
- Propuesta: subir los enlaces del pie a 44 px de alto y achicar la letra o ensanchar las columnas de la tabla de vecinos.
- Evidencia: scratchpad\o4\reporte.json

Revisado y sin problemas:
- Tema oscuro e inglés en la pestaña Tiempo a 360 px: textos completos y legibles, sin claves ni `undefined`.
- Hora por hora con "Mañana" al cambiar el día.
- Mensaje de error y botón "Reintentar" en el código.
- Aviso "Es probable que llueva en la próxima hora".
- Singular y plural de "1 alerta" y "3 alertas".
- Enlaces de zona en cada aviso.

No pude revisar:
- Sin datos, carga lenta, error de red y modo sin señal ("guardado"): la demo no los muestra y no los forcé; los vi solo en el código.
- Anchos 390 y 768 px: no capturé la pestaña Tiempo ni Alertas en esos anchos con zona elegida, y la ventana flotante "Leer el aviso completo" tampoco (los textos de la demo no la activan).
- Pestaña Alertas en tema azul y en inglés: solo vi Tiempo; no fijé zona en esas capturas.
- Valores extremos (999 mm, 0 mm, nombres de distrito muy largos): solo vistos en el código. No hay captura.
- El `reporte.json` de la carpeta principal se sobrescribió con el de otras páginas (`dron`, `precios`, `capacitaciones`), así que usé los míos (o1 a o5).
