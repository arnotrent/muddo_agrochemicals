import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Splits the always-needed core (React/Router) from page-specific
        // code, and keeps heavy per-feature libraries (maps, charts) in
        // their own chunks that only load on the pages that use them —
        // route-level code splitting (see App.jsx) already isolates most
        // of this, this just gives the vendor layer a stable, cacheable
        // chunk name across deploys.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          maps: ['leaflet', 'react-leaflet'],
          charts: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
})
