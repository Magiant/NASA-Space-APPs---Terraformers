import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { prepararCatalogo } from './servicios/algolia';
import './temas/crema.css';
import './temas/azul.css';
import './estilos.css';

// Correccion - Poll: si el enlace del correo "¿Olvido su contrasena?" ya habia vencido, Supabase dejaba el error en la
// direccion (#error=...&error_code=otp_expired) y la app mostraba "Pagina no encontrada". Ahora lleva a #/nueva-clave,
// que explica que el enlace vencio y como pedir otro.
if (/(^#|&)(error_code|error_description)=/.test(window.location.hash)) {
  window.history.replaceState(null, '', '#/nueva-clave');
}

const raiz = createRoot(document.getElementById('root')!);
const mostrar = () =>
  raiz.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

// Antes de mostrar la app se cargan los 492 distritos (o la copia guardada en el celular).
// Si no hay forma de cargarlos, la app abre igual y el selector queda vacío hasta que vuelva la señal.
prepararCatalogo().catch((e) => console.warn('No se pudieron cargar los distritos:', e)).finally(mostrar);

// PWA: guarda lo consultado para abrir con mala señal (solo en la versión publicada).
// Dentro de las apps de iPhone y Android no hace falta: la web ya va empaquetada en la app.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !document.documentElement.dataset.nativo) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
