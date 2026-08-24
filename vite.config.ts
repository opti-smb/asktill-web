import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// Vercel dashboard keys are on process.env at build time. Bake publishable only (never secret).
const clerkPublishableKey = (
  process.env.VITE_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  ''
).trim()

export default defineConfig({
  plugins: [react()],
  define: clerkPublishableKey
    ? {
        'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkPublishableKey),
        'import.meta.env.CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkPublishableKey),
      }
    : {},
  // Do not add a CLERK_ prefix — that would leak CLERK_SECRET_KEY into the browser bundle.
  envPrefix: ['VITE_', 'TOKEN_', 'CLERK_PUBLISHABLE_KEY', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'],
  resolve: {
    // Vendored packages — works on Vercel (no sibling-repo dependency).
    alias: {
      '@asktill/channel-partners': path.resolve(rootDir, 'packages/channel-partners/src'),
      '@asktill/chargebacks': path.resolve(rootDir, 'packages/chargebacks/src'),
    },
    dedupe: [
      '@asktill/calculators',
      '@asktill/channel-partners',
      '@asktill/chargebacks',
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      'lucide-react',
    ],
  },
  optimizeDeps: {
    include: [
      'recharts',
      'lucide-react',
      'framer-motion',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      allow: [
        rootDir,
        path.resolve(rootDir, 'packages/calculators'),
        path.resolve(rootDir, 'packages/channel-partners'),
        path.resolve(rootDir, 'packages/chargebacks'),
      ],
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
      '/api/admin': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/analytics': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/checkout': { target: 'http://localhost:8005', changeOrigin: true },
      '/api/billing': { target: 'http://localhost:8005', changeOrigin: true },
      '/api/ask': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/plaid-statements': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/plaid': { target: 'http://localhost:3000', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
