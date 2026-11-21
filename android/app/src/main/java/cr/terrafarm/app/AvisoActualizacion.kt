package cr.terrafarm.app

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties

/**
 * Ventana "Hay una versión nueva de TerraFarm" (ver Actualizador): ofrecerla, bajarla mostrando el avance y
 * explicar qué hacer si algo sale mal. En el idioma que la persona eligió en Ajustes.
 */
@Composable
fun AvisoActualizacion(a: Actualizador, webs: Webs, abrirPagina: () -> Unit) {
    val t = webs::texto
    when (val e = a.estado) {
        Actualizador.Estado.Nada -> Unit

        is Actualizador.Estado.Disponible -> AlertDialog(
            onDismissRequest = a::despues,
            title = { Text(t("Hay una versión nueva de TerraFarm", "A new version of TerraFarm is available")) },
            text = {
                Text(
                    t(
                        "Trae las mejoras más recientes (versión ${e.version}). Se baja aquí mismo y Android le pide confirmar la instalación. Su sesión y sus datos se conservan.",
                        "It brings the latest improvements (version ${e.version}). It downloads right here and Android asks you to confirm the installation. Your session and data are kept.",
                    ),
                )
            },
            confirmButton = { Button(onClick = a::actualizar) { Text(t("Actualizar", "Update")) } },
            dismissButton = { TextButton(onClick = a::despues) { Text(t("Después", "Later")) } },
        )

        is Actualizador.Estado.Bajando -> {
            val avance = e.avance
            AlertDialog(
                onDismissRequest = {},
                properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false),
                title = { Text(t("Bajando la actualización…", "Downloading the update…")) },
                text = {
                    Column {
                        if (avance == null) LinearProgressIndicator(Modifier.fillMaxWidth())
                        else LinearProgressIndicator(progress = { avance }, modifier = Modifier.fillMaxWidth())
                        Spacer(Modifier.height(12.dp))
                        Text(if (avance == null) t("Conectando…", "Connecting…") else "${(avance * 100).toInt()} %")
                    }
                },
                confirmButton = {},
                dismissButton = { TextButton(onClick = a::cancelar) { Text(t("Cancelar", "Cancel")) } },
            )
        }

        Actualizador.Estado.ErrorRed -> AlertDialog(
            onDismissRequest = a::despues,
            title = { Text(t("No se pudo bajar la actualización", "The update could not be downloaded")) },
            text = { Text(t("Revise la señal e intente de nuevo.", "Check your connection and try again.")) },
            confirmButton = { Button(onClick = a::actualizar) { Text(t("Reintentar", "Try again")) } },
            dismissButton = { TextButton(onClick = a::despues) { Text(t("Cerrar", "Close")) } },
        )

        Actualizador.Estado.FirmaDistinta -> AlertDialog(
            onDismissRequest = a::despues,
            title = { Text(t("Esta vez hay que instalarla a mano", "This time it must be installed by hand")) },
            text = {
                Text(
                    t(
                        "La versión nueva viene firmada con otra llave, así que Android no deja instalarla encima de esta. Envíe antes los reportes pendientes, desinstale TerraFarm y bájela de nuevo desde la página de descargas.",
                        "The new version is signed with a different key, so Android won't install it over this one. Send any pending reports first, uninstall TerraFarm and download it again from the download page.",
                    ),
                )
            },
            confirmButton = { Button(onClick = { a.despues(); abrirPagina() }) { Text(t("Abrir la página", "Open the page")) } },
            dismissButton = { TextButton(onClick = a::despues) { Text(t("Cerrar", "Close")) } },
        )
    }
}
