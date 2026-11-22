import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { buildSeoPlugin } from './seo/buildSeo';

// Backend target for the local dev proxy. Override with VITE_PROXY_TARGET.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'https://bena-origins.onrender.com';

/** Keep heavy libraries in cacheable vendor chunks instead of one huge bundle. */
function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return;
  const path = id.replace(/\\/g, '/');
  const match = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(path);
  const pkg = match?.[1] ?? '';

  if (['react', 'react-dom', 'scheduler'].includes(pkg)) return 'react-vendor';
  if (['framer-motion', 'motion-dom', 'motion-utils'].includes(pkg)) return 'motion';
  if (['react-router', 'react-router-dom', '@remix-run'].includes(pkg)) return 'router';
  if (pkg.startsWith('@tanstack')) return 'query';
  if (pkg.includes('i18next')) return 'i18n';
  if (pkg === 'lucide-react') return 'icons';
  if (pkg === 'socket.io-client' || pkg.startsWith('engine.io')) return 'socket';
  if (pkg.startsWith('@hookform') || ['zod', 'react-hook-form'].includes(pkg)) return 'forms';
  if (pkg === 'dompurify') return 'sanitize';
  return 'vendor';
}

export default defineConfig({
  plugins: [react(), tailwindcss(), buildSeoPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: true,
        // The backend allowlist contains production origins, not localhost.
        // A same-origin dev proxy must not leak the browser's local Origin.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('Origin');
          });
        },
      },
      '/socket.io': {
        target: proxyTarget,
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('Origin');
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
