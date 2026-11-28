# jefe-informacion · 2026-11-27

Comprobó en código PRE-01, SEM-01, CUR-01, CUR-03, CUR-07 y TIE-01/02. TIE-03, TIE-04, SEM-02 y CUR-04 aceptados "por captura".

## Confirmados (de más a menos grave)
1. PRE-01 · "Se mantiene" sin precio anterior (alta). publico.ts:234-240 (aRegistro): sin anterior, previo = precio. Propuesta: tendencia "sin_comparar"; ES "Aún sin precio anterior para comparar", EN "No earlier price to compare yet"; ocultar "Precio anterior"; ícono neutro. Revisar Precios.tsx:14-27 y filtros.
2. PRE-02 + PRE-03 · fecha única y aviso viejo sin acción (media). Precios.tsx:83-86, 115, es.ts:479. Mostrar "Precio del dd-mm-aaaa" en la fila si p.fecha difiere; aviso ES "Estos precios tienen 14 días (13-11-2026) y pueden haber cambiado. Confirme el precio con el comprador antes de vender." / EN "These prices are 14 days old and may have changed. Check with your buyer before selling." con estilo de aviso.
3. TIE-01 + TIE-02 · nombre del día partido a 360 px (media). Pronostico.tsx:45-53, :119; estilos.css:1385. Armar "Miércoles 2"/"Wednesday 2" a mano; más ancho a la columna; sin hyphens; nombre corto si no cabe.
4. SEM-01 · notas de cultivo en español en inglés (media). datos-ejemplo/publicos.ts:171,174,177. Códigos traducidos como el de frijol (en.ts:679). Duda: ¿el dato real de Supabase trae texto plano?
5. SEM-02 · puntaje alto y "Ojo" en la misma tarjeta (media, por captura). Mínimo: en "¿Por qué este puntaje?" añadir "La nota no cuenta lo que ya sembraron sus vecinos. Vea el aviso «Ojo» de cada cultivo." Reordenar es decisión de producto.
6. CUR-01 · "Para: Arroz" en "Granos básicos: frijol y maíz" (media). cursos.ts:17. Ajustado: aplicar granos básicos solo si el título no nombra cultivos concretos.
7. CUR-03 · botón sin enlace (media). Capacitaciones.tsx:142. Sin URL válida, no mostrar botón y poner "Pida más información en el INA (Instituto Nacional de Aprendizaje)."
8. CUR-02 · cómo inscribirse (media). Añadir "Para inscribirse, entre a la página del curso y siga las instrucciones del INA." / EN "To sign up, open the course page and follow the INA instructions."
9. TIE-03 · avisos en español en inglés (media, por captura). Traducir el tipo; en inglés "Official notice, in Spanish."; traducir los avisos de la demo.
10. TIE-04 · "Guanacaste" solo enlaza "Liberia" (media). Probable dato de demo; completar distritos del ejemplo.
11. TIE-05/06/07 · pronóstico sin explicar unidades y formato mezclado (baja). "Humedad 100 % (muy húmedo)", "Viento 11 km/h (suave)", "(lluvia fuerte)" sobre 10 mm, "98 % de lluvia" en horas, "19 °C" con espacio.
12. SEM-03 · temperatura, "Franco (volcánico)" y "CNE" (baja).
13. PRE-04 · gráfico sin unidad ni período (baja).
14. SEM-04 · pie con enlaces de 32 px (baja, global).
15. PRE-07 · "per roll of 12 bunches"; fecha en inglés con mes en palabras (baja).
16. PRE-08 · "Fuente: CENADA (PIMA)" (baja).
17. SEM-05, CUR-04, CUR-05, CUR-06, CUR-07, TIE-08 (baja), con la propuesta del empleado. SEM-05 con etiqueta "Hoy" (no solo borde).

## Descartados
PRE-05 (preferencia), PRE-06 (cifra sin verificar), SEM-06 (detalle técnico), SEM-07 (duda, hay lista y zoom).

## Encontrados por el jefe
- JINF-01 · precio 0 o null se ve "₡0" (media). aRegistro: Math.round(Number(null)) = 0. Ignorar filas sin precio o mostrar "Sin precio".
- JINF-02 · revisar que "Lo que siembro" use el mismo catálogo de cultivos que Sembrar (R-43).
- JINF-03 · tres formatos de temperatura ("19,5 °C", "19°C", "19°"). Unificar en "19 °C".
- JINF-04 · siglas (PIMA, CNE, INA) con nombre completo la primera vez en cada página.

## Notas para el supremo
1. Regla sugerida: los datos de ejemplo no se muestran en el idioma equivocado.
2. SEM-02 es decisión de producto.
3. Alertas sin acción: texto fijo por color requiere criterio agrícola/emergencias.
4. Pie global: un solo cambio.
5. CUR-01, CUR-02, CUR-05, CUR-06 repetidos desde el 22-11.
6. Sin cobertura: error de red, carga lenta, lista vacía, distrito sin datos, 320/1920 px.
