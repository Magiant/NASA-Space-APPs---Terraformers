# TerraFarm para Android

La misma idea que la app de iPhone (`../ios`): un cascarón nativo con la web empaquetada adentro.

- **Barra de pestañas nativa** (Material 3): Sembrar, Precios, Alertas, Cursos y Mi finca, con los mismos
  íconos de la web, y el botón **"Reportar una plaga"** flotando encima.
- **Cada pestaña es una vista web** (WebView) con la web compilada dentro de la app: abre y funciona sin
  internet; los datos en vivo (Supabase, relieve de NASA, clima) se piden cuando hay señal.
- **Puente con la web**: la barra sigue el idioma (ES/EN) y el tema (claro/oscuro) que se eligen en Ajustes,
  y el cambio se aplica en todas las pestañas. La web oculta su propia barra cuando ve `data-nativo`.
- **Lo que la web necesita del teléfono**: permiso de ubicación para "Usar mi ubicación", selector de fotos
  para el reporte de plagas y el botón Atrás (vuelve dentro de la página, luego a Sembrar y al final sale).
  Los enlaces a otros sitios se abren en el navegador.
- Respeta el tamaño de letra del teléfono. Android 8 o más nuevo (minSdk 26).

## Cómo compilarla

Requisitos: [Android Studio](https://developer.android.com/studio) (trae el SDK de Android y Java 17+) y
Node.js para compilar la web.

1. En la raíz del repo: `npm ci` (una vez) y luego `npm run build` (o `android/preparar-web.sh`).
   Así queda `web/dist`, que Gradle copia dentro de la app en cada compilación.
2. Abrir la carpeta `android/` en Android Studio y esperar a que termine "Gradle sync".
3. Elegir un teléfono o emulador y darle **Run**.

Cada vez que cambie la web, repetir el paso 1 antes de compilar.

Por línea de comandos (con Android Studio o el SDK instalados): Android Studio genera el `gradlew` la primera
vez que abre el proyecto; si no, `gradle wrapper` lo crea. Luego `./gradlew assembleDebug` deja el APK en
`app/build/outputs/apk/debug/`.

## Descargarla desde la página

El flujo `.github/workflows/android.yml` compila la web y el APK en GitHub (sus servidores ya traen el SDK
de Android) cada vez que cambia `web/`, `android/` o `packages/compartido/`:

- En un **PR** solo comprueba que compila y deja el APK como artefacto del flujo, para probarlo.
- En **main** lo publica en la versión del repo `app-android`, siempre en la misma dirección:
  `https://github.com/Magiant/NASA-Space-APPs---Terraformers/releases/download/app-android/TerraFarm.apk`.
  La página de Inicio y el pie de página tienen el botón "Descargar para Android" con ese enlace (no se
  muestra en iPhone/iPad ni dentro de las apps).
- También se puede correr a mano desde la pestaña **Actions** (App Android → Run workflow).

Secretos opcionales del repo (Settings → Secrets and variables → Actions):

| Secreto | Para qué |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALGOLIA_APP_ID`, `VITE_ALGOLIA_SEARCH_KEY` | Llaves públicas de la web: la app abre con datos reales. Sin ellas, en modo demo. |
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | Llave de firma del equipo: versión optimizada que se actualiza sin desinstalar. Sin ella se firma con una llave de prueba (para actualizar hay que desinstalar la anterior). |

Crear la llave una sola vez (guardarla bien: sin ella no se pueden publicar actualizaciones):
`keytool -genkeypair -v -keystore terrafarm.jks -alias terrafarm -keyalg RSA -keysize 2048 -validity 10000`
y guardar en `ANDROID_KEYSTORE_BASE64` el resultado de `base64 -w0 terrafarm.jks`.

## Notas

- **Llaves**: la web se compila con las variables `VITE_*` del `.env` de la raíz (llaves públicas de Supabase
  y Algolia). Sin `.env`, la app abre en modo demo con las cuentas de prueba.
- **Depurar la web**: en una compilación de depuración, abrir `chrome://inspect` en la computadora con el
  teléfono conectado.
- **Origen**: la web se sirve bajo `https://appassets.androidplatform.net/` (WebViewAssetLoader). Es un
  origen local de la app: no sale a internet.
- Para publicar en Google Play hace falta firmar la versión `release` con una llave propia (no está en el repo).
