import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages el sitio vive en https://<usuario>.github.io/<repo>/
// por eso el base debe ser el nombre del repositorio.
export default defineConfig({
  plugins: [react()],
  base: '/NASA-Space-APPs---Terraformers/',
})
