# Segunda pasada de jefe-finca — 2026-11-22

Comprobé en el código los "sigue igual", los "a medias" y los hallazgos nuevos. No recapturé pantallas.

## Descartados en esta pasada
- DRO-03 (sigue igual): falso. `.app:has(.boton-flotante)` deja 150 px abajo; el botón ocupa hasta 138 px.
- DRO-11: falso. `.dron-plano-pista` está oculto por encima de 599 px.
- FIN-11: falso positivo. La etiqueta entera del radio mide unos 48 px y se puede tocar.

## Estado de la primera pasada
Arreglados: FIN-02, DRO-01, CTA-01, CTA-02, FIN-03, DRO-02, FIN-04, FIN-07+DRO-03, FIN-08, DRO-05, CTA-05, DRO-06, FIN-09, FIN-10, FIN-11+CTA-09, CTA-07.
A medias: FIN-01 (el botón aún dice "Tomar o subir una foto"), CTA-06 (enlace vencido no avisa; "avise al equipo" sin canal), FIN-05 (sin cola sin señal), CTA-04/DRO-08 (el dron no muestra errores de carga), CTA-03 (candado solo en el menú de abajo y muy chico), FIN-06 (botón sin estado de envío), DRO-04 (lienzo chico, pero hay aviso), DRO-07 (párrafo largo de la ley).

## Lo que falta, de más a menos grave
1. [FIN-12] "Guardar resultado" sin estado de envío (media) — CerrarSiembra.tsx:48-69,112.
2. [DRO-09] El dron oculta los errores de carga: con error muestra "registre su primera finca" o "no hay vuelos" (media) — EscaneoDron.tsx:62-96.
3. [DRO-10] Sin ErrorBoundary alrededor de las rutas con lazy: pantalla en blanco si el archivo no baja (media) — App.tsx.
4. [CTA-N1] Enlace de recuperación vencido no avisa (media, deducido del código) — AuthContext.tsx.
5. [FIN-13] Nota y cierre sin cola sin señal (decisión).
6. [FIN-01] Texto del botón de foto (baja).
7. [CTA-03/CTA-N3] Candado en pie y escritorio; candado de 11 px (baja).
8. [CTA-06] "Avise al equipo" sin canal (decisión).
9. [CTA-N4] "¿Olvidó su contraseña?" sin estado de envío (baja).
10. [CTA-N2] NuevaClave sin requisitos ni mensaje propio (baja).
11. [DRO-07] párrafo largo; [CTA-07] PIMA y CENADA (baja).
12. [FIN-14] detección de red por texto; [FIN-15] mensajeError puede devolver español; [FIN-16] dos ventanas seguidas (duda) (baja).
13. FIN-08 menor: `reportes` fuera de la condición de carga.

## Notas para el supremo
- Conviene hacer ya: `enviando` en CerrarSiembra, errores del dron (DRO-09) y el ErrorBoundary (DRO-10).
- Decisiones abiertas: cola para notas y cierres, "es gratis", canal de "avise al equipo", unidad original del área.
- No se revisaron tema azul, inglés en pantalla ni 390/768 px.
