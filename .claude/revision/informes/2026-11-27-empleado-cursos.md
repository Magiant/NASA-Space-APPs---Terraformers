# empleado-cursos · 2026-11-27 (#/capacitaciones)

Capturas 360/390/768/1280 es crema; 360 y 1280 en azul. Leyó Capacitaciones.tsx, logica/cursos.ts, textos cursos en es.ts y en.ts. Carpeta: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-27-23-22. A 1280 px "toque-chico" solo en el pie.

### [CUR-01] "Granos básicos: frijol y maíz" aparece "Para: Arroz"
- Severidad: media · Tipo: datos · Regla: R-43
- Dónde: web/src/logica/cursos.ts:17
- Qué ve: "Para: Frijol · Maíz · Arroz"; en inglés "For: Bean · Corn · Rice".
- Por qué falla: el patrón granos b[aá]sicos agrega arroz. Ya estaba en 2026-11-22-r2 (CUR-02) y no está corregido.
- Propuesta: quitar 'arroz' de ese patrón.

### [CUR-02] No hay forma de saber cómo inscribirse
- Severidad: media · Tipo: ambiguo · Regla: R-05
- Dónde: Capacitaciones.tsx:142 y es.ts:523
- Qué ve: "Ver el curso en la página del INA ↗" sin decir cómo inscribirse.
- Propuesta: línea "Para inscribirse, entre a la página del curso y siga las instrucciones del INA." Ya estaba (CUR-03 anterior), a medias.

### [CUR-03] Curso sin URL válida deja un botón que no hace nada
- Severidad: media · Tipo: error · Regla: R-30
- Dónde: Capacitaciones.tsx:142. Si c.url vacío o no empieza con http, el <a> queda sin href pero con aspecto de botón. Solo código.
- Propuesta: no mostrar el botón, o texto "Pida más información en el INA."

### [CUR-04] La flecha "↗" queda sola en una segunda línea del botón
- Severidad: baja · Tipo: responsive · Regla: R-21
- Dónde: Capacitaciones.tsx:143; 1280 px en inglés.
- Propuesta: unir con espacio no separable (\u00A0↗) o span que no se parta.

### [CUR-05] "Recomendados" sin conteo ni invitación a elegir zona
- Severidad: baja · Tipo: ambiguo · Regla: R-42
- Dónde: Capacitaciones.tsx:70-76
- Propuesta: conteo en "Recomendados"; sin zona, "Elija su zona en Sembrar para ver solo los cultivos que se dan bien donde usted está." Ya estaba (CUR-07).

### [CUR-06] En "Todos los meses" el filtro "Lo que siembro" sigue activo sin aviso
- Severidad: baja · Tipo: ambiguo · Regla: R-30
- Dónde: Capacitaciones.tsx:27-29, 78-91. Solo código.
- Propuesta: "Mostrando los cursos para: Tomate. Quitar el filtro". Ya estaba (CUR-08).

### [CUR-07] Modalidad desconocida sin respaldo
- Severidad: baja · Tipo: error · Regla: R-15
- Dónde: Capacitaciones.tsx:134, es.ts:524. Si la modalidad no es presencial/virtual/mixta, la línea queda " · 40 horas".
- Propuesta: tc.modalidad[c.modalidad] ?? c.modalidad.

Sin problemas: chips filtran; sin desbordes en ningún ancho; inglés traducido; singular resuelto; tema azul legible; INA explicado; rel=noreferrer y target=_blank.

No pudo revisar: carga lenta, error de red, lista vacía, títulos largos, horas 0; no abrió los enlaces del INA.
