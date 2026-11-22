# Informe del investigador de usabilidad — 2026-11-22

No cambié archivos. Leí reglas-interfaz.md, propuestas.md (vacío) y la lista de páginas. No abrí el código de las páginas, así que los puntos "Dónde aplica" son hipótesis por revisar. Las búsquedas dieron resultados irregulares: no encontré material directo de NN/g, ni estudios de usabilidad de Plantix o iShamba. Lo que sigue se apoya solo en las fuentes que sí aparecieron.

## Ideas para TerraFarm

### [INV-01] Resumen de errores arriba del formulario, con enlace a cada campo
- Fuente: [GOV.UK Error summary](https://design-system.service.gov.uk/components/error-summary) y [patrón de validación](https://design-system.service.gov.uk/patterns/validation). Piden explicar qué falló y cómo arreglarlo, y no borrar lo que la persona ya escribió.
- Dónde aplica: NuevaFinca, NuevaSiembra, CerrarSiembra, ReportarPlaga, Registrarse. Al fallar, mostrar arriba "Revise 2 cosas" con una lista. Cada línea es un enlace que lleva al campo, y los datos escritos se conservan.
- Por qué ayuda: en el celular el error puede quedar fuera de pantalla, y perder lo escrito hace que la persona abandone.
- Esfuerzo: medio

### [INV-02] Pantalla "Revise antes de guardar"
- Fuente: [GOV.UK Check answers](https://design-system.service.gov.uk/patterns/check-answers) y [la versión del NHS](https://service-manual.nhs.uk/design-system/patterns/check-answers). Es una lista de respuestas con "Cambiar" en cada una, antes de enviar.
- Dónde aplica: NuevaSiembra, CerrarSiembra y NuevaFinca. Mostrar un resumen en palabras ("Tomate, 2,5 ha, sembrado el 12-11-2026") con un botón "Cambiar" por línea. Esto cumple R-31 y le da una forma concreta.
- Por qué ayuda: evita guardar datos mal escritos que no se pueden deshacer.
- Esfuerzo: medio

### [INV-03] Estado de conexión en palabras de acción, con ícono y texto
- Fuente: [web.dev, guías de UX sin conexión](https://web.dev/articles/offline-ux-design-guidelines). Dice que "offline" lo entiende mal el público no técnico, que conviene usar frases de acción y que no se debe depender solo del color gris.
- Dónde aplica: un aviso fijo y discreto en todas las páginas, y en MiSiembra y MiHistorial. Ejemplos: "Sin señal. Lo que ve es del 20-11. Sus cambios se enviarán cuando tenga señal" y "2 cambios por enviar". En es.ts solo hay unas 4 menciones de "sin señal" u offline, así que probablemente no es sistemático.
- Por qué ayuda: la persona sabe qué está guardado y qué falta enviar (R-34), y no repite el registro por duda.
- Esfuerzo: medio

### [INV-04] Botón "Guardar para usar sin señal" para lo pesado
- Fuente: [web.dev](https://web.dev/articles/offline-ux-design-guidelines). Los datos livianos se guardan solos y los pesados llevan un control explícito. La [guía de sincronización de Google Open Health Stack](https://developers.google.com/open-health-stack/design/offline-sync-guideline) pide que el flujo principal funcione sin conexión y que se muestre el estado de la sincronización.
- Dónde aplica: Zona (mapa y pronóstico de la finca) y Capacitaciones. Un botón "Guardar esta zona para ver sin señal" que diga el peso y la fecha del guardado.
- Por qué ayuda: en la finca suele faltar señal, y así el agricultor decide cuándo gastar datos.
- Esfuerzo: alto

### [INV-05] Alertas de clima: qué pasa, cuándo, cuán grave y qué hacer
- Fuente: [NWS, propuesta de simplificación de alertas](https://www.weather.gov/media/hazardsimplification/Haz%20Simp%20Proposal%20Slides.pdf). El titular empieza por el peligro y su efecto. [WMO sobre CAP](https://wmo.int/node/32877) usa gravedad, urgencia, zona y plazo. Un [capítulo de Springer](https://link.springer.com/chapter/10.1007/978-3-030-98989-7_3) halló que el lenguaje técnico y las zonas confusas causan malas interpretaciones.
- Dónde aplica: Alertas, y los avisos de Inicio y Zona. Formato fijo: "LLUVIA FUERTE: puede inundar su terreno. Jueves 26, de tarde. Qué hacer: cubra el semillero y revise el drenaje". Que la gravedad lleve texto e ícono, no solo color (R-51).
- Por qué ayuda: da una acción concreta y un plazo, y evita alertas ambiguas.
- Esfuerzo: bajo

### [INV-06] Dibujos sencillos y frases cortas para quien lee poco
- Fuente: [GSMA AgriTech UX Design Guidebook (2025)](https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/wp-content/uploads/2025/10/AgriTech-UX-Design-Guidebook.pdf), sobre baja alfabetización digital. [Estudio de PeerJ](https://peerj.com/articles/cs-3150): para quien no lee bien, los dibujos concretos se entienden mejor que los íconos abstractos o las fotos, y el audio en el idioma local ayuda. Un [estudio de 2019 en India](https://doaj.org/article/1234a32ec7ba4e74b72efc829ab92492) midió que el texto de Plantix tiene nivel de bachillerato, demasiado alto para muchos.
- Dónde aplica: Precios y Cultivo. Usar un dibujo del producto (saco, rollo) junto a la unidad, y una flecha con texto para la tendencia ("Subió"). Medir el nivel de lectura de los textos largos de es.ts.
- Por qué ayuda: reduce la carga de lectura y la ambigüedad de las unidades.
- Esfuerzo: medio

### [INV-07] Gráficos con título que diga la conclusión y etiquetas en la línea
- Fuente: [Guía de visualización de datos de la UE, etiquetado directo](https://data.europa.eu/apps/data-visualisation-guide/direct-labelling). Es mejor poner el nombre junto a la línea o barra que usar una leyenda. Un [estudio de Grammel et al.](https://tableau.com/sites/default/files/2023-01/infovis10_grammel.pdf) halló que los no expertos prefieren barras y líneas conocidas.
- Dónde aplica: Precios (tendencia), MiSiembra y Alertas. Título tipo "El precio del tomate subió 8 % esta semana" y la etiqueta del último valor al final de la línea, sin leyenda de colores. Solo barras y líneas.
- Por qué ayuda: la persona lee la conclusión sin interpretar el gráfico, y se evita depender del color (R-51).
- Esfuerzo: bajo

### [INV-08] No pedir dos veces el mismo dato
- Fuente: [W3C, novedades de WCAG 2.2](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/). El criterio 3.3.7 (Entrada redundante) pide no volver a pedir lo ya dado en el mismo proceso. El 3.3.8 (Autenticación accesible) pide que el inicio de sesión no dependa de una prueba de memoria y que permita pegar y usar gestores de contraseñas.
- Dónde aplica: NuevaSiembra y NuevaFinca (si ya dio la finca o el área, no pedirlos otra vez, y precargar la última finca), y Ingresar/Registrarse (permitir pegar la contraseña, `autocomplete` correcto, botón "Mostrar contraseña"). Antes de citar el número exacto de cada criterio, revisar el texto oficial de W3C: las fuentes no coinciden en la numeración.
- Por qué ayuda: escribir con guantes o a la luz del sol es lento, y cada campo repetido cuesta.
- Esfuerzo: bajo

## Reglas propuestas (para pegar en propuestas.md)

## Propuesta: Resumen de errores con enlaces
- Fuente: https://design-system.service.gov.uk/components/error-summary — GOV.UK pone arriba del formulario una lista de errores que enlaza a cada campo.
- Problema que resuelve en TerraFarm: en el celular el error queda fuera de pantalla y el agricultor no sabe qué corregir (NuevaFinca, NuevaSiembra, CerrarSiembra, ReportarPlaga, Registrarse).
- Regla propuesta: Si un formulario falla, aparece arriba un resumen de errores en el que cada línea lleva al campo con el problema, y lo que la persona ya escribió se conserva.
- Esfuerzo: medio

## Propuesta: Resumen antes de guardar
- Fuente: https://design-system.service.gov.uk/patterns/check-answers — GOV.UK muestra las respuestas con un enlace "Cambiar" antes de enviar.
- Problema que resuelve en TerraFarm: guardar una siembra, un cierre o una finca con datos mal escritos que no se pueden deshacer.
- Regla propuesta: Antes de guardar algo que no se puede deshacer, se muestra un resumen en palabras de lo que se va a guardar, con un "Cambiar" junto a cada dato.
- Esfuerzo: medio

## Propuesta: Estado de conexión en palabras de acción
- Fuente: https://web.dev/articles/offline-ux-design-guidelines — recomienda frases de acción en lugar de "offline" y no depender solo del gris.
- Problema que resuelve en TerraFarm: sin señal, el agricultor no sabe si lo que ve es viejo ni si su registro se envió.
- Regla propuesta: Sin señal, un aviso con ícono y texto dice que no hay conexión, de qué fecha son los datos que se ven y cuántos cambios faltan por enviar, sin usar la palabra "offline".
- Esfuerzo: medio

## Propuesta: Aviso de peligro completo
- Fuente: https://www.weather.gov/media/hazardsimplification/Haz%20Simp%20Proposal%20Slides.pdf — el titular empieza por el peligro y su efecto. Con https://wmo.int/node/32877 (CAP: gravedad, urgencia, zona, plazo).
- Problema que resuelve en TerraFarm: alertas de clima que dicen qué pasa pero no cuándo, dónde ni qué hacer (Alertas, Inicio, Zona).
- Regla propuesta: Todo aviso de peligro dice el peligro y su efecto, cuándo ocurre, la gravedad con ícono y texto, y una acción concreta.
- Esfuerzo: bajo

## Propuesta: Gráfico con conclusión en el título
- Fuente: https://data.europa.eu/apps/data-visualisation-guide/direct-labelling — etiquetar directamente en lugar de usar leyenda.
- Problema que resuelve en TerraFarm: gráficos de precios y de la siembra que obligan a interpretar colores y leyendas (Precios, MiSiembra).
- Regla propuesta: Cada gráfico tiene un título que dice la conclusión en una frase, etiqueta el último valor junto a la línea o barra y no necesita una leyenda de colores para entenderse.
- Esfuerzo: bajo

## Propuesta: No pedir lo ya dado
- Fuente: https://w3.org/WAI/standards-guidelines/wcag/new-in-22/ — WCAG 2.2, entrada redundante.
- Problema que resuelve en TerraFarm: repetir finca, área o cultivo al registrar siembras y cierres, y escribir con guantes.
- Regla propuesta: Un dato que el agricultor ya dio en el mismo proceso no se vuelve a pedir; se precarga y se puede cambiar.
- Esfuerzo: bajo

## Propuesta: Inicio de sesión que permite pegar
- Fuente: https://w3.org/WAI/standards-guidelines/wcag/new-in-22/ — WCAG 2.2, autenticación accesible. Verificar el número del criterio en el texto oficial.
- Problema que resuelve en TerraFarm: contraseñas que el agricultor no puede recordar ni pegar (Ingresar, Registrarse).
- Regla propuesta: Los campos de contraseña permiten pegar y usar gestor de contraseñas, y tienen un botón para mostrarla.
- Esfuerzo: bajo

## Propuesta: Leer poco, ver más
- Fuente: https://peerj.com/articles/cs-3150 y la guía GSMA https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/wp-content/uploads/2025/10/AgriTech-UX-Design-Guidebook.pdf — dibujos concretos y frases cortas para quien lee poco.
- Problema que resuelve en TerraFarm: textos largos y unidades abstractas en Precios y Cultivo.
- Regla propuesta: Las frases tienen como máximo unas 20 palabras, y las unidades y productos llevan un dibujo concreto junto al texto.
- Esfuerzo: medio

No pude verificar en esta pasada las referencias a Plantix, iShamba ni los demás nombres de la lista de búsqueda. Si quiere ideas de esas apps, hay que hacer una búsqueda dirigida a cada una.
