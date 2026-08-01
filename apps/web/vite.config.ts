import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Read the VERSION file dynamically
const version = fs.readFileSync(path.resolve(__dirname, '../../VERSION'), 'utf-8').trim()

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // B3: 'hidden' genera los sourcemaps para debugging pero no los referencia
    // desde los bundles públicos (no se descargan ni exponen en producción).
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // B3: separa las libs pesadas del chunk principal. recharts (~400KB) y
        // react solo cambian al actualizar deps, así el navegador los cachea
        // entre deploys y el chunk de la app queda mucho más liviano.
        manualChunks: {
          recharts: ['recharts'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
