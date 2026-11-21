package cr.terrafarm.app

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

/** Pantalla única de la app: el cascarón nativo y lo que la web necesita del teléfono. */
class MainActivity : ComponentActivity(), Webs.Anfitrion {

    private lateinit var webs: Webs
    private lateinit var actualizador: Actualizador
    private var ubicacionPendiente: Pair<String, GeolocationPermissions.Callback>? = null
    private var archivoPendiente: ValueCallback<Array<Uri>>? = null

    /** Permiso de ubicación para "Usar mi ubicación" (se pide solo cuando la persona lo toca). */
    private val pedirPermisoUbicacion = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { r ->
        ubicacionPendiente?.let { (origen, callback) -> callback.invoke(origen, r.values.any { it }, false) }
        ubicacionPendiente = null
    }

    /** Selector de fotos del reporte de plagas (cámara o galería, según el teléfono). */
    private val elegirFoto = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        archivoPendiente?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data))
        archivoPendiente = null
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
        return try {
            elegirFoto.launch(intent)
            true
        } catch (_: ActivityNotFoundException) {
            archivoPendiente = null
            false
        }
    }

    override fun abrirFuera(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (_: ActivityNotFoundException) {
            // Sin navegador: no hay a dónde abrirlo.
        }
    }
}
