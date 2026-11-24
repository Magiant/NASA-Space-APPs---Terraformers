// Service worker mínimo: guarda lo consultado para que la app abra con mala señal.
// Red primero; si no hay conexión, responde con la última copia guardada.
const CACHE = 'terrafarm-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
        return res;
      })
      // Correccion - Poll: sin copia de un archivo (por ejemplo el codigo de la pantalla del dron), se respondia con la
      // pagina principal, y la app quedaba en blanco. Ahora la pagina principal solo reemplaza a otra pagina; para un
      // archivo que falta se responde con un error, y la app muestra "No se pudo abrir esta pantalla".
      .catch(() => caches.match(req).then((r) => r || (req.mode === 'navigate' ? caches.match('./') : Response.error())))
  );
});
