# Informe de empleado-cursos — 2026-11-22

Revisión de Cursos para el agricultor (#/capacitaciones). Revisé las capturas a 360, 390, 768 y 1280 px en tema crema y español, más 360 px en tema azul e inglés. También leí Capacitaciones.tsx, cursos.ts y los textos de es.ts y en.ts. Carpetas con las capturas: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-21-32 (es) y ...\2026-11-22-21-33 (en, azul).

### [CUR-01] Los temas de los cursos y las etiquetas quedan en español en la versión en inglés
- Severidad: alta
- Tipo: error
- Regla: R-07
- Dónde: #/capacitaciones, idioma en, 360 px, tema azul · web/src/paginas/publicas/Capacitaciones.tsx:105 y :126 (los temas vienen de `c.tema`, sin pasar por traducción)
- Qué ve el agricultor: con la interfaz en inglés, el selector "Topic" ofrece "Plagas" y "Producción", y las tarjetas muestran la etiqueta "PLAGAS" y "PRODUCCIÓN". El texto del tipo, que sale de `tipo` (la parte después de " · "), también va sin traducir. Los títulos de los cursos también están en español (esto es esperable, porque son de la fuente).
- Por qué confunde o falla: la página mezcla los dos idiomas. El filtro por tema usa el texto crudo de la base de datos.
- Propuesta: traducir las áreas con una tabla en es.ts y en.ts (por ejemplo `cursos.areas: { Plagas: 'Pests', Producción: 'Production', Agua: 'Water', Suelo: 'Soil', Mercado: 'Market' }`). Mostrar ese nombre en el selector y en la etiqueta, y seguir filtrando por el valor original.
- Evidencia: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-21-33\capacitaciones-360-1.png y capacitaciones-360.txt

### [CUR-02] El curso "Granos básicos: frijol y maíz" aparece también "Para: Arroz"
- Severidad: media
- Tipo: datos
- Regla: R-42, R-43
- Dónde: #/capacitaciones, todos los anchos · web/src/logica/cursos.ts:17
- Qué ve el agricultor: la tarjeta dice "Para: Frijol · Maíz · Arroz". El título solo menciona frijol y maíz. Con "Lo que siembro: Arroz" se ve ese curso como si fuera de arroz.
- Por qué confunde o falla: la expresión `/granos b[aá]sicos/` añade los tres cultivos aunque el título nombre solo dos. La lista de cultivos es una deducción del título y se muestra como si fuera un dato confirmado.
- Propuesta: no aplicar `granos básicos` si el título ya nombra cultivos concretos. Si no se quiere cambiar la lógica, dudar de este dato y avisarlo como "Para (según el título)".
- Evidencia: capacitaciones-360.txt, línea "Para: Frijol · Maíz · Arroz"

### [CUR-03] "INA" es una sigla sin explicar, y no se dice qué pasa al tocar "Ver en INA ↗"
- Severidad: media
- Tipo: ambiguo
- Regla: R-01, R-35
- Dónde: #/capacitaciones, todos los anchos · web/src/idiomas/es.ts:465 y :472 · Capacitaciones.tsx:135
- Qué ve el agricultor: el subtítulo dice "Capacitaciones del INA y otras instituciones" y cada tarjeta termina con "Ver en INA ↗". No aparece nada que diga qué es el INA ni cómo inscribirse. El botón no explica que abre otro sitio.
- Por qué confunde o falla: la tarea del agricultor es inscribirse y la página solo lo manda al sitio del INA, sin dar teléfono, requisitos ni indicar si el curso es gratis. En el inicio sí dice "Cursos gratuitos del INA", pero aquí no.
- Propuesta: subtítulo "Cursos gratuitos del Instituto Nacional de Aprendizaje (INA). Filtre por lo que siembra." y un texto de ayuda bajo la lista: "Para inscribirse, toque 'Ver en INA': se abre la página del curso en el sitio del INA." Cambiar el botón a "Ver el curso e inscribirse en el INA ↗".
- Evidencia: capacitaciones-360-0.png y capacitaciones-360-1.png

### [CUR-04] La lista no aclara qué falta ni qué hacer cuando hay pocos o ningún curso con los filtros, y no se indica cuál filtro quitar
- Severidad: media
- Tipo: ambiguo
- Regla: R-05
- Dónde: Capacitaciones.tsx:112-117 · es.ts:487-488
- Qué ve el agricultor: "No hay cursos con estos filtros." (vista "Todos los meses") o "No hay cursos para los cultivos de estos meses con estos filtros." más el botón "Ver todos los meses". En "Todos los meses" no hay ninguna acción, y en las dos vistas no se dice cuál filtro cambiar.
- Por qué confunde o falla: el mensaje no termina con una acción en "Todos los meses". El agricultor debe adivinar qué combinación de "Lo que siembro" y "Tema" quitar. Esto lo deduje del código, no lo vi en pantalla porque la demo siempre trae cursos.
- Propuesta: añadir un botón "Quitar los filtros" que ponga `cultivo` y `tema` en '' (en las dos vistas), y el texto "No hay cursos con estos filtros. Quite alguno para ver más cursos."
- Evidencia: solo código.

### [CUR-05] Plural incorrecto: "1 cursos", "1 horas"
- Severidad: baja
- Tipo: consistencia
- Regla: R-12
- Dónde: es.ts:477 (`nCursos`), es.ts:470 (`horas`), y Capacitaciones.tsx:129 · en.ts:462
- Qué ve el agricultor: si hay un solo curso, la pestaña dice "1 cursos". Si un curso dura una hora, dice "1 horas". En inglés, "1 courses" y "1 hours". Es un caso que la demo no muestra (hoy hay 8 cursos).
- Propuesta: `nCursos: (n) => n === 1 ? '1 curso' : `${n} cursos``, y lo mismo para horas ("1 hora").
- Evidencia: solo código.

### [CUR-06] Las provincias salen vacías si un curso no trae ninguna, y no se muestra nada para modalidad o duración inválidas
- Severidad: baja
- Tipo: error
- Regla: R-15, R-41
- Dónde: Capacitaciones.tsx:129-130
- Qué ve el agricultor: con `provincias` vacío se mostraría el ícono de ubicación sin texto. Si `duracion_horas` falta, saldría "undefined horas"; si la modalidad no está en la tabla, no sale nada. No lo vi en pantalla; lo leí en el código y no sé si la fuente real trae estos casos.
- Propuesta: ocultar cada línea cuando falte su dato, o mostrar "Provincias: consulte en el INA" y "Duración: consulte en el INA".
- Evidencia: solo código.

### [CUR-07] La explicación de "Recomendados" frente a "Todos los meses" es poco clara y no se dice cómo mejorarla
- Severidad: baja
- Tipo: ambiguo
- Regla: R-01, R-42
- Dónde: #/capacitaciones, 360 px · Capacitaciones.tsx:66-90
- Qué ve el agricultor: la pestaña "Recomendados" lleva el texto pequeño "noviembre a enero" y "Todos los meses" lleva "8 cursos". No dice que los recomendados son una selección: 4 de 8 en la captura, aunque no se ve el número. El texto "Cultivos que se siembran de noviembre a enero:" tampoco explica que el criterio es el calendario de siembra. Si no ha elegido su zona, no se le invita a elegirla, y la zona afina la lista según el código (líneas 29-36).
- Propuesta: debajo de la lista de cultivos, "Elija su zona en Sembrar para ver solo los cultivos que se dan bien ahí." cuando no haya zona. En la pestaña, "Recomendados: 4 cursos".
- Evidencia: capacitaciones-360-0.png

### [CUR-08] El filtro "Lo que siembro" cambia sin aviso al pasar de "Recomendados" a "Todos los meses"
- Severidad: baja
- Tipo: ambiguo
- Regla: R-30
- Dónde: Capacitaciones.tsx:24-26, 82, 96
- Qué ve el agricultor: al tocar un cultivo en "Recomendados" y pasar a "Todos los meses", el filtro sigue activo en el menú "Lo que siembro", pero el chip desaparece. Es coherente, pero el agricultor puede no darse cuenta de por qué ve pocos cursos. Es una duda: no probé la interacción, solo lo leí en el código.
- Propuesta: mostrar, sobre la lista, "Mostrando cursos para: Tomate [Quitar]".
- Evidencia: solo código.

### [CUR-09] Botones y enlaces menores de 40 px (reporte automático)
- Severidad: baja
- Tipo: responsive
- Regla: R-22
- Dónde: #/capacitaciones, 360, 390, 768 y 1280 px · la marca del encabezado y los enlaces del pie ("Inicio", "Cursos"… de 22 px de alto)
- Qué ve el agricultor: el reporte marcó `toque-chico` en las cuatro capturas. En las capturas de 360 px los controles propios de la página (chips, selectores, botón "Ver en INA") se ven grandes. Lo marcado es el pie y la marca, que son comunes a todas las páginas, no solo de esta.
- Propuesta: dar al menos 44 px de alto a los enlaces del pie (relleno vertical).
- Evidencia: capacitaciones-360-1.png y reporte.json

Sin problemas: a 360, 390, 768 y 1280 px no vi desbordes ni palabras partidas en la página; el tema azul se ve legible; el enlace externo usa `target="_blank" rel="noreferrer"`; la ficha de cada curso muestra modalidad, horas, provincias, cultivos y plaga; los chips de cultivos recomendados filtran y se pueden quitar tocándolos otra vez.

No pude revisar: carga lenta, error de red (solo leí que `ErrorCarga` muestra `cursos.error` tal cual, sin saber qué texto trae), nombres de curso muy largos, listas vacías y zona elegida, porque la demo siempre trae 8 cursos y no tenía forma de simularlos. Tampoco abrí el enlace "Ver en INA" (no sé si las URL de la demo son reales). Las capturas a 768 y 1280 px en tema azul e inglés no las revisé.
