import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'TOKEN_'],
  resolve: {
    // Vendored calculator package (packages/calculators) — also works on Vercel.
    dedupe: ['@asktill/calculators'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      allow: [rootDir, path.resolve(rootDir, 'packages/calculators')],
    },
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
