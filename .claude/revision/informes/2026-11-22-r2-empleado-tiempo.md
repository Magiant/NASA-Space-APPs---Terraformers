# Segunda pasada de empleado-tiempo — 2026-11-22

SEGUNDA PASADA, Tiempo y alertas (22-11-2026)
Capturas: C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-22-53 (sin zona fijada), ...\2026-11-22-22-54 (zona CR30101, español) y ...\2026-11-22-22-55 (zona CR30101, inglés y tema azul). Para fijar la zona usé una copia temporal de capturar.mjs que ya borré. No cambié archivos del proyecto.

ESTADO DE MIS HALLAZGOS ANTERIORES

- TIE-01 (tarjeta de alerta corta el consejo en celular): ARREGLADO.
  - A 360 px las tarjetas van en una columna y el texto sale completo: "Revise los desagües de la finca y evite sembrar en partes bajas esta semana" y "Si cae ceniza, lave las hojas de hortalizas con agua limpia".
  - Evidencia: 2026-11-22-22-53\alertas_ver_alertas-360-1.png.
  - "Leer el aviso completo" lo vi solo en el código (Alertas.tsx:116-120, abre una ventana). La demo no lo activa.
  - Duda menor: estilos.css:1185-1194 todavía tiene `line-clamp: 4` y 2 columnas dentro de una media query. No se activó en 360 ni en 390.

- TIE-02 (pronóstico contradictorio): ARREGLADO A MEDIAS.
  - Arreglado: la hora "Ahora" ya usa el mismo cielo que la cabecera (Pronostico.tsx:86). Ya no dice "Nublado" arriba y "Llovizna" en "Ahora".
  - Sigue pendiente 1: la fila "Hoy" dice "Llovizna 24°/17° 96% · 2 mm" sin aclarar que 96 % es lo más alto del día. La cabecera dice "Nublado" y la frase "Es probable que llueva en la próxima hora". No hay una frase tipo "Llovizna hasta las 7 p. m.".
  - Sigue pendiente 2 (nuevo): la cabecera dice "20°C" y la columna "Ahora" dice "21°" (alertas-360.txt de ...22-54).
  - Evidencia: 22-54\alertas-360-1.png.

- TIE-03 (niveles de alerta sin explicar): ARREGLADO A MEDIAS.
  - Arreglado: ahora aparece "Comisión Nacional de Emergencias" e "Instituto Meteorológico Nacional". También aparece la leyenda "Vigilancia: esté pendiente · Atención: tome precauciones · Alerta: actúe hoy · Peligro: proteja su finca y su familia" (es.ts:492-493 y en.ts equivalente).
  - Sigue igual: el orden de la lista es Atención, Vigilancia, Alerta, o sea que no sigue la gravedad. La leyenda sí está ordenada de menor a mayor, pero la lista no. En la captura el nivel "Vigilancia" va en verde y es la etiqueta más leve.
  - Evidencia: 22-53\alertas_ver_alertas-360.txt.

- TIE-04 (aviso vencido en la demo): SIGUE IGUAL.
  - "ATENCIÓN · Lluvias fuertes… Desde 13-11-2026 hasta 16-11-2026" sigue en la lista y en el "3" de la pestaña, con hoy 22-11.
  - Evidencia: 22-53\alertas_ver_alertas-360.txt.
  - Sigue siendo un problema de la demo: el modo real filtra por fecha (publico.ts:168), y yo no lo probé.

- TIE-05 (decimales con punto): ARREGLADO EN PARTE.
  - Arreglado: la zona ahora dice "19,5 °C" y "Entre 11,9 y 26,2 °C" (zona_CR30101-360.txt).
  - Sigue: la cabecera del pronóstico escribe "20°C" y "Se siente como 22°", pegado, mientras la zona escribe "19,5 °C", con espacio. Además, en la misma pantalla "Humedad 94 %" va con espacio y "82%" en las horas va pegado.
  - Pasa a severidad baja.

- TIE-06 (sensación, humedad y viento en palabras simples): ARREGLADO A MEDIAS.
  - Arreglado: ahora dice "Se siente como 22°" y la hora lleva su frase larga para lector de pantalla.
  - Sigue igual: "Humedad 94 %" y "Viento 8 km/h" sin palabras ("muy húmedo", "suave"). Las filas de día muestran "96% · 2 mm" sin la palabra "lluvia", solo con la gota. Los mm no tienen equivalente en palabras.

- TIE-07 (fecha del pronóstico y sin señal): ARREGLADO A MEDIAS.
  - Arreglado: el pie dice "Fuente: Open-Meteo (servicio del tiempo en línea) · actualizado hoy a las 4:54 p. m.". Si el dato no es de hoy, usa la fecha (Pronostico.tsx:189-190, es.ts:386).
  - Sigue igual: el mensaje sin señal es "Sin señal: se muestra el pronóstico guardado (…)". No dice que puede haber cambiado ni que se actualizará al volver la conexión. Lo vi solo en el código; no pude forzar ese estado.

- TIE-08 (pestaña Alertas sin aviso en la zona): ARREGLADO A MEDIAS.
  - Arreglado: el texto ahora dice "Por ahora no hay avisos para Oriental. Toque «Todo el país» para ver los de otras zonas." (22-54\alertas_ver_alertas-360.txt).
  - Sigue: la pestaña no muestra el contador cuando la zona tiene 0 avisos, y no dice cuántos hay en el resto del país (esto lo vi con zona CR30101 fijada).
  - Pasa a severidad baja.

- TIE-09 (avisos en inglés): SIGUE IGUAL.
  - La interfaz está en inglés: "Watch: stay alert · Caution…", "In Oriental / Whole country". Con la zona CR30101 solo vi el mensaje de vacío.
  - Los textos de los avisos de la demo siguen solo en español (datos-ejemplo/publicos.ts). No vi la lista de avisos en inglés en captura.

- TIE-10 (controles chicos y palabras partidas): NO CONFIRMADO, FUERA DE MI PARTE.
  - Alertas y zona a 360, 390 y 1280 salen "sin problemas automáticos".
  - La zona a 768 marca palabra-partida en los chips "Clima", "Agua" y "Suelo" del puntaje de cada cultivo. Eso es la tarjeta de cultivo, no mi parte, y es nuevo respecto a mi informe anterior. Pásenlo al revisor de cultivos.

PROBLEMAS NUEVOS
- Ninguno grave. Los dos detalles nuevos (temperatura 20° contra 21°, "96%" contra "96 %") están anotados arriba.

Revisado y sin problemas:
- Tema azul en inglés (pestaña Alertas con zona fijada, sin textos rotos).
- Español sin claves ni `undefined`.
- Cambio de día en la fila por hora, con "Mañana".
- Anchos 390 y 768 de alertas.
- Enlaces de zona en cada aviso.
- Nombres de zona largos: sin desbordes en lo visto.

No pude revisar:
- Sin datos, carga lenta, error de red y pronóstico guardado: la demo no los muestra y no los forcé; solo los vi en el código.
- La ventana "Leer el aviso completo": ningún aviso de la demo supera 150 caracteres.
- Valores extremos (0 mm, 999 mm).
- Los avisos del modo real.
- El reporte.json de la carpeta principal lo sobrescriben otras páginas, así que las conclusiones de los anchos las saqué de las líneas por ruta que imprime la herramienta.
