import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { prepararCatalogo } from './servicios/algolia';
import './temas/crema.css';
import './temas/azul.css';
import './estilos.css';

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
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
