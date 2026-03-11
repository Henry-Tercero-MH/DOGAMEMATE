import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://script.google.com/macros/s/AKfycbyMssiCUXl0ZaS6bwuUbdPvY21VzDVb7NWpbLZUwApo4TzQb4jgPOy_fX2IJ34fkesIqQ/exec',
        changeOrigin: true,
        rewrite: (path) => '',
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Reescribir la URL completa con query params
            const fullUrl = 'https://script.google.com/macros/s/AKfycbyMssiCUXl0ZaS6bwuUbdPvY21VzDVb7NWpbLZUwApo4TzQb4jgPOy_fX2IJ34fkesIqQ/exec' + (req.url?.replace('/api/proxy', '') || '');
            proxyReq.path = fullUrl.replace('https://script.google.com', '');
          });
        }
      }
    }
  }
})
