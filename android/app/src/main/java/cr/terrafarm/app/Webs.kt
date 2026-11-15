package cr.terrafarm.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.ViewGroup
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Una vista web por pestaña, como en la app de iPhone (ios/Terraformes/PaginaWeb.swift).
 *
 * La web va empaquetada dentro de la app (assets) y se sirve bajo https://appassets.androidplatform.net/
 * con WebViewAssetLoader: un origen https propio (los módulos JS de Vite no cargan desde file://) y
 * compartido por todas las pestañas, así comparten la sesión y lo guardado en el teléfono (localStorage).
 * Las llamadas a internet (Supabase, relieve de NASA, clima) salen normal.
 */
class Webs(private val contexto: Context, private val anfitrion: Anfitrion) {

    /** Lo que la vista web le pide a la pantalla (permisos, elegir una foto, abrir un enlace afuera). */
    interface Anfitrion {
        fun pedirUbicacion(origen: String, callback: GeolocationPermissions.Callback)
        fun elegirArchivo(callback: ValueCallback<Array<Uri>>, intent: Intent): Boolean
        fun abrirFuera(uri: Uri)
    }

    /** Idioma y tema elegidos en Ajustes de la web; la barra nativa los sigue (null = el del teléfono). */
    var ingles by mutableStateOf(Locale.getDefault().language == "en")
        private set
    var oscuro by mutableStateOf<Boolean?>(null)
        private set

    private val vistas = mutableMapOf<Seccion, WebView>()
    private val principal = Handler(Looper.getMainLooper())
    private val cargador = WebViewAssetLoader.Builder()
        .setDomain(HOST)
        .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(contexto))
        .build()

    fun texto(es: String, en: String) = if (ingles) en else es

    /** La vista de la pestaña si ya se abrió (para "Atrás"). */
    fun existente(s: Seccion): WebView? = vistas[s]

    fun vista(s: Seccion): WebView = vistas.getOrPut(s) { crear().also { it.loadUrl(url(s.ruta)) } }

    /** Lleva la pestaña a otra ruta de la web (p. ej. el botón "Reportar una plaga"). */
    fun ir(s: Seccion, ruta: String) {
        vista(s).evaluateJavascript("location.hash = '#$ruta'", null)
    }

    fun destruir() {
        vistas.values.forEach {
            (it.parent as? ViewGroup)?.removeView(it)
            it.destroy()
        }
        vistas.clear()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun crear(): WebView = WebView(contexto).apply {
        // Mismo fondo que la web (token `fondo`), para que no se vea un destello blanco al cargar.
        val noche = contexto.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        setBackgroundColor(if (oscuro ?: noche) 0xFF0B1120.toInt() else 0xFFF4F1E8.toInt())
        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true          // sesión, preferencias y copia de datos para usar sin señal
            setGeolocationEnabled(true)       // "Usar mi ubicación"
            allowFileAccess = false
            allowContentAccess = false
            // Respeta el tamaño de letra que la persona eligió en el teléfono.
            textZoom = (contexto.resources.configuration.fontScale * 100).roundToInt()
        }
        webViewClient = Cliente()
        webChromeClient = ClienteChrome()

        // La web oculta su propia barra y botón flotante cuando ve esta marca (ver web/src/estilos.css).
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(this, MARCA, setOf(ORIGEN))
        }

        // Puente: la web avisa el idioma y el tema con  preferencias.postMessage(json).
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(this, "preferencias", setOf(ORIGEN)) { _, mensaje, _, _, _ ->
                mensaje.data?.let(::recibir)
            }
        } else {
            // WebView viejo: mismo nombre y misma forma de llamarlo desde la web.
            addJavascriptInterface(PuenteJs { texto -> principal.post { recibir(texto) } }, "preferencias")
        }

        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true) // chrome://inspect
    }

    /** Aplica idioma/tema y los repite en las demás pestañas (cada una es su propia vista web). */
    private fun recibir(texto: String) {
        val datos = runCatching { JSONObject(texto) }.getOrNull() ?: return
        // Solo se aceptan los valores conocidos; así nada raro llega a evaluateJavascript.
        val limpio = JSONObject()
        datos.optString("idioma").takeIf { it == "es" || it == "en" }?.let { ingles = it == "en"; limpio.put("idioma", it) }
        datos.optString("tema").takeIf { it == "crema" || it == "azul" }?.let { oscuro = it == "azul"; limpio.put("tema", it) }
        if (limpio.length() == 0) return
        val js = "dispatchEvent(new CustomEvent('tf-preferencias', { detail: $limpio }))"
        vistas.values.forEach { it.evaluateJavascript(js, null) }
    }

    private inner class Cliente : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
            cargador.shouldInterceptRequest(request.url)

        /** Los enlaces a otros sitios (créditos de fotos, fuentes) se abren en el navegador. */
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            if (request.url.host == HOST) return false
            anfitrion.abrirFuera(request.url)
            return true
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            // Sin DOCUMENT_START_SCRIPT (WebView muy viejo), poner la marca lo antes posible.
            if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) view.evaluateJavascript(MARCA, null)
        }
    }

    private inner class ClienteChrome : WebChromeClient() {
        override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) =
            anfitrion.pedirUbicacion(origin, callback)

        /** "Tomar o subir foto" del reporte de plagas. */
        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams,
        ): Boolean = anfitrion.elegirArchivo(filePathCallback, fileChooserParams.createIntent())
    }

    private class PuenteJs(private val alRecibir: (String) -> Unit) {
        @JavascriptInterface
        fun postMessage(texto: String) = alRecibir(texto)
    }

    companion object {
        const val HOST = "appassets.androidplatform.net"
        const val ORIGEN = "https://$HOST"
        private const val MARCA = "document.documentElement.dataset.nativo = 'android';"
        fun url(ruta: String) = "$ORIGEN/index.html#$ruta"
    }
}
