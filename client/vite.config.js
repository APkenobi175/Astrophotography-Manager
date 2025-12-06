import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      input: "./src/main.jsx"
    },
    outDir: "../_server/core/static/core"
  },
  base: "/static"
  ,
  // Dev server proxy so requests from the Vite origin can reach Django
  // This forwards API and media requests to the Django dev server.
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/media': 'http://localhost:8000'
    }
  }
})
