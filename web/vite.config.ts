import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' = rutas relativas: funciona en GitHub Pages con cualquier nombre de
// repositorio. Las rutas internas van con HashRouter (/#/zona/CR30101).
export default defineConfig({
  base: './',
  plugins: [react()],
});
