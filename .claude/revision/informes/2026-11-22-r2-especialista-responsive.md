# Segunda pasada de especialista-responsive — 2026-11-22

Capturé de nuevo las 11 páginas públicas y las 8 privadas en 320, 360, 390, 768, 1024, 1280 y 1920 px; tema azul en 320/360/390 para sembrar, zona, ingresar, mi-finca, siembras/nueva e historial. Evidencia (EV) en `C:/Users/PC/AppData/Local/Temp/claude/cff5e9b249d026e9/176261a1-31f1-4afb-a5bd-a4bf49f6e0eb/scratchpad/p2/` (pub, priv, azul, azulp). Sin desbordes de lado. El CSS nuevo está en `web/src/estilos.css` 1708-1780. No abrí todas las capturas de 768 a 1920 ni las de `siembras/s1/cerrar` y `reportar-plaga`.

## Estado de los hallazgos anteriores
- RESP-01 (insignias y títulos partidos): ARREGLADO (EV `priv/siembras_nueva-320-1.png`).
- RESP-02 (botón flotante grande): ARREGLADO A MEDIAS. Círculo de 56 px y espacio de 150 px; sigue tapando a veces el botón de la columna derecha (RESP-N1).
- RESP-03 (tabla de vecinos): ARREGLADO (CSS y reporte automático; no vista en imagen).
- RESP-04 (enlaces de 32 px en #/ingresar): ARREGLADO.
- RESP-05 ("Descargar la app" casi invisible): ARREGLADO.
- RESP-06 (tarjeta suelta a 768 px): SIGUE IGUAL (baja, opcional).
- RESP-07 (casillas de 24 px en #/fincas/nueva): SIGUE IGUAL (baja; cumple el mínimo de WCAG; no comprobé el tamaño de la etiqueta).
- RESP-08 (títulos del historial subrayados): ARREGLADO.

## Problemas nuevos
### [RESP-N1] El botón flotante redondo sigue tapando el botón de la columna derecha en "Nueva siembra" y "Mi finca"
- Severidad: media · Regla R-23 · 320-390 px · `estilos.css:711-714`, `:1124`, `:1713-1716`
- A 320 px el círculo queda sobre "Elegir café" y sobre "Ver zona" en un punto del recorrido (EV `priv/siembras_nueva-320-1.png`, `priv/mi-finca-320-1.png`). Al seguir desplazando queda libre; el relleno permite ver todo al final.
- Propuesta: llevarlo más a la esquina (`right: 8px`) o hacerlo de 48 px y semitransparente al desplazar. No es urgente.

### [RESP-N2] En #/zona/CR30101 a 320 px la tarjeta "El tiempo" parece cortada por la derecha (sin confirmar)
- Severidad: media · R-20, R-21 · `estilos.css:1244-1248`
- En `pub/zona_CR30101-320-3.png` el lugar sale "Oriental, Carta…" y no se ve el borde derecho; a 360 px se ve completa. El reporte automático no marcó desborde.
- Propuesta: `.pronostico-lugar{min-width:0;flex-wrap:wrap}` y `.pronostico-cabeza h2{flex:none}`, tras medir el ancho real.

### [RESP-N3] Avisos de 1 columna y candado
- Sin hallazgo: los avisos salen completos y el candado no se cruza con otras pestañas a 320 px.

### [RESP-N4] Regla muerta
- Baja · `estilos.css:1060` (1 columna bajo 600 px) la pisa `:1130`. Borrarla o mover la intención al final.

### Menores
- "Zanahoria" se parte por palabra en #/precios a 320 px: aceptable.
- En #/zona a 768 px el reporte marca "Clima", "Agua", "Suelo" cortadas (no confirmado en imagen).
- Enlaces del pie de 44 px: ya no salen como chicos.

## Tabla (320/360/390/768/1024/1280/1920)
Todo ✓ salvo: zona/CR30101 a 320 (RESP-N2); mi-finca a 320-390 (RESP-N1); fincas/nueva en todos (RESP-07); siembras/nueva a 320-390 (RESP-N1) y 768 (RESP-06). El tema azul repite lo mismo.
