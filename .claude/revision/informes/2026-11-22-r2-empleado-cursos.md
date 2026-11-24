# Segunda pasada de empleado-cursos — 2026-11-22

Segunda pasada de Cursos para el agricultor (#/capacitaciones). Revisé las capturas a 360 y 1280 px en español y a 360 px en inglés con tema azul. Las carpetas están en C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-22-53. También leí de nuevo web/src/paginas/publicas/Capacitaciones.tsx, web/src/logica/cursos.ts y es.ts. El reporte automático sale "sin problemas automáticos" en las dos pasadas, y eso incluye lo que antes marcó `toque-chico`.

## Estado de los hallazgos anteriores

- **CUR-01 (temas en español en la versión en inglés): arreglado.** En la captura en inglés el selector muestra Pests, Production, Water, Soil y Market, y la etiqueta de la tarjeta dice "PESTS" y "PRODUCTION". El código usa `traducirDato` (Capacitaciones.tsx:108 y :131) con la tabla de en.ts:876. El filtro sigue usando el valor original.
  - **Queda una parte:** el tipo (lo que va después de " · " en el tema) se muestra sin traducir (Capacitaciones.tsx:134, `{tipo}`). No lo vi en pantalla, porque en la demo estas tarjetas no mostraban ningún tipo.
  - Los títulos de los cursos siguen en español, y eso es esperable.
- **CUR-02 ("Granos básicos: frijol y maíz" aparece "Para: Arroz"): sigue igual.** La captura en inglés dice "For: Bean · Corn · Rice". cursos.ts:17 conserva el patrón `granos b[aá]sicos`, que añade arroz aunque el título nombre solo frijol y maíz.
- **CUR-03 (INA sin explicar): arreglado a medias.**
  - El subtítulo ahora dice "Cursos del INA (Instituto Nacional de Aprendizaje) y otras instituciones. Filtre por lo que siembra."
  - El botón dice "Ver el curso en la página del INA ↗", así que ya se entiende que abre otra página.
  - Sigue sin haber ninguna indicación de cómo inscribirse, ni de si el curso es gratis o qué requisitos tiene. El botón dice "ver" y no "inscribirse".
- **CUR-04 (sin cursos, sin acción): arreglado.** Hay un botón "Quitar los filtros" que aparece en las dos vistas cuando hay cultivo o tema elegido (Capacitaciones.tsx:120). El texto sigue sin decir qué quitar, pero el botón lo resuelve. Lo confirmé solo en el código, porque la demo siempre trae cursos.
- **CUR-05 (plural "1 cursos", "1 horas"): arreglado.** es.ts:514 y :521 ya manejan el singular. Solo lo confirmé en el código; en.ts no lo volví a abrir.
- **CUR-06 (provincias vacías, horas faltantes): arreglado a medias.** Las horas y el tipo ahora se omiten cuando faltan (Capacitaciones.tsx:134). Pero la línea de provincias sigue mostrando el ícono sin texto si `provincias` viene vacío (:135). Tampoco hay un respaldo si la modalidad no está en la tabla.
- **CUR-07 ("Recomendados" frente a "Todos los meses"): sigue igual en lo esencial.** No hay conteo en "Recomendados" y no se invita a elegir la zona. Mejoró que el texto "Toque un cultivo para ver solo sus cursos; tóquelo otra vez para ver todos" explica los chips.
- **CUR-08 (el filtro cambia sin aviso al pasar a "Todos los meses"): sigue igual.** Lo que ya funcionaba también sigue igual: el chip de cultivo se apaga al cambiar de vista, pero el filtro del menú se mantiene, y eso no se avisa.
- **CUR-09 (zonas táctiles chicas): arreglado.** El reporte ya no marca `toque-chico` en capacitaciones.

## Problemas nuevos

- **CUR-10 (baja, ambiguo, R-01): dos líneas casi iguales en la lista de recomendados.** Un curso de riego recomendado por la época muestra "Para la época seca" como dato de la tarjeta. Además, el recuadro de arriba repite "Época seca: también se recomiendan los cursos de riego". No es un error. Solo conviene dejar una de las dos si la pantalla se ve cargada en 360 px.
- No encontré problemas nuevos de desborde ni de texto partido en las capturas de 360 y 1280 px.

## Sin problemas
- Las capturas a 360 y 1280 px en español no tienen desbordes.
- El tema azul en inglés se lee bien.
- El texto de modalidad, horas, provincias, cultivos y plaga se muestra completo y en inglés (por ejemplo "In person · 40 hours" y "Helps with: Fall armyworm").
- Los chips de cultivo recomendados filtran y se quitan tocándolos otra vez.

## No pude revisar
- Carga lenta, error de red, listas vacías con filtros, nombres de curso muy largos, provincias vacías y el singular "1 curso", porque la demo siempre trae 8 cursos. Eso lo leí solo en el código.
- No abrí "Ver el curso en la página del INA" para comprobar que las URL de la demo son reales.
- No revisé 390 ni 768 px esta vez.
