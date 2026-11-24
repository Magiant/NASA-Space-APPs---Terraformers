# Segunda pasada de jefe-informacion — 2026-11-22

Comprobé en el código las dudas principales (Alertas.tsx, publico.ts, publicos.ts, Zona.tsx, TarjetaCultivo.tsx, estilos.css, es.ts). No recapturé páginas.

## Las tres verificaciones pedidas
- **TIE-03 (orden de la lista de avisos): real; me equivoqué en la primera pasada** (confundí la leyenda con la lista). La demo sale en el orden de los datos (Atención, Vigilancia, Alerta; publicos.ts:244-263, Alertas.tsx:103) y el modo real ordena por fecha de inicio (publico.ts:170). Propuesta: ordenar en Alertas.tsx por nivel de mayor a menor y luego por fecha. Severidad media.
- **TIE-04 (aviso vencido): confirmado, baja.** Solo en la demo (algolia.ts:132 no filtra por `fin`); el modo real sí filtra. Es lo que ve quien evalúa.
- **TIE-10 (palabra partida Clima/Agua/Suelo a 768 px): real.** Filas `.desglose-fila` de TarjetaCultivo.tsx:35-38 con 3 columnas de tarjetas (estilos.css:412); el apilado solo existe bajo 700 px (estilos.css:443). Propuesta: `flex: none` en el nombre o apilar hasta 1099 px. Baja.

## Estado de la primera pasada
- Arreglados: INF-01, INF-02, INF-05, INF-06 (en Zona), INF-09 (Zona y Cultivo), INF-11, INF-12, INF-13, INF-14, INF-15, INF-16, INF-18 (español), INF-20 (casi todo), INF-21, INF-22, INF-23, INF-26 (Cursos), INF-27 (Precios), INF-28 (riesgos), INF-29, INF-04 (PRE-01/PRE-09), INF-10 (casi todo).
- A medias: INF-03 (aviso "Ojo" fuera de la tarjeta), INF-04 PRE-02 (CNP no comparable), INF-07 (falta ordenar la lista), INF-08 (96 % sin explicar; 20° vs 21°), INF-17 (gráfico sin título), INF-19 (frase "papa y tomate"), INF-30 (nombres largos).
- Sigue igual: SEM-13 (cosecha "octubre"), TIE-04, TIE-09 (avisos en español), CUR-02 (decisión), JINF-01, JINF-02.

## Lo que falta, de más a menos grave
1. Aviso "Ojo" del tomate fuera de la tarjeta (SEM-N1/SEM-02), media — Zona.tsx:67-71.
2. Lista de alertas sin orden por gravedad (TIE-03), media — Alertas.tsx.
3. Pronóstico: "96%" sin la palabra lluvia y 20° frente a 21° (TIE-02), media.
4. Aviso vencido en la demo (TIE-04), baja.
5. Palabra partida en Clima/Agua/Suelo a 768 px (TIE-10), baja.
6. Fecha partida "desde el 12-/11-2026" en Precios a 360 px (PRE-11), baja.
7. Filas de Precios apretadas a 360 px (PRE-12), baja.
8. Gráfico de Precios sin título con unidad y período (PRE-07), baja.
9. Inglés: "per 100 units box", "Family Bean family" (SEM-N2), baja.
10. Leyenda de nota en "Dónde se da mejor" (SEM-N3), baja.
11. Temperatura de Zona sin "promedio del último mes"; "Franco" sin explicar (SEM-06), baja.
12. Mensaje sin señal del pronóstico sin "puede haber cambiado" (TIE-07), baja.
13. Pestaña Alertas con 0 avisos: decir cuántos hay en el país (TIE-08), baja.
14. Formato "20°C" frente a "94 %" (TIE-05), baja.
15. Cosecha "octubre" en noviembre (SEM-13), baja.
16. Frase de rotación "papa y tomate" en la ficha de la papa (SEM-09), baja.
17. Tipo del curso sin traducir (CUR-01), baja.
18. CNP sin decir que no es comparable (PRE-02), baja.
19. "Para la época seca" duplicado (CUR-10), baja.
20. Textos de avisos en inglés (TIE-09), duda.
21. Inscripción a cursos y "granos básicos" con arroz (CUR-02/03), decisión.

## Notas para el supremo
1. Corrijo mi nota 6 anterior: el orden de la lista de alertas sí es un hallazgo real.
2. Decisiones pendientes: si baja el puntaje "Venta" con mucha siembra vecina; si "granos básicos" incluye arroz.
3. Fallos (error de red, listas vacías, pronóstico guardado, avisos largos) solo comprobados en el código.
4. Revisar en imagen: tabla de vecinos a 360 px, desplegable del puntaje abierto, fila de Precios abierta con gráfico.
5. Cursos a 390 y 768 px sin revisar en esta pasada.
