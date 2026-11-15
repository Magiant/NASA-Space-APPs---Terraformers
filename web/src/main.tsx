import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './temas/crema.css';
import './temas/azul.css';
import './estilos.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: guarda lo consultado para abrir con mala señal (solo en la versión publicada).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
