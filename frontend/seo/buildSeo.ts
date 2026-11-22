/**
 * Build-time SEO generation for the BeNa Origins SPA.
 *
 * Runs after Vite has written dist/ and:
 *   - replaces the static head block in index.html with home defaults,
 *   - fetches real sitemap + metadata from the backend /api/v1/seo endpoints,
 *   - emits a full sitemap.xml and robots.txt,
 *   - writes prerendered HTML for every product / collection / info page,
 *   - writes noindex HTML for private routes (cart, search, account).
 *
 * The build never fails because of a backend outage: every fetch is retried and
 * falls back to local data. Set SEO_API_BASE_URL to override the API origin.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { PRODUCT_STORIES } from '../src/content/productStories';

const SEO_START = '<!-- BENA_SEO_START -->';
const SEO_END = '<!-- BENA_SEO_END -->';
const SITE_URL = (process.env.VITE_SITE_URL || 'https://benaorigins.de').replace(/\/+$/, '');
const SITEMAP_LIMIT = 1000;
const GOOGLE_VERIFICATION =
  '    <meta name="google-site-verification" content="VVgAyrkEyfPbGh5F9Ec1mZfiqBEOzJSDobuZC8cdJHQ" />';

interface StaticPage {
  title: string;
  description: string;
  type?: string;
}

interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  openGraph: { title: string; description: string; url: string; type: string; image: string | null };
  twitter: { card: string; title: string; description: string; image: string | null };
  jsonLd: unknown[];
}

interface SitemapEntry {
  url: string;
  lastModified: string | null;
  changeFrequency: string;
  priority: number;
}

interface SitemapPayload {
  entries: SitemapEntry[];
  truncated: boolean;
  notes: string[];
}

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
}

const STATIC_PAGES: Record<string, StaticPage> = {
  '/': {
    title: 'BeNa Origins — African coffee, food & crafts',
    description:
      'African coffee, pantry staples and handwoven crafts, sourced with care and delivered across Europe.',
    type: 'website',
  },
  '/african-products': {
    title: 'African products | BeNa Origins',
    description: 'Shop Rwandan coffee, pantry staples and handcrafted goods from BeNa Origins.',
    type: 'website',
  },
  '/catalog': {
    title: 'Shop the full catalog | BeNa Origins',
    description: 'Browse every coffee, food and craft product currently available from BeNa Origins.',
    type: 'website',
  },
  '/collections': {
    title: 'Collections | BeNa Origins',
    description: 'Explore BeNa Origins collections of African coffee, food and handwoven crafts.',
    type: 'website',
  },
  '/about': {
    title: 'About us | BeNa Origins',
    description: 'Learn how BeNa Origins sources African coffee, food and crafts with care.',
    type: 'website',
  },
  '/contact': {
    title: 'Contact | BeNa Origins',
    description: 'Get in touch with BeNa Origins about orders, products or wholesale.',
    type: 'website',
  },
  '/shipping': {
    title: 'Shipping & delivery | BeNa Origins',
    description: 'Shipping options, delivery times and costs for BeNa Origins orders.',
    type: 'website',
  },
  '/faq': {
    title: 'FAQ | BeNa Origins',
    description: 'Answers to common questions about BeNa Origins products and ordering.',
    type: 'website',
  },
};

for (const story of PRODUCT_STORIES) {
  STATIC_PAGES[`/about/products/${story.slug}`] = {
    title: `${story.title.en} | BeNa Origins`,
    description: story.summary.en,
    type: 'article',
  };
}

/** Routes that must never be indexed; they still boot the SPA after hydration. */
const PRIVATE_ROUTES = [
  '/cart',
  '/search',
  '/account',
  '/account/login',
  '/account/orders',
  '/account/addresses',
  '/checkout',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function apiBase(): string {
  const configured = process.env.SEO_API_BASE_URL || process.env.VITE_API_BASE_URL || '';
  const clean = (configured || 'https://bena-origins.onrender.com/api/v1').replace(/\/+$/, '');
  return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteImage(value: string | null | undefined): string {
  if (!value) return `${SITE_URL}/logo.webp`;
  return value.startsWith('http') ? value : `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

async function getText(path: string): Promise<string | null> {
  const url = `${apiBase()}${path}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(20_000),
        headers: { accept: 'application/json, text/plain, */*' },
      });
      if (response.ok) return await response.text();
      if (response.status < 500) return null;
    } catch {
      // Backend may be cold-starting; retry below.
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }
  return null;
}

async function getJson<T>(path: string): Promise<T | null> {
  const raw = await getText(path);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function getSitemap(): Promise<SitemapPayload | null> {
  const payload = await getJson<{ success?: boolean; data?: SitemapPayload }>(
    `/seo/sitemap?limit=${SITEMAP_LIMIT}`,
  );
  return payload?.success && payload.data ? payload.data : null;
}

async function getMetadata(path: string): Promise<PageMetadata | null> {
  const match = /^\/(products|collections|pages)\/([^/]+)$/.exec(path);
  if (!match) return null;
  const resource = match[1];
  const handle = match[2];
  if (!resource || !handle) return null;
  const singular = resource === 'products' ? 'product' : resource === 'collections' ? 'collection' : 'page';
  const payload = await getJson<{ success?: boolean; data?: PageMetadata }>(
    `/seo/${singular}/${encodeURIComponent(handle)}`,
  );
  return payload?.success && payload.data ? payload.data : null;
}

function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BeNa Origins',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.webp`,
    email: 'store@benaorigins.de',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Am Galgenköppel 4',
      postalCode: '34289',
      addressLocality: 'Zierenberg',
      addressCountry: 'DE',
    },
  };
}

function staticMetadata(path: string, page: StaticPage): PageMetadata {
  const url = `${SITE_URL}${path === '/' ? '/' : path}`;
  const image = `${SITE_URL}/logo.webp`;
  return {
    title: page.title,
    description: page.description,
    canonicalUrl: url,
    robots: 'index,follow,max-image-preview:large',
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: page.type ?? 'website',
      image,
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, image },
    jsonLd: [organizationJsonLd()],
  };
}

function jsonLdScripts(blocks: unknown[]): string {
  return blocks
    .map((block) => {
      const json = JSON.stringify(block).replace(/</g, '\\u003c');
      return `    <script type="application/ld+json">${json}</script>`;
    })
    .join('\n');
}

function seoHead(meta: PageMetadata, path: string): string {
  const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;
  const image = absoluteImage(meta.openGraph?.image ?? meta.twitter?.image);
  const og = meta.openGraph;
  const twitter = meta.twitter;
  return [
    `    <title>${escapeHtml(meta.title)}</title>`,
    `    <meta name="description" content="${escapeHtml(meta.description)}" />`,
    `    <meta name="robots" content="${escapeHtml(meta.robots || 'index,follow,max-image-preview:large')}" />`,
    `    <link rel="canonical" href="${escapeHtml(canonical)}" />`,
    GOOGLE_VERIFICATION,
    '    <meta property="og:site_name" content="BeNa Origins" />',
    `    <meta property="og:title" content="${escapeHtml(og?.title ?? meta.title)}" />`,
    `    <meta property="og:description" content="${escapeHtml(og?.description ?? meta.description)}" />`,
    `    <meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `    <meta property="og:type" content="${escapeHtml(og?.type ?? 'website')}" />`,
    `    <meta property="og:image" content="${escapeHtml(image)}" />`,
    '    <meta name="twitter:card" content="summary_large_image" />',
    `    <meta name="twitter:title" content="${escapeHtml(twitter?.title ?? meta.title)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(twitter?.description ?? meta.description)}" />`,
    `    <meta name="twitter:image" content="${escapeHtml(image)}" />`,
    jsonLdScripts(meta.jsonLd ?? []),
  ]
    .filter(Boolean)
    .join('\n');
}

function noindexHead(path: string): string {
  const canonical = `${SITE_URL}${path}`;
  return [
    `    <title>BeNa Origins</title>`,
    '    <meta name="robots" content="noindex,nofollow" />',
    `    <link rel="canonical" href="${escapeHtml(canonical)}" />`,
    GOOGLE_VERIFICATION,
  ].join('\n');
}

function breadcrumbLinks(jsonLd: unknown[]): string {
  for (const block of jsonLd) {
    if (!isRecord(block) || block['@type'] !== 'BreadcrumbList') continue;
    const items = block['itemListElement'];
    if (!Array.isArray(items)) continue;
    const links = items.flatMap((item) => {
      if (!isRecord(item)) return [];
      const name = typeof item['name'] === 'string' ? item['name'] : '';
      const url = typeof item['item'] === 'string' ? item['item'] : '';
      return name ? [`<a href="${escapeHtml(url)}">${escapeHtml(name)}</a>`] : [];
    });
    if (links.length > 0) return `      <nav aria-label="Breadcrumb">${links.join(' / ')}</nav>`;
  }
  return '';
}

function productFacts(jsonLd: unknown[]): string {
  for (const block of jsonLd) {
    if (!isRecord(block) || block['@type'] !== 'Product') continue;
    const offers = Array.isArray(block['offers']) ? block['offers'] : [];
    const first = offers.find(isRecord);
    if (!first) return '';
    const price = typeof first['price'] === 'string' || typeof first['price'] === 'number' ? String(first['price']) : '';
    const currency = typeof first['priceCurrency'] === 'string' ? first['priceCurrency'] : '';
    const availability = typeof first['availability'] === 'string' ? first['availability'] : '';
    const facts: string[] = [];
    if (price) facts.push(`${escapeHtml(price)}${currency ? ` ${escapeHtml(currency)}` : ''}`);
    if (availability) facts.push(availability.endsWith('InStock') ? 'In stock' : 'Out of stock');
    return facts.length > 0 ? `      <p>${facts.join(' · ')}</p>` : '';
  }
  return '';
}

const SECTION_TITLES: Record<string, string> = {
  people: 'The people who prepare it',
  grown: 'How it is grown or made',
  made: 'Who makes it',
  exported: 'How it is exported',
  packed: 'Packed by BeNa Origins',
};

/** Process steps with images, included in the static story HTML for crawlers. */
function storySections(path: string): string {
  const match = /^\/about\/products\/([^/]+)$/.exec(path);
  const slug = match?.[1];
  if (!slug) return '';
  const story = PRODUCT_STORIES.find((item) => item.slug === slug);
  if (!story) return '';
  return story.sections
    .map(
      (section) =>
        `      <section>\n        <h2>${escapeHtml(SECTION_TITLES[section.key] ?? section.key)}</h2>\n        <p>${escapeHtml(section.body.en)}</p>\n        <img src="${escapeHtml(section.image)}" alt="${escapeHtml(section.imageAlt.en)}" loading="lazy" />\n      </section>`,
    )
    .join('\n');
}

/** Text-only content that crawlers can read before React hydrates. */
function staticContent(meta: PageMetadata, path: string): string {
  return [
    '      <div data-bena-prerender="true">',
    breadcrumbLinks(meta.jsonLd ?? []),
    `      <h1>${escapeHtml(meta.openGraph?.title ?? meta.title)}</h1>`,
    `      <p>${escapeHtml(meta.description)}</p>`,
    productFacts(meta.jsonLd ?? []),
    storySections(path),
    '      </div>',
  ]
    .filter(Boolean)
    .join('\n');
}

function replaceHeadBlock(html: string, head: string): string {
  const start = html.indexOf(SEO_START);
  const end = html.indexOf(SEO_END);
  if (start >= 0 && end > start) {
    return `${html.slice(0, start)}${SEO_START}\n${head}\n${SEO_END}${html.slice(end + SEO_END.length)}`;
  }
  return html.replace('</head>', `${head}\n  </head>`);
}

function buildDocument(shell: string, meta: PageMetadata | null, path: string): string {
  const withHead = replaceHeadBlock(shell, meta ? seoHead(meta, path) : noindexHead(path));
  const content = meta
    ? staticContent(meta, path)
    : '      <div data-bena-prerender="true"><h1>BeNa Origins</h1></div>';
  return withHead.replace('<div id="root"></div>', `<div id="root">\n${content}\n    </div>`);
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item !== undefined) results[index] = await task(item);
    }
  });
  await Promise.all(workers);
  return results;
}

function pathFromUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const host = url.hostname.replace(/^www\./, '');
    const canonicalHost = new URL(SITE_URL).hostname.replace(/^www\./, '');
    if (host !== canonicalHost) return null;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    return null;
  }
}

function sitemapXml(entries: UrlEntry[]): string {
  const seen = new Set<string>();
  const unique = entries.filter((entry) => {
    if (seen.has(entry.loc)) return false;
    seen.add(entry.loc);
    return true;
  });
  const urls = unique
    .map(
      (entry) =>
        `  <url>\n    <loc>${escapeHtml(entry.loc)}</loc>\n${
          entry.lastmod ? `    <lastmod>${escapeHtml(entry.lastmod)}</lastmod>\n` : ''
        }    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function fallbackRobots(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /search?',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Host: ${SITE_URL}`,
    '',
  ].join('\n');
}

async function writeRoute(outDir: string, path: string, shell: string, meta: PageMetadata | null): Promise<void> {
  const relative = path.replace(/^\/+/, '');
  const target = join(outDir, relative, 'index.html');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buildDocument(shell, meta, path), 'utf8');
}

/**
 * Vite plugin. `closeBundle` runs after Vite has written dist/, so it can read
 * the final shell and write additional files without interfering with bundling.
 */
export function buildSeoPlugin(): Plugin {
  const shellHead = [
    `    <link rel="canonical" href="${SITE_URL}/" />`,
    GOOGLE_VERIFICATION,
    '    <meta property="og:site_name" content="BeNa Origins" />',
    `    <meta property="og:image" content="${SITE_URL}/logo.webp" />`,
    '    <meta name="twitter:card" content="summary_large_image" />',
    '    <meta name="twitter:title" content="BeNa Origins — African coffee, food & crafts" />',
    '    <meta name="twitter:description" content="African coffee, pantry staples and handwoven crafts, sourced with care and delivered across Europe." />',
    `    <meta name="twitter:image" content="${SITE_URL}/logo.webp" />`,
    jsonLdScripts([organizationJsonLd()]),
  ].join('\n');

  return {
    name: 'bena-build-seo',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      // The shell's generic title/description are replaced by the managed SEO
      // block; leaving them would produce duplicate tags in the static HTML.
      const withoutDefaults = html
        .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
        .replace(/\s*<meta\s+name="description"\s+content="[^"]*"\s*\/>/i, '');
      return withoutDefaults.replace(
        '</head>',
        `${SEO_START}\n${shellHead}\n${SEO_END}\n  </head>`,
      );
    },
    async closeBundle() {
      const outDir = join(process.cwd(), 'dist');
      let shell: string;
      try {
        shell = await readFile(join(outDir, 'index.html'), 'utf8');
      } catch {
        console.warn('[bena-seo] dist/index.html not found; skipping SEO generation.');
        return;
      }

      const [sitemapPayload, robotsText] = await Promise.all([
        getSitemap(),
        getText('/seo/robots.txt'),
      ]);

      if (!sitemapPayload) {
        console.warn('[bena-seo] Backend sitemap unavailable; using local routes only.');
      } else if (sitemapPayload.truncated) {
        console.warn(`[bena-seo] Backend sitemap truncated at ${SITEMAP_LIMIT} products.`);
      }

      // Build the full URL list from backend data plus the local static routes.
      const entries = new Map<string, UrlEntry>();
      for (const [path] of Object.entries(STATIC_PAGES)) {
        entries.set(path, {
          loc: `${SITE_URL}${path === '/' ? '/' : path}`,
          changefreq: 'weekly',
          priority: path === '/' ? '1.0' : '0.6',
        });
      }
      for (const entry of sitemapPayload?.entries ?? []) {
        const path = pathFromUrl(entry.url);
        if (!path) continue;
        entries.set(path, {
          loc: `${SITE_URL}${path === '/' ? '/' : path}`,
          ...(entry.lastModified ? { lastmod: entry.lastModified } : {}),
          changefreq: entry.changeFrequency || 'weekly',
          priority: Number.isFinite(entry.priority) ? entry.priority.toFixed(1) : '0.5',
        });
      }

      await Promise.all([
        writeFile(join(outDir, 'sitemap.xml'), sitemapXml([...entries.values()]), 'utf8'),
        writeFile(join(outDir, 'robots.txt'), robotsText ?? fallbackRobots(), 'utf8'),
      ]);

      // Prerender informational pages with local copy.
      await Promise.all(
        Object.entries(STATIC_PAGES).map(([path, page]) =>
          writeRoute(outDir, path, shell, staticMetadata(path, page)),
        ),
      );

      // Prerender product / collection / page routes using backend metadata.
      const dynamicPaths = [...entries.keys()].filter((path) =>
        /^\/(products|collections|pages)\/[^/]+$/.test(path),
      );
      const resolved = await mapWithConcurrency(dynamicPaths, 4, async (path) => ({
        path,
        meta: await getMetadata(path),
      }));
      let fetched = 0;
      for (const result of resolved) {
        if (result.meta) fetched += 1;
        await writeRoute(outDir, result.path, shell, result.meta ?? staticMetadata(result.path, {
          title: 'BeNa Origins',
          description: 'Explore African coffee, food and crafts from BeNa Origins.',
        }));
      }

      // Private routes get their own noindex HTML; Render serves real files
      // before the SPA catch-all rewrite.
      await Promise.all(PRIVATE_ROUTES.map((path) => writeRoute(outDir, path, shell, null)));

      console.info(
        `[bena-seo] sitemap: ${entries.size} URLs, prerendered: ${Object.keys(STATIC_PAGES).length + resolved.length} pages (${fetched} with backend metadata), noindex: ${PRIVATE_ROUTES.length}.`,
      );
    },
  };
}
