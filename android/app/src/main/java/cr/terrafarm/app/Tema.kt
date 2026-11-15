package cr.terrafarm.app

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Mismos colores que la web (web/src/temas/crema.css y azul.css).
private val Claro = lightColorScheme(
    primary = Color(0xFF1F5A35),
    onPrimary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFE1EDDF),   // fondo de la pestaña elegida
    onSecondaryContainer = Color(0xFF1F5A35),
    background = Color(0xFFF4F1E8),
    surface = Color(0xFFFFFDF8),
    onSurface = Color(0xFF1B241D),
    onSurfaceVariant = Color(0xFF55605A),
    outline = Color(0xFFDDD8C8),
)

private val Oscuro = darkColorScheme(
    primary = Color(0xFF5FC27D),
    onPrimary = Color(0xFF07140B),
    secondaryContainer = Color(0xFF17331F),
    onSecondaryContainer = Color(0xFF7ED99A),
    background = Color(0xFF0B1120),
    surface = Color(0xFF131C31),
    onSurface = Color(0xFFE8EDF7),
    onSurfaceVariant = Color(0xFFA3AFC6),
    outline = Color(0xFF26324D),
)

@Composable
fun TemaTerraFarm(oscuro: Boolean, contenido: @Composable () -> Unit) {
    val vista = LocalView.current
    if (!vista.isInEditMode) {
        // Íconos de la barra de estado y de navegación legibles sobre el fondo de la app.
        SideEffect {
            val ventana = (vista.context as Activity).window
            WindowCompat.getInsetsController(ventana, vista).apply {
                isAppearanceLightStatusBars = !oscuro
                isAppearanceLightNavigationBars = !oscuro
            }
        }
    }
    MaterialTheme(colorScheme = if (oscuro) Oscuro else Claro, content = contenido)
}
