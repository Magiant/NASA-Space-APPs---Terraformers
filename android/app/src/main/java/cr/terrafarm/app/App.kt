package cr.terrafarm.app

import android.view.ViewGroup
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.viewinterop.AndroidView

/** Las cinco secciones de la web, cada una con su ruta (HashRouter), igual que en la app de iPhone. */
enum class Seccion(val ruta: String, val es: String, val en: String) {
    SEMBRAR("/sembrar", "Sembrar", "Plant"),
    PRECIOS("/precios", "Precios", "Prices"),
    ALERTAS("/alertas", "Tiempo", "Weather"), // pronóstico del tiempo + alertas de la CNE y el IMN
    CURSOS("/capacitaciones", "Cursos", "Courses"),
    FINCA("/mi-finca", "Mi finca", "My farm"),
}

/**
 * Cascarón nativo: Android dibuja la barra de pestañas (Material 3) y el botón "Reportar una plaga";
 * el contenido de cada pestaña es la web empaquetada dentro de la app (funciona sin internet).
 */
@Composable
fun AppTerraFarm(webs: Webs, alSalir: () -> Unit) {
    var seccion by rememberSaveable { mutableStateOf(Seccion.SEMBRAR) }
    // Mismo tema que en Ajustes de la web (null = el del teléfono).
    val oscuro = webs.oscuro ?: isSystemInDarkTheme()

    TemaTerraFarm(oscuro) {
        // Botón "Atrás" del teléfono: primero vuelve dentro de la página, luego a Sembrar y al final sale.
        BackHandler {
            val web = webs.existente(seccion)
            when {
                web?.canGoBack() == true -> web.goBack()
                seccion != Seccion.SEMBRAR -> seccion = Seccion.SEMBRAR
                else -> alSalir()
            }
        }

        Scaffold(
            containerColor = MaterialTheme.colorScheme.surface,
            bottomBar = {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    Seccion.entries.forEach { s ->
                        NavigationBarItem(
                            selected = s == seccion,
                            // Tocar la pestaña en la que ya está la lleva al inicio de esa sección.
                            onClick = { if (s == seccion) webs.ir(s, s.ruta) else seccion = s },
                            icon = { Icon(Iconos.de(s), contentDescription = null) },
                            label = { Text(webs.texto(s.es, s.en), maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        )
                    }
                }
            },
            floatingActionButton = {
                ExtendedFloatingActionButton(
                    onClick = { webs.ir(seccion, "/reportar-plaga") },
                    icon = { Icon(Iconos.plaga, contentDescription = null) },
                    text = { Text(webs.texto("Reportar una plaga", "Report a pest")) },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                )
            },
        ) { relleno ->
            // Cada pestaña conserva su propia vista web (y dónde quedó); al cambiar se muestra la otra.
            key(seccion) {
                AndroidView(
                    factory = { webs.vista(seccion).also { (it.parent as? ViewGroup)?.removeView(it) } },
                    modifier = Modifier.fillMaxSize().padding(relleno),
                )
            }
        }
    }
}
