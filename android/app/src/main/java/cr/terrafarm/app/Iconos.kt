package cr.terrafarm.app

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.dp

/**
 * Los mismos íconos de la web (web/src/componentes/Iconos.tsx: trazos de 1,9 en una caja de 24),
 * para que la barra nativa se vea igual que el resto de la app. Sin librerías de íconos extra.
 */
object Iconos {
    private fun trazo(nombre: String, d: String): ImageVector =
        ImageVector.Builder(
            name = nombre,
            defaultWidth = 24.dp,
            defaultHeight = 24.dp,
            viewportWidth = 24f,
            viewportHeight = 24f,
        ).addPath(
            pathData = PathParser().parsePathString(d).toNodes(),
            fill = null,
            stroke = SolidColor(Color.Black), // Icon() lo tiñe con el color de la pestaña
            strokeLineWidth = 1.9f,
            strokeLineCap = StrokeCap.Round,
            strokeLineJoin = StrokeJoin.Round,
        ).build()

    val sembrar = trazo("sembrar", "M12 21v-8M12 13c0-4 2.5-6.5 7-6.5 0 4-2.5 6.5-7 6.5ZM12 15c0-3-2-5-6-5 0 3 2 5 6 5Z")
    val precios = trazo("precios", "M4 19V9M10 19V5M16 19v-7M22 19H2M20 5l-4 4-3-2")
    // Sol con nube (mismo trazo que "nubeSol" en web/src/componentes/Iconos.tsx): la pestaña es "Tiempo".
    val alertas = trazo("alertas", "M8.5 5.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.5 2v1.5M2 8.5h1.5M3.9 3.9l1.1 1.1M13.1 3.9l-1.1 1.1M9 20a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.5 1.5 3.3 3.3 0 0 1-1 6.5Z")
    val cursos = trazo("cursos", "M2 9l10-5 10 5-10 5L2 9ZM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6")
    val finca = trazo("finca", "M3 11l9-7 9 7M5.5 9.5V20h13V9.5M10 20v-5h4v5")
    val plaga = trazo("plaga", "M12 8a4 4 0 0 1 4 4v3a4 4 0 0 1-8 0v-3a4 4 0 0 1 4-4ZM9 6l1.5 2M15 6l-1.5 2M4 12h4M16 12h4M5 18l3-2M19 18l-3-2")

    fun de(s: Seccion): ImageVector = when (s) {
        Seccion.SEMBRAR -> sembrar
        Seccion.PRECIOS -> precios
        Seccion.ALERTAS -> alertas
        Seccion.CURSOS -> cursos
        Seccion.FINCA -> finca
    }
}
