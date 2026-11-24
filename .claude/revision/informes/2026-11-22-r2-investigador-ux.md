# Segunda pasada del investigador de usabilidad — 2026-11-22

No cambié archivos. Hice búsquedas dirigidas y comprobé cada idea contra el código antes de proponerla. Las fuentes de Plantix, iShamba, Hello Tractor y las apps del MAG o INTA dieron poco material directo. Dos páginas (GSMA, Plantix y la guía de UX) devolvieron error 403. Un PDF de Microsoft Research no se pudo leer. Solo uso lo que sí leí. No encontré nada publicado sobre iShamba, Hello Tractor ni apps del MAG o INTA. Lo que sí aparece son estudios de otras apps y de otros países sobre baja alfabetización. Por eso las ideas vienen de ahí y no de esas apps.

No repito lo ya recomendado (R-36, R-44, R-45, R-53, R-46, R-64) ni las cuatro descartadas.

### Comprobado en el código: ya se cumple, no propongo
- Contraseña: `autoComplete` correcto y botón "Mostrar" (`Ingresar.tsx:110`, `NuevaClave.tsx:53`, `Registrarse.tsx:164`).
- Teclado correcto en los números: `inputMode="decimal"` en `CampoArea.tsx:47` y `CerrarSiembra.tsx:92`.
- Elegir el tipo de daño con dibujos grandes: `ReportarPlaga.tsx:170-177` ya usa íconos de 36 px con texto.
- La foto no usa `capture`, para dejar elegir cámara o galería (comentario en `ReportarPlaga.tsx:213`). Está bien.

### Comprobado en el código: no existe todavía
- Ayuda para sacar la foto. El único texto que acompaña a la foto es `tp.fotoNoSeEnvia` (`es.ts:762`).
- Lectura en voz alta. No hay `speechSynthesis` en `web/src`.
- Compartir o copiar. Hay 0 coincidencias de "compartir", "WhatsApp" o "copiar" en `web/src`.
- Una salida a una persona. Los únicos "técnicos del MAG" aparecen como aviso legal (`es.ts:46` y `es.ts:311`), sin forma de contactarlos.

## Ideas para TerraFarm

### [INV-09] Consejos cortos para sacar la foto de la plaga
- Fuente: [extensión de Cornell, guía de fotos para diagnóstico](https://rvpadmin.cce.cornell.edu/pdf/resource/pdf67_pdf.pdf) y [NC State Extension](https://mcdowell.ces.ncsu.edu/2021/06/taking-photos-for-disease-diagnosis-insect-identification). Piden tres tomas (la planta entera, la parte con síntomas y un primer plano), luz de día, tocar la pantalla para enfocar y fotografiar el haz y el envés de la hoja. Un resumen no oficial de [Plantix](https://www.positioniseverything.net/how-to-use-ai-crop-advisory-apps-to-detect-diseases-and-improve-yields-in-india/) dice lo mismo y recomienda limpiar el lente. No encontré la guía oficial de Plantix.
- Dónde aplica: ReportarPlaga, junto al botón "Tomar o subir una foto". Una línea de ayuda con tres dibujos o frases: "1. La planta entera. 2. La hoja o fruto dañado de cerca. 3. Con luz del día; toque la pantalla para enfocar". Hoy solo dice que la foto no se envía.
- Por qué ayuda: la foto es lo que más pesa para que el técnico entienda el daño, y la causa más común de mala foto es el enfoque.
- Esfuerzo: bajo

### [INV-10] Botón "Escuchar" en los avisos y recomendaciones clave
- Fuente: [FiBL, estudio en Kenia, Ruanda y Malí](https://www.fibl.org/en/info-centre/news/making-digital-training-and-advisory-services-work-for-smallholder-farmers-in-africa). Las herramientas de voz funcionan mejor para quien lee poco o ve mal, y en Ruanda el audio por teléfono tuvo más uso que el SMS. Una [app para agricultores con alfabetización mixta](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/KrishiPustak_cameraready_final_final.pdf) mostraba texto, números e íconos y leía todo en voz alta con una pulsación larga. Según el resumen de la búsqueda, todos los agricultores usaron esa lectura para confirmar los números. No pude abrir el PDF para verificarlo yo mismo.
- Dónde aplica: Alertas (cada aviso), el resultado de recomendación de cultivo en Cultivo y los precios en Precios. Un botón "Escuchar" que use la voz del teléfono (`speechSynthesis`, que no cuesta datos). Debe leer el mismo texto que se ve, con unidades en palabras ("veintiocho mil colones por saco").
- Por qué ayuda: sirve a quien lee poco, a quien tiene las manos ocupadas y a quien tiene el sol en la pantalla.
- Esfuerzo: medio. Hay que probar que las voces en español de los teléfonos Android lean bien los números y las unidades.

### [INV-11] Compartir un aviso o un precio por WhatsApp o copiarlo
- Fuente: la [nota de la búsqueda sobre Plantix](https://monitor.co.ug/uganda/magazines/farming/plantix-the-agronomist-mobile-app-changing-farmers-fortunes-4354932) cuenta que quien no tiene la app manda fotos del cultivo por WhatsApp para recibir un diagnóstico. [FiBL](https://www.fibl.org/en/info-centre/news/making-digital-training-and-advisory-services-work-for-smallholder-farmers-in-africa) recomienda diseñar para el intercambio entre vecinos y no solo para el uso individual.
- Dónde aplica: Alertas y Precios. Un botón "Enviar a un vecino" que use `navigator.share` y, si el teléfono no lo tiene, copie el texto. El texto debe incluir la fuente y la fecha (R-40).
- Por qué ayuda: los agricultores se pasan los avisos y los precios entre ellos, y hoy tienen que escribirlos a mano.
- Esfuerzo: bajo

### [INV-12] Salida a una persona cuando la app no alcanza
- Fuente: [FiBL](https://www.fibl.org/en/info-centre/news/making-digital-training-and-advisory-services-work-for-smallholder-farmers-in-africa). Los cursos digitales funcionan mejor si llevan a la persona a más apoyo por teléfono, y los mensajes de desconocidos se ven como spam, así que sirve apoyarse en organizaciones de confianza. Un [informe de Digital Green en arXiv](https://arxiv.org/pdf/2601.11537) basa su estrategia en agentes de extensión que entrenan a los demás.
- Dónde aplica: ReportarPlaga (después de enviar), Cultivo y Alertas. Un bloque "¿Necesita hablar con alguien?" con un enlace `tel:` a la oficina del MAG de su región. Hay que confirmar con el equipo cuál es el contacto real, porque no lo inventé. Hoy el MAG aparece solo en el aviso legal.
- Por qué ayuda: el aviso dice que los técnicos del MAG son lo más importante, pero no da cómo llegar a ellos.
- Esfuerzo: bajo si hay un número, medio si hay que armar un directorio por zona.

### [INV-13] Una sola columna y lenguaje de sexto grado en las pantallas de decisión
- Fuente: [Nielsen Norman Group, "Writing for lower-literacy users"](https://www.nngroup.com/articles/writing-for-lower-literacy-users/) y el [Alertbox de 2005](https://www.nngroup.com/alertbox/20050314.html). Según el resumen de la búsqueda, recomiendan una sola columna principal, nivel de lectura de sexto grado en las secciones importantes, navegación simple y búsqueda tolerante a errores de ortografía. Su estudio halló que quienes leen bien también se benefician.
- Dónde aplica: Cultivo, Precios y Zona. Revisar que en el celular el contenido principal vaya en una columna, sin tarjetas lado a lado que obliguen a buscar. Revisar también si la búsqueda de cultivo (Algolia, `web/src/servicios/algolia.ts`) tolera "tomte" o "frijoles" por "frijol". No lo comprobé en el código.
- Por qué ayuda: reduce el esfuerzo de leer en pantalla chica y con poca experiencia digital.
- Esfuerzo: bajo para revisar, medio para corregir.

### [INV-14] Hacer un solo paso por pantalla en los formularios largos y decir en qué paso va
- Fuente: [GOV.UK, "Question pages"](https://design-system.service.gov.uk/patterns/question-pages/). Recomienda una pregunta por página en los trámites. No lo abrí en esta pasada. Lo traigo con baja confianza. FiBL también pide pensar qué vivió la persona antes de cada paso y qué hará después.
- Dónde aplica: NuevaSiembra y CerrarSiembra. Mostrar "Paso 2 de 4" y una pregunta clara por pantalla. Antes de proponerlo como regla, verificar cuántos campos tiene hoy cada formulario. El supremo ya notó que son de 1 a 4 campos, así que puede no hacer falta.
- Por qué ayuda: en el celular una pregunta por pantalla se contesta con menos error.
- Esfuerzo: alto
- Valoración: dudosa. La incluyo para que la descarte o la confirme el supremo.

## Reglas propuestas (para pegar en propuestas.md)

## Propuesta: Ayuda para sacar la foto
- Fuente: https://rvpadmin.cce.cornell.edu/pdf/resource/pdf67_pdf.pdf — la guía de Cornell pide planta entera, síntoma de cerca, luz de día y enfocar tocando la pantalla.
- Problema que resuelve en TerraFarm: el agricultor sube una foto borrosa o muy lejana y el técnico no puede ver el daño (ReportarPlaga).
- Regla propuesta: Junto a todo botón para subir una foto de un problema hay una ayuda de tres frases o dibujos que dice qué fotografiar (planta entera y daño de cerca) y cómo (luz de día, enfocar).
- Esfuerzo: bajo

## Propuesta: Escuchar en voz alta
- Fuente: https://www.fibl.org/en/info-centre/news/making-digital-training-and-advisory-services-work-for-smallholder-farmers-in-africa — las herramientas de voz son las que mejor funcionan para quien lee poco.
- Problema que resuelve en TerraFarm: avisos de clima, recomendaciones y precios que dependen de leer texto en pantalla pequeña, con sol o con las manos ocupadas (Alertas, Cultivo, Precios).
- Regla propuesta: Los avisos de peligro, las recomendaciones de cultivo y los precios tienen un botón "Escuchar" que lee el mismo texto que se ve, con las unidades dichas en palabras.
- Esfuerzo: medio

## Propuesta: Compartir con un vecino
- Fuente: https://www.fibl.org/en/info-centre/news/making-digital-training-and-advisory-services-work-for-smallholder-farmers-in-africa — pide diseñar para el intercambio entre agricultores.
- Problema que resuelve en TerraFarm: un aviso o un precio útil solo se puede pasar a otro agricultor copiándolo a mano (Alertas, Precios).
- Regla propuesta: Cada aviso de peligro y cada precio se puede compartir o copiar con un toque, y el texto compartido lleva la fuente y la fecha.
- Esfuerzo: bajo

## Propuesta: Salida a una persona
- Fuente: https://www.fibl.org/en/info-centre/news/making-digital-training-and-advisory-services-work-for-smallholder-farmers-in-africa — el apoyo digital funciona mejor si lleva a la persona a apoyo humano por teléfono.
- Problema que resuelve en TerraFarm: la app dice que los técnicos del MAG son lo más importante, pero no da cómo contactarlos (Cultivo, Alertas, ReportarPlaga).
- Regla propuesta: Las pantallas de riesgo, de plaga y de recomendación dicen a quién llamar o visitar cuando la persona necesita ayuda, con un enlace para llamar desde el celular.
- Esfuerzo: bajo si hay un número, medio si hay que armar un directorio por zona.

## Propuesta: Una columna en el celular
- Fuente: https://www.nngroup.com/articles/writing-for-lower-literacy-users/ — Nielsen Norman Group recomienda una sola columna principal y navegación simple para quien lee poco.
- Problema que resuelve en TerraFarm: en el celular, tarjetas o datos lado a lado que obligan a buscar dónde mirar (Cultivo, Precios, Zona).
- Regla propuesta: En el celular el contenido principal de cada página va en una sola columna, y no hay dos bloques de información importante lado a lado.
- Esfuerzo: bajo

Para quien decida: INV-09, INV-11 y INV-12 son las más baratas. La INV-10 es la que más puede aportar a quien lee poco, pero hay que probarla en teléfonos reales. Dejé la INV-14 como duda y no la convertí en regla.
