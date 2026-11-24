# Segunda pasada de empleado-dron — 2026-11-22

Segunda pasada de Escaneo con dron (#/dron). Capturé de nuevo a 360, 390, 768 y 1280 px en tema crema y español, en `C:\Users\PC\AppData\Local\Temp\terrafarm-revision\2026-11-22-22-53\`. Abrí las de 360 px (0, 2 y 3) y leí `dron-360.txt` y el código. No corrí los temas azul ni inglés. Revisé el inglés solo en `en.ts`.

## Estado de mis hallazgos anteriores

- **DRO-01 (título "sanas" con estrés debajo): ARREGLADO.**
  - Ahora la página dice "En general sus plantas están bien, pero 10 parcelas necesitan revisión". Salió en `dron-360.txt` y en la captura 0.
  - El título sale de `sanaConRevisar` (`EscaneoDron.tsx:229`) y coincide con "10 de 47 parcelas para revisar".
  - Queda un caso sin cubrir. Si el promedio es "estrés" o "crítica", el título no menciona parcelas. Es coherente, no un error.

- **DRO-02 (punto en vez de coma): ARREGLADO.**
  - Ahora se ve "0,74 de 1" y "2,5 ha". La función `dos` usa `t.locale` y `hectareas` usa `num()`.
  - Los m² de la ayuda usan `num(m2)`. En la demo salen 520 m², así que no pude ver el separador de miles con un caso grande.

- **DRO-03 (botón flotante "Reportar una plaga" tapa contenido): SIGUE IGUAL.**
  - En 360 px el botón verde sigue encima del texto. Tapa "Mejoró desde el vuelo…" en la captura 0 y el botón "Si ve bichos o manchas, reporte una plaga" en la captura 3.
  - No hay padding inferior ni se oculta en esta ruta.
  - La acción sigue repetida: botón flotante, botón de "Qué hacer" y botón del detalle de parcela.
  - Es del shell. Lo dejo con severidad media.

- **DRO-04 (mapa 3D pequeño para el dedo): ARREGLADO A MEDIAS.**
  - Se añadió un aviso: "En el celular, toque «Plano»…" (`planoMejor`, `EscaneoDron.tsx:290`).
  - El lienzo sigue igual de chico: unos 280 × 130 px, con parcelas de unos 25 × 12 px y la fila F aplastada (captura 2). Los puntos • miden unos 3 px.
  - El aviso va dentro del párrafo largo de ayuda. Se pierde entre dos frases y queda lejos del selector 3D/Plano.
  - Se ve la barra "Vista inicial" con girar a izquierda y derecha, pero el zoom no se nota en la captura.
  - El aviso sale también en pantallas anchas (1280 px), donde sobra. Está en `modo === '3d'` sin condición de ancho.

- **DRO-05 (pendiente sin niveles ni explicación): ARREGLADO.**
  - Ahora dice "Suave: baja unos 12 m por cada 100 m. Desde 30 % se considera fuerte."
  - El caso fuerte explica las curvas de nivel: "siguiendo el nivel del terreno y no cuesta abajo".
  - Sigue habiendo solo dos niveles, suave y fuerte. No existe "moderada". Las instrucciones de revisión mencionan tres, pero el texto es honesto sobre los dos que hay.
  - No pude ver la versión "fuerte": la demo no la muestra.

- **DRO-06 (índice verde y leyenda): ARREGLADO.**
  - La ficha dice: "Desde 0,6 están sanas; menos de 0,4 tienen problemas."
  - La leyenda dice "Sanas (sin marca)", "Algo de estrés (•)" y "Con problemas (!)". El inglés tiene lo mismo.

- **DRO-07 ("Qué hacer" mezcla acciones): ARREGLADO A MEDIAS.**
  - La lista de parcelas sigue primero. El texto de protección ahora aclara "Son otras que las de revisar", así que no se confunden 11 con 10.
  - Sigue siendo un párrafo de unas 6 líneas en 360 px, con la cita de la Ley Forestal incluida (captura 3). Mi propuesta de acortarlo y mover la ley a otro lugar no se aplicó.

- **DRO-08 (error de red y antigüedad del vuelo): ARREGLADO A MEDIAS.**
  - La antigüedad quedó resuelta: "Vuelo del 02-11-2026 (hace 20 días)", con singular y "hoy" contemplados.
  - El error sigue igual. `EscaneoDron.tsx` nunca lee `fincas.error` ni `vuelos.error` (líneas 62 a 96). `useCargar` sí los entrega, pero la página los ignora. Esto lo vi en el código, no lo reproduje.

## Problemas nuevos

### [DRO-09] Si falla `datos.misFincas()`, el agricultor ve "registre su primera finca"
- Severidad: media. Regla R-34. Es el detalle de DRO-08.
- Dónde: `EscaneoDron.tsx:62`, `:73` y `:86-92`.
- Qué pasa: con error, `fincas.datos` queda en null y `todas` queda vacío, así que sale el estado vacío `t.fincas.primero` con el botón "Registrar finca". Alguien que sí tiene fincas pensaría que se le borraron.
- Si falla `vuelos`, `lista` queda vacía y sale "no hay vuelos" en lugar de "no pudimos cargar".
- Propuesta: si `fincas.error` o `vuelos.error`, mostrar el componente de error con "Reintentar". Parece que `useCargar` ya tiene una vuelta de reintento.

### [DRO-10] La página del dron se carga con `React.lazy` sin pantalla de error si el archivo no baja
- Severidad: media. Regla R-34. Viene de los cambios recientes.
- Dónde: `web/src/App.tsx:16`, `:76-77`. Solo hay `Suspense` con `<Cargando />`. No encontré `ErrorBoundary` en `web/src`.
- Riesgo: con mala señal en el campo, o sin conexión la primera vez que se abre el dron, el archivo `EscaneoDron` puede no bajar. React se queda sin interfaz o con pantalla en blanco. No lo reproduje. Es una deducción del código.
- Propuesta: un `ErrorBoundary` alrededor de las rutas con carga diferida, con el mensaje "No pudimos abrir esta pantalla. Revise su señal." y un botón para reintentar.
- Lo que sí vi en las capturas: la carga aparte funciona sin errores.

### [DRO-11] El aviso de "Plano" sale también en computador
- Severidad: baja. Regla R-01. Es un detalle de DRO-04, ya descrito arriba: el texto dice "En el celular", pero se muestra en 1280 px sin condición de ancho.
- Propuesta: mostrarlo solo en pantallas angostas, con CSS, o convertirlo en un botón que cambie a Plano.

## Lo que revisé y no tenía problemas
- El resumen coincide: 21 % de estrés, 10 parcelas para revisar de 47, título y lista de "Qué hacer" con las mismas 10.
- Fechas en día-mes-año, con "hace 20 días".
- El reporte automático (`reporte.json`) no marca nada en el dron en ningún ancho: "sin problemas automáticos" a 360, 390, 768 y 1280 px.
- Los chips de vuelo y el selector de finca se ven bien a 360 px, sin desplazamiento horizontal.
- La leyenda de símbolos es clara y los textos en inglés están completos para las claves que cambiaron.

## No pude revisar
- Capturas con `--tema=azul` y `--idioma=en`: no las corrí. El inglés solo lo leí en `en.ts`.
- Capturas de 390, 768 y 1280 px: se generaron y no marcaron problemas, pero solo abrí las de 360 px.
- Los casos que la demo no muestra: sin datos, error de red, falla de la carga diferida, pendiente fuerte, valores en cero o muy grandes y nombres largos. Solo los analicé en el código.
- El funcionamiento interno de `MapaFinca3D.tsx` y `elementosFinca.ts`: no los abrí a fondo.
