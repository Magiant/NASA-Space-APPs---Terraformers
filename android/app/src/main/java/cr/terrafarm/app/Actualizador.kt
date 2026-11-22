package cr.terrafarm.app

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Actualización dentro de la app. El APK se instala a mano desde GitHub, así que ninguna tienda avisa cuando hay
 * uno nuevo: al abrir, la app lee version.json de la versión del repo "app-android" (lo publica
 * .github/workflows/android.yml junto al APK) y, si el número es mayor que el instalado, ofrece actualizar.
 * Al aceptar, baja el APK dentro de la app y abre el instalador de Android, que siempre pide confirmar.
 *
 * Android solo instala encima si el APK nuevo tiene la misma firma que el instalado: por eso se comprueba antes
 * y, si no coincide (APK firmado con una llave de prueba), se explica en vez de mostrar un error del sistema.
 */
class Actualizador(private val contexto: Context) {

    sealed interface Estado {
        data object Nada : Estado
        data class Disponible(val version: String) : Estado
        /** avance de 0 a 1, o null mientras no se sabe el tamaño. */
        data class Bajando(val avance: Float?) : Estado
        data object ErrorRed : Estado
        data object FirmaDistinta : Estado
    }

    var estado by mutableStateOf<Estado>(Estado.Nada)
        private set

    private val principal = Handler(Looper.getMainLooper())
    @Volatile private var cancelada = false

    /** Revisa en segundo plano si hay una versión nueva. Sin señal o con cualquier error, no dice nada. */
    fun revisar() {
        // Compilada en la computadora (sin número de GitHub): no tiene con qué compararse.
        if (BuildConfig.VERSION_CODE <= 1) return
        Thread {
            val nueva = runCatching { JSONObject(leerTexto(URL_VERSION)) }.getOrNull() ?: return@Thread
            val codigo = nueva.optInt("versionCode", 0)
            if (codigo > BuildConfig.VERSION_CODE) {
                val nombre = nueva.optString("versionName", codigo.toString())
                principal.post { if (estado == Estado.Nada) estado = Estado.Disponible(nombre) }
            }
        }.start()
    }

    fun despues() {
        estado = Estado.Nada
    }

    fun cancelar() {
        cancelada = true
        estado = Estado.Nada
    }

    /** Baja el APK a la caché de la app, comprueba la firma y abre el instalador de Android. */
    fun actualizar() {
        cancelada = false
        estado = Estado.Bajando(null)
        Thread {
            try {
                val apk = File(File(contexto.cacheDir, "actualizacion").apply { mkdirs() }, "TerraFarm.apk")
                bajar(URL_APK, apk)
                if (cancelada) return@Thread
                if (!mismaFirma(apk)) {
                    principal.post { estado = Estado.FirmaDistinta }
                    return@Thread
                }
                principal.post {
                    estado = Estado.Nada
                    instalar(apk)
                }
            } catch (_: Exception) {
                if (!cancelada) principal.post { estado = Estado.ErrorRed }
            }
        }.start()
    }

    private fun conectar(direccion: String): HttpURLConnection =
        (URL(direccion).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15_000
            readTimeout = 30_000
            instanceFollowRedirects = true // GitHub manda los archivos de las versiones a otro servidor
            setRequestProperty("Cache-Control", "no-cache")
        }

    private fun leerTexto(direccion: String): String {
        val c = conectar(direccion)
        try {
            if (c.responseCode != 200) throw IllegalStateException("HTTP ${c.responseCode}")
            return c.inputStream.bufferedReader().use { it.readText() }
        } finally {
            c.disconnect()
        }
    }

    private fun bajar(direccion: String, destino: File) {
        val c = conectar(direccion)
        try {
            if (c.responseCode != 200) throw IllegalStateException("HTTP ${c.responseCode}")
            val total = c.contentLengthLong
            var llevamos = 0L
            var ultimo = -1
            c.inputStream.use { entrada ->
                destino.outputStream().use { salida ->
                    val bufer = ByteArray(64 * 1024)
                    while (true) {
                        if (cancelada) return
                        val n = entrada.read(bufer)
                        if (n < 0) break
                        salida.write(bufer, 0, n)
                        llevamos += n
                        val porcentaje = if (total > 0) (llevamos * 100 / total).toInt() else -1
                        if (porcentaje != ultimo) { // no más de 100 avisos a la pantalla
                            ultimo = porcentaje
                            val avance = if (total > 0) llevamos.toFloat() / total else null
                            principal.post { if (!cancelada) estado = Estado.Bajando(avance) }
                        }
                    }
                }
            }
        } finally {
            c.disconnect()
        }
    }

    /** ¿El APK bajado tiene la misma firma que la app instalada? Si no se puede saber, se deja decidir a Android. */
    @Suppress("DEPRECATION") // getPackageArchiveInfo(String, Int) y GET_SIGNATURES sirven en todas las versiones
    private fun mismaFirma(apk: File): Boolean {
        val pm = contexto.packageManager
        val (nueva, actual) = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val n = pm.getPackageArchiveInfo(apk.path, PackageManager.GET_SIGNING_CERTIFICATES)?.signingInfo?.apkContentsSigners
            val a = pm.getPackageInfo(contexto.packageName, PackageManager.GET_SIGNING_CERTIFICATES).signingInfo?.apkContentsSigners
            n to a
        } else {
            val n = pm.getPackageArchiveInfo(apk.path, PackageManager.GET_SIGNATURES)?.signatures
            val a = pm.getPackageInfo(contexto.packageName, PackageManager.GET_SIGNATURES).signatures
            n to a
        }
        if (nueva.isNullOrEmpty() || actual.isNullOrEmpty()) return true
        return nueva.toSet() == actual.toSet()
    }

    /** Abre el instalador de Android. La primera vez, Android pide permitir instalar apps desde TerraFarm. */
    private fun instalar(apk: File) {
        val uri = FileProvider.getUriForFile(contexto, "${contexto.packageName}.archivos", apk)
        val intento = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { contexto.startActivity(intento) }.onFailure { estado = Estado.ErrorRed }
    }

    companion object {
        private const val DESCARGAS = "https://github.com/Magiant/TerraFarm/releases/download/app-android"
        const val URL_APK = "$DESCARGAS/TerraFarm.apk"
        const val URL_VERSION = "$DESCARGAS/version.json"
        /** Página de la versión, para bajarla a mano cuando la firma no coincide. */
        const val URL_PAGINA = "https://github.com/Magiant/TerraFarm/releases/tag/app-android"
    }
}
