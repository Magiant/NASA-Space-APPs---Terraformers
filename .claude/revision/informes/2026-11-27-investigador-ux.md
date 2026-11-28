# investigador-ux · 2026-11-27

Solo abrió tres fuentes (GOV.UK Question pages, WCAG 2.5.8, búsqueda sobre Plantix). INV-03, INV-04, INV-06 e INV-07 van sin fuente verificada. Ubicaciones deducidas por nombre de archivo, a confirmar.

- [INV-01] Una pregunta por pantalla en formularios largos (NuevaSiembra, CerrarSiembra, NuevaFinca), con "Paso X de Y". Fuente: https://design-system.service.gov.uk/patterns/question-pages/ · Esfuerzo medio.
- [INV-02] Guardar borrador y cola de envío visible sin señal (ReportarPlaga, CerrarSiembra, NuevaSiembra), contador de pendientes en MiHistorial. Fuente: IRRI sobre Plantix, guía GSMA. · Esfuerzo alto.
- [INV-03] "Actualizado hace X" en cada dato en vivo (Precios, Alertas, Zona); aviso si tiene más de 7 días. Sin fuente verificada. · Bajo.
- [INV-04] Avisos de peligro con nivel, qué pasa, qué hacer y hasta cuándo (Alertas). Protocolo CAP, sin verificar. · Bajo.
- [INV-05] Íconos con palabra y botón "Escuchar" con voz del navegador (Sembrar, Cultivo). Fuente: https://peerj.com/articles/cs-3150 · Medio.
- [INV-06] Frase de conclusión sobre cada gráfico de precios ("El tomate subió ₡150 en 2 semanas"). NN/g, sin verificar. · Bajo.
- [INV-07] Resumen de errores arriba y mensaje pegado al campo (Ingresar, Registrarse, NuevaFinca). GOV.UK validación, sin abrir. · Medio.
- [INV-08] Separación de al menos 8 px entre botones pequeños; borrar lejos de editar y con confirmación. Fuente: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html · Bajo.

## Reglas propuestas
1. Un formulario de más de 5 campos se divide en pasos, con "Paso X de Y" y sin pedir dos veces el mismo dato.
2. Si se guarda sin señal, el mensaje dice "Guardado en su teléfono, falta enviar", y la lista muestra cuántos registros están pendientes.
3. Cada precio y cada aviso muestra "Actualizado hace X" o la fecha; si tiene más de 7 días, lo dice con texto de advertencia.
4. Todo aviso de peligro dice nivel (ícono y texto), qué pasa, qué hacer y hasta cuándo vale.
5. Encima de cada gráfico hay una frase corta que dice qué muestra y la tendencia con palabra.
6. Ningún ícono aparece solo: siempre lleva su nombre al lado, salvo "cerrar" y "volver".
7. Un botón que borra está al menos 8 px separado de otro botón y siempre pide confirmación.
