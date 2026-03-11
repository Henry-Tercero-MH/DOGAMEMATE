import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/proxy': {
        target: 'https://script.google.com',
        changeOrigin: true,
        followRedirects: true,
        rewrite: (path) => {
          // Reescribir /api/proxy a la URL completa del Apps Script
          const queryString = path.replace('/api/proxy', '');
          return '/macros/s/AKfycbzOG4GMPXOEI95ISChSMxuHg2qs70_Yp1eoNrekYFZ4rZGAa7h21jx2JK-PRJGUZhnIRg/exec' + queryString;
        }
      }
    }
  }
})
