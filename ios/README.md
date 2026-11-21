# TerraFarm para iPhone

La misma idea que la app de Android (`../android`): un cascarón nativo con la web empaquetada adentro.

- **Barra de pestañas nativa** (SwiftUI): Sembrar, Precios, Tiempo, Cursos y Mi finca, con el botón
  **"Reportar una plaga"** encima. En iOS 26 se dibujan con el vidrio líquido del sistema.
- **Cada pestaña es una vista web** (WKWebView) con la web compilada dentro de la app, servida bajo
  `app://local`: abre y funciona sin internet; los datos en vivo se piden cuando hay señal. Todas comparten
  la sesión y lo guardado en el teléfono.
- **Puente con la web**: la barra sigue el idioma (ES/EN) y el tema (claro/oscuro) que se eligen en Ajustes.
  La web oculta su propia barra cuando ve `data-nativo`.
- **Lo que la web necesita del teléfono**: permiso de ubicación para "Usar mi ubicación" y de cámara para la
  foto del reporte de plagas (los textos que muestra iOS están en el proyecto, en *Build Settings → Info.plist
  Values*). Los enlaces a otros sitios se abren en Safari, y si iOS cierra una pestaña para liberar memoria,
  se vuelve a cargar sola.
- Requiere **iOS 26** o más nuevo (iPhone 11, iPhone SE de 2.ª generación y posteriores).

## Compilarla en la nube (sin Mac)

El flujo `.github/workflows/ios.yml` compila la web y la app en una Mac de GitHub cada vez que cambia `web/`,
`ios/` o `packages/compartido/`:

- En un **PR** y en **dev** comprueba que compila, revisa que la app lleve los textos de permisos y la web, y
  deja `TerraFarm-simulador.zip` como artefacto (sirve en el simulador de una Mac, no en un iPhone).
- También se puede correr a mano desde la pestaña **Actions** (App iPhone → Run workflow).
- Usa los mismos secretos opcionales que Android (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_ALGOLIA_APP_ID`, `VITE_ALGOLIA_SEARCH_KEY`); sin ellos la app abre en modo demo.

Por ahora no se firma: para instalarla en un iPhone hace falta la cuenta de Apple Developer (ver abajo).

## Compilarla en una Mac

Requisitos: Xcode 26 y Node.js.

1. En la raíz del repo: `npm ci` (una vez) y luego `ios/preparar-web.sh`, que compila la web y la copia a
   `ios/Web` (la carpeta que la app lleva adentro; no se sube al repo).
2. Abrir `ios/Terraformes.xcodeproj`, elegir un simulador y darle **Run**.
3. Para probarla en un iPhone propio: *Signing & Capabilities → Team* con el Apple ID (gratis; la app
   instalada así dura 7 días).

Cada vez que cambie la web, repetir el paso 1. Para depurar la web en el simulador: Safari → Desarrollo →
Simulador (solo en compilaciones Debug).

## Publicarla en TestFlight para el equipo

TestFlight es la app de Apple para instalar versiones de prueba. Pasos, en orden:

1. **Cuenta de Apple Developer** ([developer.apple.com/programs](https://developer.apple.com/programs/),
   USD 99 al año). Puede ser a nombre de una persona o de una organización (esta pide número D-U-N-S).
   Apple tarda de uno a dos días en aprobarla.
2. **Registrar la app**: en *Certificates, Identifiers & Profiles → Identifiers*, crear el identificador
   `cr.terraformes.app`. Luego en [App Store Connect](https://appstoreconnect.apple.com) → *Apps → + → New
   App*: iOS, nombre (debe estar libre en la App Store), idioma principal Español, ese identificador y un SKU
   como `terrafarm`.
3. **Llave para que GitHub suba la app**: App Store Connect → *Users and Access → Integrations → App Store
   Connect API → Team Keys → +*, con acceso **Admin** (lo necesita para firmar desde la nube). Descargar el
   archivo `.p8` (Apple deja bajarlo una sola vez) y anotar el *Key ID* y el *Issuer ID*.
4. **Team ID**: en [developer.apple.com/account](https://developer.apple.com/account) → *Membership details*.
5. Con esos datos se agrega al flujo la firma y la subida automática a TestFlight. Las llaves van como
   secretos del repo, nunca en el código.
6. **Invitar al equipo**: App Store Connect → la app → *TestFlight → Internal Testing*. Cada persona tiene que
   ser usuario de App Store Connect (se invita con su Apple ID) y recibe un correo para instalar la app desde
   TestFlight. Hasta 100 personas, sin revisión de Apple. Cada versión dura 90 días.

## Antes de la App Store pública

TestFlight interno no lo pide, pero la App Store sí:

- **Borrar la cuenta desde la app** (norma 5.1.1(v) de Apple): toda app que permite crear cuenta debe dejar
  eliminarla adentro.
- **Política de privacidad** en una dirección pública (`docs/privacidad.md` está vacío) y el cuestionario
  *App Privacy* (correo, ubicación aproximada, fotos de plagas).
- Capturas de pantalla para iPhone de 6,9 pulgadas, descripción y correo de contacto.
- Apple rechaza las apps que son solo una página web envuelta (norma 4.2); las pestañas nativas, el
  funcionamiento sin internet y la cámara ayudan, pero conviene tenerlo en cuenta.
