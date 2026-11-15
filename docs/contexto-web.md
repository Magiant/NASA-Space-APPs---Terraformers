# Terraformes — contexto del proyecto para la parte visual

> Resumen de las decisiones tomadas para la web. Úsalo como contexto antes de diseñar o programar. Si algo aquí choca con una petición nueva, pregunta antes de cambiarlo.

## 1. Qué es Terraformes

Plataforma web para **agricultores de Costa Rica** que recomienda **qué cultivar en cada zona** (provincia → cantón → distrito), cruzando clima, suelo, agua, mercado, riesgos naturales, plagas e historial de siembras.

- Proyecto de **hackathon**, equipo de **6 personas**.
- Los usuarios finales son agricultores: muchos usan **celular**, con **mala señal** y poca experiencia con tecnología.
- Debe poder **presentarse a jueces** con usuarios de demostración.
- La web debe poder convertirse en **app** más adelante.

### Los 11 puntos del enunciado

1. Clima
2. Humedad del suelo
3. Estudio de mercado nacional e internacional
4. Estudio hídrico
5. Rotación de cultivo
6. Capacitación del agricultor
7. Temperatura del sector
8. Fenómeno natural
9. Mapeo del sector (dron / satélite)
10. Compatibilidad del sector
11. Manejo de plagas

## 2. Decisiones técnicas (ya tomadas)

| Parte | Tecnología |
|---|---|
| Lenguaje | **TypeScript en todo** (no Python) |
| Web | **React + Vite + TypeScript**, como **PWA** (instalable en el celular) |
| Futuro app | Empaquetar la misma web con **Capacitor** |
| Hosting web | **GitHub Pages** (sitio estático, sin servidor propio) |
| Datos públicos (búsqueda rápida) | **Algolia** |
| Usuarios, login y datos privados | **Supabase** (PostgreSQL + Auth + RLS) |
| Extracción de datos | Extractores en TypeScript corridos por **GitHub Actions** (diario/semanal) |
| Validación | **Zod**, esquemas compartidos en `packages/compartido` |
| Monorepo | **npm workspaces** |

### Configuración obligatoria para GitHub Pages

- En `vite.config.ts`: `base: './'` (rutas relativas: funciona con cualquier nombre de repositorio).
- Usar **`HashRouter`** de React Router (URLs tipo `/#/zona/CR30110`). Con `BrowserRouter`, recargar una página interna da 404 en GitHub Pages.
- La web se publica con el workflow `deploy-pages.yml`.

## 3. Cómo fluyen los datos

```
Fuentes (NASA, Open-Meteo, PIMA, CNP, IMN, CNE, SoilGrids, GAEZ, EcoCrop, INA…)
   │  GitHub Actions: extraer → normalizar → validar (Zod) → upsert
   ▼
Supabase (fuente de verdad de TODO)
   │  aptitud/calcular.ts calcula zona × cultivo
   │  publicar-algolia copia resúmenes públicos
   ▼
Algolia (búsqueda rápida, solo datos públicos)

Web (React en GitHub Pages)
   ├── lee datos públicos de Algolia (llave Search-only)
   └── login + datos del usuario en Supabase (llave anon + RLS)
```

**La web nunca escribe en Algolia.** Los datos que ingresa el usuario van a Supabase.

## 4. Seguridad (no romper)

- Las variables `VITE_*` del `.env` **quedan visibles** en el JavaScript publicado. Solo pueden ir ahí llaves públicas:
  - `VITE_ALGOLIA_APP_ID`, `VITE_ALGOLIA_SEARCH_KEY` (solo lectura)
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (protegida por RLS)
- **Nunca** en la web: la Admin key de Algolia ni la service_role de Supabase. Esas solo viven en los secretos de GitHub Actions.
- Datos privados (teléfono, correo, ubicación GPS exacta de la finca) **no se muestran a otros usuarios** ni van a Algolia.
- Roles: `agricultor` (solo sus fincas), `tecnico` (confirma reportes de plaga de su zona), `admin`.

## 5. Datos disponibles para la web

### Regla de ubicación
Todo se une por **`codigo_distrito`** en formato HDX/INEC: `CR30110` (CR + provincia 1 dígito + cantón 2 + distrito 2). Hay **492 distritos**. Cantón: `CR301`. Provincia: `CR3`.

### Índices de Algolia (lectura pública)

| Índice | Un registro es | Uso en la web |
|---|---|---|
| `aptitud` | distrito × cultivo, con puntaje | **Pantalla principal**: qué sembrar aquí |
| `zonas` | un distrito: clima, suelo, agua, riesgos | Ficha de la zona |
| `cultivos` | un cultivo: requisitos, familia, ciclo, plagas | Ficha del cultivo |
| `precios` | producto: último precio y tendencia | Precios del mercado |
| `alertas` | alerta vigente (CNE/IMN) | Avisos en la zona |
| `plagas` | una plaga | Consulta de plagas |
| `capacitaciones` | un curso (INA) | Capacitación recomendada |
| `siembras_zona` | totales anónimos de lo sembrado por zona | "Oferta futura" en la zona |

Filtros en Algolia:
- **`ubicacion.lvl0 / lvl1 / lvl2`** → menú jerárquico provincia > cantón > distrito.
- **`_geoloc`** → "cultivos cerca de mí" con la ubicación del celular.

Ejemplo de registro de `aptitud` (valores inventados):

```json
{
  "objectID": "aptitud-CR30101-papa",
  "cultivo": "Papa",
  "familia": "Solanáceas",
  "ubicacion": {
    "lvl0": "Cartago",
    "lvl1": "Cartago > Cartago",
    "lvl2": "Cartago > Cartago > Oriental"
  },
  "codigo_distrito": "CR30101",
  "_geoloc": { "lat": 9.86, "lng": -83.91 },
  "puntaje": 82,
  "nivel": "excelente",
  "notas": { "clima": 90, "suelo": 80, "agua": 75, "mercado": 85, "riesgo": 20 },
  "mes_siembra": 5,
  "plagas_zona": ["Tizón tardío"],
  "precio_referencia": { "valor": 25000, "unidad": "malla 45 kg", "fecha": "2026-11-13", "fuente": "PIMA" },
  "actualizado": "2026-11-14"
}
```

Niveles de aptitud: `excelente` (≥80), `bueno` (60–79), `no_recomendado` (<60), `descartado` (con `motivo_descarte`).

### Tablas de Supabase con datos extraídos (lectura pública)
Definidas en `supabase/migrations/009_datos_extraidos.sql`:
`distritos`, `clima_diario`, `humedad_suelo`, `precios_historico`, `agua_zona`, `suelos_zona`, `terreno_zona`, `cobertura_zona`, `amenazas_zona`, `alertas`, `cultivos`, `requisitos_cultivo`, `secuencias`, `gaez_zona`, `censo_canton`, `capacitaciones`, `aptitud`, `extracciones`.

Las series largas (gráficos de clima, histórico de precios) se leen de Supabase; los resúmenes, de Algolia.

### Tablas de usuarios en Supabase (privadas, con RLS) — por definir en detalle
| Tabla | Qué guarda |
|---|---|
| `perfiles` | nombre, rol, provincia/cantón/distrito, tipo de productor, cultivos de interés |
| `fincas` | nombre, distrito, área, altitud, fuente de agua, riego, suelo, certificaciones |
| `siembras` | finca, cultivo, fecha de siembra, cosecha esperada, **estado** (`activa` → `finalizada`), **resultado** (`exitosa` / `regular` / `perdida`, cantidad, motivo) |
| `seguimiento` | notas durante el ciclo: riego, abono, problema, foto |
| `reportes_plaga` | siembra, tipo de plaga, nombre, gravedad, fecha, estado (`pendiente` / `confirmado`) |
| `lecturas_humedad` | humedad del suelo medida por el usuario o sensor |
| `vuelos_dron` | métricas de vuelos de dron de la finca (NDVI, pendiente, zonas con estrés) |
| `progreso_capacitacion` | cursos completados por el usuario |

**Las siembras no se borran:** al cosechar, el usuario las "cierra" con su resultado y pasan a ser histórico.

## 6. Pantallas de la web

| Pantalla | Qué muestra | De dónde | ¿Pide login? |
|---|---|---|---|
| **Inicio** | Elegir ubicación y ver los mejores cultivos de esa zona | Algolia `aptitud` | No |
| **Zona** | Clima, humedad del suelo, agua, suelo, riesgos, alertas, mejores cultivos | Algolia `zonas`, `aptitud`, `alertas`; Supabase para gráficos | No |
| **Cultivo** | Requisitos, época de siembra, plagas, precio, mejores zonas, rotación | Algolia `cultivos`, `precios`, `aptitud` | No |
| **Precios** | PIMA (diario) y CNP (semanal), con tendencia | Algolia `precios`; Supabase `precios_historico` | No |
| **Alertas / Capacitaciones** | Avisos CNE/IMN y cursos del INA | Algolia | No |
| **MisFincas / NuevaFinca** | Registrar y ver fincas | Supabase | Sí |
| **NuevaSiembra / MiSiembra / CerrarSiembra** | Siembra, seguimiento y resultado | Supabase | Sí |
| **ReportarPlaga** | Reporte con foto; funciona sin señal | Supabase | Sí |
| **MiHistorial** | Siembras pasadas y resultados | Supabase | Sí |
| **EscaneoDron** | Vuelos de dron de la finca (salud de plantas, pendiente, zonas con estrés) | Supabase `vuelos_dron` | Sí |
| **Administración** | Usuarios y roles, reportes de plaga, estado de extracciones | Supabase | Sí, solo `admin` |

**Login solo cuando hace falta:** todo lo público se usa sin cuenta. La web pide entrar únicamente al abrir algo personal (fincas, siembras, dron…) y, después de entrar, vuelve a esa misma pantalla. La administración no es accesible para usuarios normales.

## 7. Lógica que la web debe reflejar

### Recomendación de cultivo
1. **Filtro:** se descartan cultivos que no aguantan la temperatura, el agua o el suelo de la zona, que están en área protegida, que no permite la capacidad de uso de la tierra o que no se siembran en el cantón según el Censo.
2. **Puntaje (0–100):** suelo + mercado + sanidad − riesgo, con pesos.
3. **Nivel:** excelente / bueno / no recomendado.
4. **Calendario:** el mes de siembra viene de GAEZ.

### Rotación
- Considerar el **cultivo anterior** de la finca: qué deja o quita al suelo y qué plagas deja.
- No se siembra un cultivo que **comparta plagas** con el anterior si esas plagas están en la zona.
- Mostrar la secuencia sugerida (por ejemplo, papa → frijol → maíz) y por qué.

### Plagas
- Cuando el usuario **reporta una plaga**, el sistema recomienda un cultivo siguiente que **no la alimente o la combata**.
- Si no hay cultivo que dé resistencia, se muestra **cómo controlarla**: primero cultural, luego biológico y, como último recurso, químico con productos registrados en el SFE.
- **Pendiente:** el equipo aún no entrega las fuentes de plagas. Las pantallas usan datos de ejemplo.

## 8. Reglas de diseño para agricultores

- **Celular primero:** botones grandes, texto legible, poco texto por pantalla.
- **Lenguaje simple:** "Buena época para sembrar", no "ventana óptima de siembra".
- **Colores con significado**, pero sin depender solo del color: nivel también con ícono y texto.
- **Mostrar siempre de cuándo es el dato:** "Precios actualizados: 13-11-2026".
- **Funcionar con mala señal:** guardar datos consultados y poner en cola los reportes hechos sin conexión.
- **Accesible:** buen contraste y elementos táctiles grandes.

## 9. Demo para los jueces

1. Elegir una zona y ver los mejores cultivos.
2. Iniciar sesión como agricultor y crear una finca.
3. Registrar una siembra.
4. Reportar una plaga y ver la recomendación.
5. Cerrar una siembra con su resultado.
6. Ver cómo el histórico afecta la recomendación de la zona.

Usuarios de demo (mientras no esté Supabase): `agricultor@demo.cr` y `admin@demo.cr`, contraseña `demo1234`.

## 10. Estado actual

- ✅ Algolia y Supabase creados, llaves listas.
- ✅ Migración `009_datos_extraidos.sql` y esquemas Zod (`packages/compartido/src/esquemas/datos.ts`).
- ✅ Interfaz web con datos de ejemplo (`web/src/datos-ejemplo/`).
- ⏳ Extractores de cada punto, tablas de usuarios `001`–`008`, fuentes de plagas y mercado internacional, `seed.sql`, definición exacta de los índices de Algolia.
