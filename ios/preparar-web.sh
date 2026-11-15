#!/bin/sh
# Construye la web y la copia a ios/Web (la carpeta que la app lleva adentro).
# Correr antes de compilar en Xcode cada vez que cambie la web.
set -e
cd "$(dirname "$0")/../web"
npx vite build
rm -rf ../ios/Web
cp -R dist ../ios/Web
find ../ios/Web -name '.*' -prune -exec rm -rf {} +
echo "Listo: ios/Web actualizado."
