import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'TOKEN_'],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Avoid native file-watcher stack crashes on Windows 11 build 26200 + Node 24.
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
    proxy: {
      '/health': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/register': { target: 'http://localhost:8003', changeOrigin: true },
      '/api/auth': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/checkout': { target: 'http://localhost:8005', changeOrigin: true },
      '/api/billing': { target: 'http://localhost:8005', changeOrigin: true },
      '/api/ask': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
