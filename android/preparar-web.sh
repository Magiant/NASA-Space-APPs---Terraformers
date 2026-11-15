#!/bin/sh
# Compila la web (web/dist). Gradle la copia dentro de la app en cada compilación.
# Correr antes de compilar en Android Studio cada vez que cambie la web.
set -e
cd "$(dirname "$0")/.."
npm run build
echo "Listo: web/dist actualizado. Ahora compile la app en Android Studio."
