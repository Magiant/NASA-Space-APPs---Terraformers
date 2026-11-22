# Reglas de interfaz y usabilidad de TerraFarm

Las leen todos los agentes de revisión (`.claude/agents/`). Cada hallazgo cita la regla que rompe (R-01, R-02…).
Las reglas nuevas que proponga el `investigador-ux` van primero a `propuestas.md` y entran aquí solo cuando el
equipo las aprueba.

## Para quién es la app

Agricultores de Costa Rica, muchos con poca experiencia en tecnología. Usan sobre todo el **celular**, a veces con
mala señal, al sol y con las manos sucias o con guantes. Hablan español de Costa Rica y se les trata de **usted**.
Saben mucho de su cultivo, pero no de satélites, índices ni estadística.

## Lenguaje

- **R-01 · Palabras del campo, no técnicas.** Si aparece pH, mm, NDVI, balance hídrico, índice, °C de promedio o una
  sigla (PIMA, CNP, IMN, CNE, INA), se explica en palabras simples al lado o la primera vez.
  Ejemplo: "Balance +5 mm" → "Le sobra un poco de agua: llovió más de lo que usan las plantas".
- **R-02 · Un mensaje no se contradice.** El título y el detalle dicen lo mismo. No: "Sus plantas están sanas" con
  "21 % del terreno tiene estrés" debajo.
- **R-03 · Cada número dice contra qué se compara.** "Bajó 6 %" → "Bajó 6 % desde ayer". "88/100" → qué es el puntaje.
- **R-04 · Las preguntas siguen a la respuesta anterior.** Si marcó "Se perdió", no se le pregunta "¿Cuánto cosechó?".
- **R-05 · Se dice qué hacer, no solo qué pasa.** Un aviso de riesgo o de error termina con una acción ("Revise las
  parcelas E2 y F3", "Vuelva a intentar cuando tenga señal").
- **R-06 · El mismo nombre para la misma cosa en toda la app** (no "siembra" en un lado y "cultivo" en otro para lo
  mismo; no "Tiempo" en el menú y "Alertas" en la página sin relación).
- **R-07 · Español e inglés completos.** Ningún texto queda en el otro idioma ni como clave (`cerrar.cuanto`).

## Números, fechas y unidades

- **R-10 · Decimales con coma y miles con espacio**, como en Costa Rica: "2,5 ha", "1 435 m", "₡28 000".
- **R-11 · Unidades completas y con "de":** "por saco de 45 kg", "por rollo de 12 manojos".
- **R-12 · Singular y plural correctos:** "1 saco", "1 unidad".
- **R-13 · Fechas en formato día-mes-año** y, cuando ayuda, con palabras ("hoy", "ayer", "en enero").
- **R-14 · El área en la unidad que usó el agricultor** (manzanas, hectáreas o metros), con la equivalencia si hace falta.
- **R-15 · Nunca se ven `undefined`, `NaN`, `null`, `[object Object]`, `${…}` ni claves de traducción.**

## Pantalla (responsive)

- **R-20 · Nada se sale de la pantalla** de 320 px a 1920 px: sin desplazamiento de lado, salvo tablas y gráficos
  dentro de su propia caja.
- **R-21 · Las palabras no se parten a la mitad** ("Excelent / e"). Si no caben, se achica la letra o se acomoda la tarjeta.
- **R-22 · Botones y campos de al menos 44 × 44 px en el celular** (mínimo absoluto: 24 px, WCAG 2.5.8).
- **R-23 · Lo fijo no tapa lo importante.** El botón flotante y las pestañas de abajo no tapan botones ni campos.
- **R-24 · La acción principal se alcanza con el pulgar** y está a la vista sin buscarla.
- **R-25 · Funciona en los dos temas** (claro y oscuro) con buen contraste: texto normal 4,5 : 1, texto grande 3 : 1.
- **R-26 · La app de Android y la web se ven igual** (la app es la misma web dentro de un WebView, sin botón flotante).

## Interacción

- **R-30 · Lo que parece un filtro, filtra; lo que parece un enlace, lleva a otra página.** Si se toca algo, el
  resultado es el que el agricultor espera.
- **R-31 · Lo que no se puede deshacer se confirma** con una ventana que dice qué se va a guardar.
- **R-32 · Los errores de un formulario dicen qué campo revisar y cómo**, y el cursor queda en ese campo.
- **R-33 · Nada se pierde sin avisar:** salir con cambios sin guardar pregunta antes.
- **R-34 · Sin señal, la app sigue sirviendo** y dice claramente qué está guardado y qué falta enviar.
- **R-35 · Las acciones que piden cuenta lo dicen antes de tocarlas** ("Necesita cuenta"), no después.

## Datos y confianza

- **R-40 · Cada dato dice de dónde sale y de cuándo es** (fuente y fecha de actualización).
- **R-41 · Si un dato es viejo o falta, se dice**, en vez de mostrar algo que parece de hoy.
- **R-42 · Las recomendaciones explican por qué** (clima, suelo, precio, rotación) y no prometen resultados.
- **R-43 · Lo que dice una parte de la app no contradice otra** (por ejemplo, recomendar tomate cuando la tabla de
  vecinos muestra que ya hay mucho tomate sembrado, sin avisarlo).

## Accesibilidad

- **R-50 · Todo campo tiene etiqueta visible**; toda imagen con contenido tiene descripción (`alt`).
- **R-51 · El color no es la única señal:** nivel, tendencia y estado llevan también ícono o texto.
- **R-52 · Se puede usar con teclado y lector de pantalla** (foco visible, orden lógico, ventanas modales de verdad).

## Seguridad y privacidad

- **R-60 · La ubicación exacta de la finca y los datos de la persona no se muestran a otros.**
- **R-61 · Ninguna clave secreta en la web** (solo la clave pública de Supabase; lo demás, protegido por RLS).
- **R-62 · Los enlaces a otros sitios abren aparte con `rel="noreferrer"`**; no se inserta HTML sin limpiar
  (`dangerouslySetInnerHTML`).
- **R-63 · Los mensajes de error no muestran detalles internos** (consultas, rutas del servidor, trazas).

---

## Cómo se reporta un hallazgo

```
### [CODIGO-NN] Título corto
- Severidad: crítica | alta | media | baja
- Tipo: error | ambiguo | responsive | accesibilidad | seguridad | datos | consistencia
- Regla: R-xx
- Dónde: #/ruta, ancho 360 px, tema claro · web/src/archivo.tsx:línea
- Qué ve el agricultor: lo que aparece en pantalla, con el texto exacto entre comillas
- Por qué confunde o falla: en una o dos frases
- Propuesta: el texto nuevo exacto o el cambio concreto
- Evidencia: ruta de la captura (.png) o del texto (.txt)
```

**Severidad:**
- **Crítica:** rompe una tarea, muestra datos falsos, pierde datos o expone información privada.
- **Alta:** confunde al agricultor en una tarea principal (elegir cultivo, ver precios, registrar su siembra).
- **Media:** se entiende con esfuerzo, o falla en un ancho o tema poco usado.
- **Baja:** detalle de forma o de consistencia.

## Cómo se revisa

1. Leer estas reglas.
2. Mirar las páginas con `node .claude/herramientas/capturar.mjs --rutas=… [--entrar]` (la web debe estar en modo
   demo en el puerto 5199). Abrir los `.png` con Read y leer `reporte.json` y los `.txt`.
3. Leer el código de las páginas y de los textos (`web/src/idiomas/es.ts` y `en.ts`) para encontrar la causa y
   los casos que no se ven en la demo (sin datos, error de red, sin cuenta, valores extremos, en inglés).
4. Reportar solo lo comprobado. Si algo es una duda, decirlo como duda. **No cambiar archivos.**
