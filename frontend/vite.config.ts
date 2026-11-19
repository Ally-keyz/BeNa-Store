import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Backend target for the local dev proxy. Override with VITE_PROXY_TARGET.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'https://bena-origins.onrender.com';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
});
