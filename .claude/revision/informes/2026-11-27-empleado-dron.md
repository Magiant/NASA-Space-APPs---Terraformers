# empleado-dron · 2026-11-27 (#/dron)

Capturas 360/390/768/1280 crema es, y 360 azul en (sobrescribió la de 360 es) en C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-27-23-22. Ya corregidos del 22-11: título contradictorio, comas decimales, explicación de pendiente y leyenda, "hace N días", error de red con "Intentar de nuevo".

### [DRO-01] El botón flotante "Reportar una plaga" tapa texto del dron
- Severidad: media · Tipo: responsive · Regla: R-23
- Dónde: #/dron, 360 px · shell de la app
- Qué ve: tapa "stressed plants" del resumen, el final de "Relieve aproximado… exagerado ×2" y queda junto a "Qué hacer". La página ya tiene su botón "Si ve bichos o manchas, reporte una plaga".
- Propuesta: ocultar el flotante en /dron o dejar espacio inferior.

### [DRO-02] El mapa 3D es demasiado chico para el dedo en celular
- Severidad: media · Tipo: responsive · Regla: R-22
- Dónde: EscaneoDron.tsx:296, MapaFinca3D.tsx:103
- Qué ve: dibujo de ~280×130 px con 48 parcelas (~25×12 px cada una). El zoom solo aparece con más de 120 parcelas.
- Propuesta: en pantallas ≤ 480 px abrir en "Plano" por defecto, o zoom siempre en celular.

### [DRO-03] "En el celular, toque «Plano»" sale también en pantallas grandes
- Severidad: baja · Tipo: ambiguo · Regla: R-01
- Dónde: EscaneoDron.tsx:296 (condición solo modo === '3d')
- Propuesta: mostrarlo solo en pantallas angostas.

### [DRO-04] La pendiente tiene dos niveles, no tres
- Severidad: baja · Tipo: ambiguo · Regla: R-01
- Dónde: EscaneoDron.tsx:262, es.ts:826-827. 25 % dice "Suave".
- Propuesta: añadir "Moderada" entre 15 % y 30 %.

### [DRO-05] "Qué hacer" mezcla acciones y trae la cita legal dentro de la lista
- Severidad: baja · Tipo: ambiguo · Regla: R-05
- Dónde: es.ts:856. "y 2 más" no dice cuáles; viñeta de ~6 líneas con Ley Forestal 7575.
- Propuesta: frase corta "11 parcelas con borde azul están junto a un río: no corte árboles ni siembre allí"; la ley en el detalle.

### [DRO-06] "Exagerado ×2" y "pendiente medida por el dron" son jerga
- Severidad: baja · Tipo: ambiguo · Regla: R-01
- Dónde: es.ts:858-859
- Propuesta: "El dibujo muestra el terreno el doble de empinado de lo real, para que se note."

Sin problemas: resumen coincide con números; fechas; coma decimal; leyenda en ambos idiomas; tema azul; inglés completo; símbolo además del color; mapa con teclado.

No pudo revisar: pendiente fuerte, finca >120 parcelas, sin comparación, finca sin parcelas (sospecha: v.cuadricula[0].length sin proteger en EscaneoDron.tsx:302 y :332).
