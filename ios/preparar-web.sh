#!/bin/sh
# Construye la web y la copia a ios/Web (la carpeta que la app lleva adentro).
# Correr antes de compilar en Xcode cada vez que cambie la web.
set -e
cd "$(dirname "$0")/../web"
# La web lee sus llaves del .env de la raíz. Si solo existe web/.env (copia vieja), se usan de ahí
# únicamente las variables públicas VITE_*; las secretas nunca entran a la app.
if [ ! -f ../.env ] && [ -f .env ]; then
  set -a; eval "$(grep -E '^VITE_[A-Z_]+=' .env)"; set +a
fi
npx vite build
rm -rf ../ios/Web
cp -R dist ../ios/Web
find ../ios/Web -name '.*' -prune -exec rm -rf {} +
echo "Listo: ios/Web actualizado."
