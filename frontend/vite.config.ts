import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Backend target for the local dev proxy. Override with VITE_PROXY_TARGET.
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'https://bena-origins.onrender.com';
const siteUrl = (process.env.VITE_SITE_URL ?? 'https://benaorigins.de').replace(/\/+$/, '');

/** Routes that are safe to expose to crawlers as static, indexable pages. */
const PUBLIC_ROUTES = [
  '/',
  '/rwandan-products',
  '/catalog',
  '/collections',
  '/about',
  '/contact',
  '/shipping',
  '/faq',
] as const;

/**
 * A Vite SPA ships one HTML shell, so crawlers that do not run JavaScript see
 * no metadata. Emit robots.txt/sitemap.xml and SEO-critical head tags at build
 * time; react-helmet-async still replaces them with route-specific values once
 * the app hydrates.
 */
function staticSeoPlugin(): Plugin {
  const lastmod = new Date().toISOString().slice(0, 10);

  return {
    name: 'bena-static-seo',
    apply: 'build',
    transformIndexHtml(html) {
      const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'BeNa Origins',
        url: siteUrl,
        logo: `${siteUrl}/logo.webp`,
        email: 'store@benaorigins.de',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Am Galgenköppel 4',
          postalCode: '34289',
          addressLocality: 'Zierenberg',
          addressCountry: 'DE',
        },
        sameAs: [
          'https://www.instagram.com/benaorigins/',
          'https://chat.whatsapp.com/CndIu3wGBVgJsgi7Q6Q6Xi',
        ],
      };

      const head = [
        `    <link rel="canonical" href="${siteUrl}/" />`,
        '    <meta property="og:site_name" content="BeNa Origins" />',
        `    <meta property="og:image" content="${siteUrl}/logo.webp" />`,
        '    <meta name="twitter:card" content="summary_large_image" />',
        '    <meta name="twitter:title" content="BeNa Origins — Rwandan coffee, food & crafts" />',
        '    <meta name="twitter:description" content="Rwandan coffee, pantry staples and handwoven crafts, sourced with care and delivered across Europe." />',
        `    <meta name="twitter:image" content="${siteUrl}/logo.webp" />`,
        `    <script type="application/ld+json">${JSON.stringify(organization)}</script>`,
      ].join('\n');

      return html.replace('</head>', `${head}\n  </head>`);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      });

      const urls = PUBLIC_ROUTES.map(
        (route) =>
          `  <url>\n    <loc>${siteUrl}${route}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
      ).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

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
  plugins: [react(), tailwindcss(), staticSeoPlugin()],
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
