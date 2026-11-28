# jefe-finca · 2026-11-27

Comprobó en código (estilos.css, Plantilla.tsx, EscaneoDron.tsx, ReportarPlaga.tsx, CerrarSiembra.tsx). No recapturó.

## Confirmados (de más a menos grave)
- FIN-01 + DRO-01 · botón flotante "Reportar una plaga" tapa texto en Mi finca, historial y dron (media, R-23). Plantilla.tsx:135-141 (oculto solo en /reportar-plaga), estilos.css:1788-1794 y 1878. Propuesta: no mostrarlo si pathname empieza por /dron, /mi-finca o /historial. En Android ya está oculto.
- CTA-01 · "Volver" sticky tapa campos de formularios (media; bajado de alta). estilos.css:1917 (sticky, top 72px, z 20). Propuesta: position relative en formularios; fijo solo en lectura (p. ej. clase .boton-volver-fijo).
- DRO-02 · mapa 3D chico en celular (media). EscaneoDron.tsx:296, MapaFinca3D.tsx:103. Abrir en "Plano" por defecto en ≤ 480 px. Resuelve DRO-03.
- FIN-02 · foto que no llega al técnico (media). ReportarPlaga.tsx:213-225. Aviso antes del botón; botón "Ver una foto del daño (solo en su teléfono)"; URL.revokeObjectURL (no existe en toda la web).
- DRO-07 · posible caída si el vuelo no trae parcelas (baja, R-15). EscaneoDron.tsx:302 y :332 usan v.cuadricula[0] sin protección. Tratar cuadricula vacía como sin vuelo, o ?. y ?? [].
- DRO-05 · "Qué hacer" con cita legal en la lista (baja). es.ts:856 y en.ts. Frase corta; ley en detalle; "y 2 más" con nombres o "vea la lista abajo".
- DRO-06 + DRO-03 · jerga "exagerado ×2" y aviso "En el celular…" en escritorio (baja).
- DRO-04 · pendiente solo dos niveles (baja). EscaneoDron.tsx:262 (> 30 fuerte, si no suave). Añadir "Moderada" 15-30 %.
- CTA-02 · texto gris de la portada poco legible (media). Medir contraste antes de cambiar.
- CTA-03 · "Together we grow" fijo en Plantilla.tsx:72,116,132 y Ajustes.tsx:134 (baja). Decisión de marca.
- CTA-05 · banda sin señal sin fecha (baja). Plantilla.tsx:84-88. "Lo que ve es lo último guardado en este teléfono."
- CTA-06 · "Cargando" sin aviso si tarda (baja). Estados.tsx:6-17. Tras ~8 s "Está tardando. Revise su señal e intente de nuevo."
- CTA-07 · pendientes anteriores sin verificar (avise al equipo, ¿Olvidó su contraseña? sin bloqueo, otp_expired, NuevaClave).
- FIN-04 · unidad del área (baja). Requiere cambio de base de datos.

## Ajustados
- CTA-01 de alta a media.
- FIN-01 y DRO-01 fusionados.
- FIN-03 de media a baja y recortado: CerrarSiembra.tsx:80-83 ya avisa "No se guardó… lo escrito sigue ahí". Meter el cierre en la cola es riesgoso (no se deshace). Solo la nota de seguimiento (MiSiembra.tsx:53-66) iría a la cola.
- DRO-03/06 agrupados; sospecha de cuadricula pasa a DRO-07.

## Descartados
- FIN-05: falso positivo (la tarjeta entera se toca).
- CTA-04: decisión documentada en estilos.css:1911-1913.

## Encontrados por el jefe
- JFIN-01 · dos reglas .boton-volver que se pisan (estilos.css:1908 y 1917). Unificar al corregir CTA-01.
- JFIN-02 · nadie revisó el recorrido completo del agricultor nuevo (entrar → finca → siembra → anotar → cerrar → historial), ni tema azul e inglés en Mi finca.

## Notas para el supremo
1. Lo más rentable: ocultar el flotante en tres rutas, quitar sticky en formularios, limpiar JFIN-01.
2. CTA-03 es decisión del equipo.
3. FIN-04 necesita cambio de base de datos.
4. Sin cobertura: inglés/azul en Mi finca, ventanas de confirmar, error de red, foto grande, finca >120 parcelas, pendiente fuerte, recuperación, Android, carga lenta.
5. No halló datos personales de otras personas expuestos en el código leído.
