import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'TOKEN_'],
  server: {
    proxy: {
      '/health': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/register': { target: 'http://localhost:8003', changeOrigin: true },
      '/api/auth': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/ask': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
