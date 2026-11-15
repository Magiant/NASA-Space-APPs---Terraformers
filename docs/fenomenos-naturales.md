# Tema 8 — fenómenos naturales

## Estado real de las fuentes

Revisión del 14-nov-2026 (robots.txt y acceso real):

| Fuente | Cómo entra | Por qué |
|---|---|---|
| **IMN · pronóstico subestacional** | **Automático, diario** (`imn-subestacional`) | `robots.txt` del IMN solo prohíbe `/test` y `/busqueda`; la página [pronóstico subestacional](https://www.imn.ac.cr/pronostico-subestacional) es texto con periodo de validez, comentario general y pronóstico por semana |
| IMN · avisos meteorológicos | Boletín revisado a mano (`imn`) | Varias rutas de avisos devuelven 404/410; no hay una ruta estable |
| CNE · alertas | Boletín revisado a mano (`cne`) | Su `robots.txt` permite el acceso general, pero un bloqueo antibots (Cloudflare) devuelve 403 a consultas automáticas. **No se evade**: carga manual |
| CNE · amenazas por distrito | Plantilla CSV revisada (`amenazas`) | Solo se publican mapas en PDF por cantón |

### Pronóstico subestacional automático (`extractores/src/riesgos/imn-subestacional.ts`)

Una consulta diaria a la página. Guarda en `alertas` una fila por el periodo completo y una por cada semana:
`fuente='imn'`, `tipo='pronostico_subestacional'`, `nivel=null` (el IMN no asigna color a un pronóstico),
`inicio`/`fin` = fechas de validez (hora de Costa Rica), `descripcion` = comentario general (+ eventos extremos)
o el texto de la semana, `codigos_distrito=null` (alcance nacional: no hay catálogo revisado de regiones del IMN →
distritos) y `url` = la página oficial. `id_externo` es estable por periodo (`subestacional-2026-11-16_2026-12-13`,
`…-semana-1`…): correrlo cada día no duplica y los periodos anteriores quedan como historial.
Si la página cambia y no aparece "Válido del …" o el comentario general, falla en lugar de guardar algo incompleto.
Lee fechas como "16 al 22 de noviembre de 2026", "30 de noviembre- 6 de diciembre de 2026", "7-13 de diciembre
de 2026" y periodos que cruzan de año.

Fuentes consultadas:
- https://www.cne.go.cr/
- https://www.imn.ac.cr/pronostico-subestacional
- https://www.imn.ac.cr/avisos-meteorologicos/-/asset_publis
- https://www.cne.go.cr/reduccion_riesgo/mapas_amenzas/mapas_de_amaneza/cartago/Cartago.pdf
- https://gpm.nasa.gov/data (GPM pospuesto).

No se confirmaron cuotas, parámetros de API ni claves para CNE/IMN. Como estos módulos leen archivos, no hacen consultas HTTP a dichas fuentes ni necesitan pausas o reintentos de scraping. Si se implementa ese acceso después, verificar robots/términos y rutas; usar consultas secuenciales, pausa inicial de 3 segundos como política propia y reintentos limitados para red/429/5xx respetando Retry-After. No reintentar 403/410 como si fueran errores temporales.

## Qué hace cada módulo

- src/riesgos/cne.ts y imn.ts llaman al importador compartido revisados.ts.
- El importador lee JSON, resuelve zonas, valida todas las filas con Zod y entrega el lote al ejecutor común. Un error de lectura, normalización o validación se registra en extracciones y hace fallar el comando.
- src/cargas-unicas/amenazas.ts lee CSV revisado, convierte meses vacíos a null, valida con AmenazaZona y usa el mismo ejecutor.
- Los upserts usan TABLAS: alertas por fuente,id_externo y amenazas_zona por codigo_distrito,tipo, en bloques de 500. Repetir la carga conserva esas claves. No hay escrituras a Algolia.
- Estas tablas pertenecen al tema 8: se envían sus campos del esquema, sin extraido_en ni campos ajenos. No es necesario recortar campos de otro tema con pick().

## Probar localmente sin Supabase

Pronóstico subestacional (página real o copia guardada, sin escribir):

```bash
npm run extraer -- imn-subestacional --simulacion
```
```bash
npm run extraer -- imn-subestacional --simulacion --archivo=test/fixtures/imn-subestacional.html
```

Boletines revisados:

Requiere Node 22.18+ (el workflow usa 24). Ejecutar desde la raíz del repositorio:

```powershell
npm ci
node --test extractores/test/riesgos.test.ts
npm run extraer -- cne --simulacion --archivo=test/fixtures/riesgos-cne.json --distritos-archivo=test/fixtures/distritos-muestra.json --distritos=CR10101,CR30110,CR50501
npm run extraer -- imn --simulacion --archivo=test/fixtures/riesgos-imn.json --distritos-archivo=test/fixtures/distritos-muestra.json --distritos=CR10101,CR30110,CR50501
npm run extraer -- amenazas --simulacion --archivo=test/fixtures/riesgos-amenazas.csv --distritos-archivo=test/fixtures/distritos-muestra.json --distritos=CR10101,CR30110,CR50501
```

Las rutas de --archivo, --regiones-archivo y --distritos-archivo son relativas a extractores/ cuando se usa npm run extraer. Las muestras aparecen en extractores/salida/. **Son datos ficticios para probar código, no valores oficiales ni recomendaciones.** El JSON tiene prueba:true y el CSV fuente PRUEBA:; ambos se bloquean en carga real. La simulación no escribe en Supabase, ni siquiera en extracciones.

## Preparar boletines reales

Copiar datos/riesgos/cne.plantilla.json a cne.json e imn.plantilla.json a imn.json. Completar revisado_en con la hora real de revisión en ISO 8601 (por ejemplo con -06:00), prueba:false y registros. No renovar revisado_en automáticamente: confirma revisión humana de la fuente. En carga real se exige revisión de las últimas 48 horas.

Cada elemento de registros tiene alerta y, opcionalmente, zonas:

```json
{
  "alerta": {
    "fuente": "imn",
    "id_externo": "IDENTIFICADOR_ESTABLE_DEL_BOLETIN_Y_EDICION",
    "tipo": "aviso_meteorologico",
    "nivel": null,
    "titulo": "TITULO_REAL",
    "descripcion": null,
    "codigos_distrito": null,
    "inicio": null,
    "fin": null,
    "url": "https://www.imn.ac.cr/ENLACE_REAL"
  },
  "zonas": { "distritos": [], "cantones": [], "regiones": [] }
}
```

Los textos en mayúsculas son marcadores, no datos listos para cargar. Usar el identificador oficial o enlace permanente; para una página reutilizada incluir la edición/fecha de emisión. Conservar el identificador al corregir o cerrar un boletín. IMN solo admite aviso_meteorologico o pronostico_subestacional y nivel:null. En CNE copiar el color publicado. Si un boletín tiene colores diferentes por zona, dividirlo en registros con sufijos estables por grupo territorial; no atribuir el color máximo a todas las zonas.

Los campos desconocidos son null. inicio y fin solo se completan cuando existe evidencia de vigencia: la hora de descarga no es la hora de inicio. Un pronóstico no implica una emergencia. No convertir colores de gráficos de lluvia en colores de alerta.

Cantones se expresan como CR + 3 dígitos y se expanden a distritos usando el catálogo completo. Un catálogo regional opcional (--regiones-archivo=datos/riesgos/regiones.json) es un objeto que relaciona el nombre exacto revisado con una lista de códigos distritales. No hay equivalencias regionales inventadas. Una región desconocida provoca advertencia y cobertura null, incluso si otras zonas se resolvieron. Un código inexistente o un id duplicado rechaza todo el archivo.

El filtro --distritos para alertas solo se admite en simulación; no recorta las listas guardadas. Los catálogos locales también quedan limitados a simulación.

**Vigencia:** se conservan registros históricos. La ausencia de un boletín en un archivo posterior no lo cancela. Para cerrar una alerta, importar el mismo id_externo con fin respaldado por la fuente. fin:null significa vigencia desconocida, no alerta indefinidamente activa. El esquema actual no distingue cancelación y desconocimiento; el consumidor debe mostrar esa incertidumbre. Un archivo revisado con registros:[] significa revisión sin boletines para importar, no borra filas anteriores. Un archivo faltante es error, nunca ausencia de alertas.

## Amenazas estáticas

Copiar amenazas.plantilla.csv a amenazas.csv y completar únicamente filas respaldadas/revisadas:

```csv
codigo_distrito,tipo,nivel,meses_riesgo,fuente
```

Tipos: inundacion, deslizamiento, sequia, huracan, volcan, sismo, otro. Niveles: bajo, medio, alto, muy_alto. Meses: 1 a 12 separados por punto y coma (9;10), o vacío para null. fuente debe identificar el documento, enlace y criterio de clasificación aprobado. Los mapas cantonales no justifican por sí solos asignar un nivel a todo un distrito ni meses de mayor riesgo. Si no hay nivel respaldado, no crear la fila: el esquema no permite nivel null. Una zona en blanco del mapa no equivale a riesgo bajo. El cargador rechaza nivel vacío, meses inválidos y claves duplicadas.

SMAP/lluvia: no se calcula todavía un riesgo temporal de sequía ni se sobrescribe la amenaza estática. Falta acordar umbrales, ventana temporal y tratamiento de datos faltantes con temas 1, 2 y 4. No se consulta GPM. El promedio de puntos Turf no aplica a estas cargas documentales.

## Carga real y GitHub Actions

Configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env local (raíz, no versionarlo) o en Secrets de Actions. Preparar archivos reales, revisar primero con --simulacion y ejecutar:

```powershell
npm run extraer -- cne
npm run extraer -- imn
npm run extraer -- amenazas --archivo=datos/riesgos/amenazas.csv
```

main.ts registra imn-subestacional → extraerImnSubestacional (automático), cne → extraerCNE, imn → extraerIMN y amenazas → cargarAmenazas. diario.yml tiene el job `imn-subestacional` (corre siempre a las 05:00) y un job independiente con matriz cne/imn para los boletines revisados. Se habilita con la variable de repositorio RIESGOS_REVISADOS_HABILITADOS=true cuando los boletines revisados estén versionados en extractores/datos/riesgos/. El job usa el horario existente de 05:00 Costa Rica; no actualiza los boletines por sí solo. unica-vez.yml agrega amenazas a las opciones manuales; opciones puede contener --archivo=datos/riesgos/amenazas.csv.

## Límites de verificación

Las pruebas locales comprueban normalización, rechazo Zod, claves estables y simulación, sin enviar datos a Supabase. No demuestran permisos de scraping ni idempotencia contra una base real. El ejecutor compartido hace varios upserts y no ofrece una transacción única para archivos mayores de 500 filas: una falla de red puede dejar bloques anteriores guardados. Reejecutar con las mismas claves permite recuperarlos. Los errores de cierre del registro son reportados por el ejecutor común; no se cambió su comportamiento para otros temas.
