# empleado-tiempo · 2026-11-27

Revisó /alertas (Tiempo y Alertas) y zona CR30101 en 360/390/768/1280, es claro y en azul. Capturas: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-27-23-22 y en el scratchpad de la sesión (es\, en\, pais\, paisen\).

### [TIE-01] En inglés el día se parte y va al revés ("2 Wednesd-ay")
- Severidad: media · Tipo: responsive/consistencia · Regla: R-21, R-07
- Dónde: #/alertas, 360 px, inglés · web/src/componentes/Pronostico.tsx:45-53 (nombreDia) y :119
- Qué ve: "2 Wednesd-ay" (número arriba, palabra partida). El reporte marcó palabra-partida.
- Propuesta: más ancho para .pronostico-fila-dia o letra menor a 360 px; armar el nombre a mano ("Wednesday 2" / "Miércoles 2").

### [TIE-02] En español, "Miércoles 2" también se parte a 360 px
- Severidad: media · Tipo: responsive · Regla: R-21
- Dónde: Pronostico.tsx:119. Reporte: span.pronostico-fila-dia "Miércoles".
- Propuesta: la misma de TIE-01.

### [TIE-03] Los avisos de la demo salen en español en la versión en inglés
- Severidad: media (duda) · Tipo: consistencia · Regla: R-07
- Dónde: #/alertas?ver=alertas, inglés · Alertas.tsx:119-121
- Qué ve: interfaz en inglés pero tarjetas "IMN · SEQUÍA", "Déficit de lluvia en Guanacaste", "CNE · VOLCÁN".
- Propuesta: traducir al menos el tipo (sequía → Drought, volcán → Volcano, lluvias → Heavy rain); avisar que el texto oficial está en español.

### [TIE-04] El aviso de sequía dice "Guanacaste" pero solo enlaza "Liberia"
- Severidad: media (duda) · Tipo: ambiguo · Regla: R-05, R-02
- Propuesta: "Afecta a: Liberia y otros N distritos" o corregir el título. Puede ser solo dato de demo.

### [TIE-05] El pronóstico mezcla cielos y los "mm" no se explican
- Severidad: baja · Tipo: ambiguo · Regla: R-02, R-01
- Dónde: Pronostico.tsx:187, 123-125
- Qué ve: arriba "Llovizna", en la fila de hoy "Lluvia 22° / 17° Lluvia 98 % · 18 mm".
- Propuesta: explicar mm ("más de 10 mm es lluvia fuerte") o resumen del día.

### [TIE-06] Humedad y viento sin palabras; las horas no dicen "lluvia"
- Severidad: baja · Tipo: ambiguo · Regla: R-01
- Dónde: es.ts:372-373, Pronostico.tsx:72
- Propuesta: "Humedad 100 % (muy húmedo)", "Viento 11 km/h (suave)"; en las horas, indicar que el % es probabilidad de lluvia.

### [TIE-07] La cabecera escribe "19°C" y el resto "19°" o "19,5 °C"
- Severidad: baja · Tipo: consistencia · Regla: R-10
- Dónde: Pronostico.tsx:205 (grados() + <span>C</span>) y es.ts:372-373; en inglés "Humidity 100%".
- Propuesta: "19 °C" y "100 %" con espacio en español.

### [TIE-08] La pestaña "Alertas" no dice cuántos avisos hay en el país cuando la zona tiene 0
- Severidad: baja · Tipo: ambiguo · Regla: R-30
- Dónde: Alertas.tsx:79
- Propuesta: agregar "(hay 2 en el resto del país)" en el texto de vacío.

Dudas de código: las alertas no tienen acción propia; un aviso real sin consejo no da indicación (R-05). Propuesta: para naranja/roja, línea fija con la acción de la leyenda.

Ya corregido: orden por gravedad; leyenda y nombres de CNE e IMN; aviso sin señal; pie "actualizado hoy a las…"; temperatura de "Ahora"; vacío con nombre de zona.

No pudo revisar: error de red, carga lenta, pronóstico guardado, "Leer el aviso completo", valores extremos, avisos reales.
