import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' = rutas relativas: funciona en GitHub Pages con cualquier nombre de
// repositorio. Las rutas internas van con HashRouter (/#/zona/CR30101).
// envDir '..': el .env está en la raíz del proyecto. Vite solo pasa a la web las variables VITE_*
// (llaves públicas); la service_role y las demás llaves secretas nunca llegan al navegador.
export default defineConfig({
  base: './',
  envDir: '..',
  plugins: [react()],
});
