package cr.terrafarm.app

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.provider.Settings
import android.webkit.GeolocationPermissions
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File

/** Pantalla única de la app: el cascarón nativo y lo que la web necesita del teléfono. */
class MainActivity : ComponentActivity(), Webs.Anfitrion {

    private lateinit var webs: Webs
    private lateinit var actualizador: Actualizador
    private var ubicacionPendiente: Pair<String, GeolocationPermissions.Callback>? = null
    private var archivoPendiente: ValueCallback<Array<Uri>>? = null
    /** Dónde guarda la cámara la foto que se toma (la cámara no la devuelve: la escribe ahí). */
    private var fotoCamara: Uri? = null

    // Correccion - Poll: si la persona había dicho "No permitir" (dos veces, o "no volver a preguntar"), Android ya no
    // muestra la pregunta y "Usar mi ubicación" fallaba sin salida. Ahora se ofrece abrir los ajustes de la app.
    /** Permiso de ubicación para "Usar mi ubicación" (se pide solo cuando la persona lo toca). */
    private val pedirPermisoUbicacion = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { r ->
        val permitido = r.values.any { it }
        ubicacionPendiente?.let { (origen, callback) -> callback.invoke(origen, permitido, false) }
        ubicacionPendiente = null
        val sePuedePreguntar = shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_FINE_LOCATION) ||
            shouldShowRequestPermissionRationale(Manifest.permission.ACCESS_COARSE_LOCATION)
        if (!permitido && !sePuedePreguntar) ofrecerAjustesUbicacion()
    }

    // Correccion - Poll: el selector solo abría la galería (o, en el navegador, solo la cámara). Ahora la persona elige:
    // tomar la foto con la cámara o buscarla en la galería.
    /** Foto del reporte de plagas: de la galería (llega en r.data) o de la cámara (queda en fotoCamara). */
    private val elegirFoto = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        val deGaleria = WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data)
        val camara = fotoCamara
        val resultado = when {
            !deGaleria.isNullOrEmpty() -> deGaleria
            r.resultCode == Activity.RESULT_OK && camara != null -> arrayOf(camara)
            else -> null
        }
        archivoPendiente?.onReceiveValue(resultado)
        archivoPendiente = null
        fotoCamara = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        webs = Webs(this, this)
        actualizador = Actualizador(applicationContext)
        setContent {
            AppTerraFarm(
                webs,
                actualizador,
                abrirPaginaDescarga = { abrirFuera(Uri.parse(Actualizador.URL_PAGINA)) },
                alSalir = { finish() },
            )
        }
        // Al abrir, revisa en segundo plano si GitHub tiene una versión más nueva de la app.
        if (savedInstanceState == null) actualizador.revisar()
    }

    override fun onDestroy() {
        webs.destruir()
        super.onDestroy()
    }

    override fun pedirUbicacion(origen: String, callback: GeolocationPermissions.Callback) {
        val permisos = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        if (permisos.any { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }) {
            callback.invoke(origen, true, false)
        } else {
            ubicacionPendiente = origen to callback
            pedirPermisoUbicacion.launch(permisos)
        }
    }

    override fun elegirArchivo(callback: ValueCallback<Array<Uri>>, intent: Intent): Boolean {
        archivoPendiente?.onReceiveValue(null) // un selector anterior sin cerrar
        archivoPendiente = callback
        // Un solo selector: las apps de galería y archivos (el intent de la web) más la cámara.
        val selector = Intent.createChooser(intent, webs.texto("Foto de la plaga", "Pest photo"))
        intentCamara()?.let { selector.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(it)) }
        return try {
            elegirFoto.launch(selector)
            true
        } catch (_: ActivityNotFoundException) {
            archivoPendiente = null
            fotoCamara = null
            false
        }
    }

    /** Cámara del teléfono, que guarda la foto en la caché de la app (FileProvider, res/xml/archivos.xml). */
    private fun intentCamara(): Intent? = runCatching {
        val archivo = File(File(cacheDir, "fotos").apply { mkdirs() }, "plaga-${System.currentTimeMillis()}.jpg")
        val uri = FileProvider.getUriForFile(this, "$packageName.archivos", archivo)
        fotoCamara = uri
        val permisos = Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION
        val camara = Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, uri).addFlags(permisos)
        // Dentro del selector el permiso de escribir no siempre llega a la cámara: se le da a cada app de cámara
        // (para verlas, el manifiesto declara <queries> con IMAGE_CAPTURE).
        packageManager.queryIntentActivities(camara, PackageManager.MATCH_DEFAULT_ONLY)
            .forEach { grantUriPermission(it.activityInfo.packageName, uri, permisos) }
        camara
    }.getOrNull()

    /** Ubicación bloqueada para siempre: explicar y llevar a los ajustes de la app, donde se permite. */
    private fun ofrecerAjustesUbicacion() {
        AlertDialog.Builder(this)
            .setTitle(webs.texto("TerraFarm no tiene permiso de ubicación", "TerraFarm has no location permission"))
            .setMessage(
                webs.texto(
                    "Android ya no vuelve a preguntar. Para usar «Usar mi ubicación», abra los ajustes de TerraFarm y en Permisos → Ubicación elija «Permitir solo mientras se usa la app».",
                    "Android will not ask again. To use “Use my location”, open TerraFarm’s settings and under Permissions → Location choose “Allow only while using the app”.",
                ),
            )
            .setPositiveButton(webs.texto("Abrir ajustes", "Open settings")) { _, _ ->
                runCatching { startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null))) }
            }
            .setNegativeButton(webs.texto("Ahora no", "Not now"), null)
            .show()
    }

    override fun abrirFuera(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            // Sin navegador: no hay a dónde abrirlo.
        }
    }
}
