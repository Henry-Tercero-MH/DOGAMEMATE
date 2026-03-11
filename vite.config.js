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
          return '/macros/s/AKfycbw6SmDK2jQvKLUm3dnHmfDRIHjnz41alAz42Z6dMpjxa5Mnl4aDN0TQYVjHlIueGtmJFw/exec' + queryString;
        }
      }
    }
  }
})
