# BeNa Origins — SEO & prerendering strategy (React without Next.js)

Status: **backend support + frontend build-time SEO implemented**. Nothing here publishes or
changes the live storefront; deploy the frontend to make generated files public.

## Implementation (build time)

`frontend/seo/buildSeo.ts` (Vite plugin, registered in `frontend/vite.config.ts`) runs after Vite
writes `dist/`:

- fetches `GET /api/v1/seo/sitemap?limit=1000` and `/seo/robots.txt` from the API origin
  (`SEO_API_BASE_URL`, else `VITE_API_BASE_URL`, else `https://bena-origins.onrender.com/api/v1`);
- emits `dist/sitemap.xml` with all product/collection/page URLs plus local informational routes,
  all normalised to the canonical `VITE_SITE_URL`;
- emits `dist/robots.txt` from the backend;
- writes route HTML at `dist/<path>/index.html` for home, informational routes and every
  product/collection/page, injecting title, description, canonical, robots, OG/Twitter, Google
  verification, backend JSON-LD and a text-only content block for non-JS crawlers;
- writes `noindex,nofollow` HTML for `/cart`, `/search`, `/account/*` and `/checkout`;
- never fails the build: fetches are retried and fall back to local data.

Render serves real files before the SPA catch-all rewrite, so clean URLs resolve to the prerendered
HTML. React Router takes over after hydration. New Shopify products are picked up on the next
frontend deploy (set a deploy hook on `products/update` if faster refresh is needed).

## 1. Goal

Make product, collection and informational pages fully crawlable and rich-result ready while the
future storefront remains a React + TypeScript SPA (Vite), without adopting Next.js.

## 2. Why prerendering is required

A pure client-rendered React app ships an almost empty HTML shell. Google can execute JavaScript,
but other crawlers (social previews, AI crawlers, some marketplaces) do not, and Core Web Vitals
suffer. Every indexable page needs, in the initial HTML:

- `<title>`, meta description, canonical URL, robots directive
- Open Graph / Twitter tags
- JSON-LD (`Product`, `BreadcrumbList`, `Organization`)
- the main textual content (title, price, availability, description, breadcrumb)

## 3. Options evaluated

| Option | How it works | Pros | Cons | Verdict |
| --- | --- | --- | --- | --- |
| **A. Build-time SSG with a Vite prerender plugin** (e.g. `vite-react-ssg`, `vite-plugin-ssr` style prerender, or a small custom Puppeteer prerender step) | At build time, render each known route to static HTML and hydrate on the client | Fast CDN delivery, deterministic, no runtime render service, excellent CWV | Catalog changes require a rebuild/redeploy (can be automated via webhooks) | **Recommended** |
| B. Runtime prerender service (Rendertron / Puppeteer behind a cache) | A bot-aware reverse proxy renders pages on demand | Handles unlimited routes, no rebuilds | Extra infrastructure, cold-start latency, bot detection fragility | Fallback for long-tail only |
| C. Edge-side HTML injection (hosting-specific) | Edge function injects meta tags into the SPA shell | Cheap | Only meta tags, content still client-rendered; vendor lock-in | Not sufficient alone |
| D. Migrate to Next.js/Remix | Framework SSR | Mature | Contradicts the chosen stack and adds scope | Out of scope |

## 4. Recommended architecture

1. **Vite + React Router** for the storefront.
2. **Static generation at build time** for all indexable routes:
   - `/` home
   - `/products/:handle` (all published products)
   - `/collections/:handle` (all collections; paginate static pages or keep page 1 static)
   - `/african-products`, `/about`, `/contact`, `/shipping`, `/faq`, `/legal/:page`
   - locale-prefixed variants for enabled markets/languages (see §7)
   - Shopify-era `/pages/:handle` and `/policies/:handle` URLs are NOT indexable routes.
     They are served as real 301 redirects to the routes above (see `render.yaml` and
     `frontend/src/config/legacyRoutes.ts`) and excluded from every sitemap.
3. Data comes from **this backend**, not directly from Shopify, during the build:
   - `GET /api/v1/products?first=100&after=...` for the sitemap/route list
   - `GET /api/v1/seo/product/:handle` for metadata + JSON-LD
   - `GET /api/v1/seo/collection/:handle`
   - `GET /api/v1/seo/page/:handle`
   - `GET /api/v1/seo/sitemap` (JSON) or `/api/v1/seo/sitemap.xml`
4. A small prerender step injects the returned metadata into the HTML template (or the SSG plugin
   fetches the same endpoint inside its data loader).
5. After hydration, React Router takes over. Cart, search, account and checkout are never
   prerendered and must be `noindex`.

## 5. Keeping static pages fresh

- On deploy, regenerate all pages (simple, safe).
- Optional: rebuild only affected routes. Our webhooks already expose `products/update` as
  `product.changed` on the `/storefront` Socket.IO namespace. A hosting deploy hook can subscribe to
  the same event server-side (or be triggered by the backend) to start a rebuild.
- Target freshness: products within 1 hour, policies/pages within 24 hours. This is a business
  decision; the API caches audit data only, never product HTML.
- If a rebuild pipeline is not available, use the runtime prerender fallback for stale routes.

## 6. Backend support (implemented)

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/seo/product/:handle` | title, description, canonical, robots, OG/Twitter, JSON-LD: Product + BreadcrumbList + Organization |
| `GET /api/v1/seo/collection/:handle` | title, description, canonical, CollectionPage + BreadcrumbList + Organization |
| `GET /api/v1/seo/page/:handle` | informational page metadata + breadcrumb |
| `GET /api/v1/seo/sitemap?limit=250` | sitemap data (home, products, collections only; legacy pages/policies are excluded) |
| `GET /api/v1/seo/sitemap.xml?limit=250` | sitemap XML (escape-safe) |
| `GET /api/v1/seo/robots` | robots rules as data |
| `GET /api/v1/seo/robots.txt` | ready-to-serve robots.txt |

Assumptions and limits:

- Canonical host is `SITE_URL` (default `https://benaorigins.de`), not the backend URL.
- `Product` JSON-LD uses variant prices and `InStock`/`OutOfStock`. It deliberately contains **no**
  `aggregateRating` because no verified review source is connected.
- All `<SEO title/description>` values from Shopify are preferred; fallbacks are generated.
- Sitemap generation is capped (default 250 products, configurable) and reports `truncated`.
  For the full catalog, run the generator at build time with a higher limit or split sitemaps.
- Sitemap URLs are normalized to the canonical `SITE_URL` host. Shopify `onlineStoreUrl`
  values (myshopify.com / checkout.shopify.com) and legacy page/policy paths are dropped.
- `robots.txt` disallows `/api/`, `/cart`, `/checkout`, `/account`; adjust if the frontend uses
  different cart routes.

## 7. Localization / hreflang

Shopify Markets drives prices, currencies and translations through `@inContext`. The backend
exposes `GET /api/v1/localization` (countries, languages, currency groups). The frontend should:

- choose one canonical URL per locale (either `?country=DE&language=DE` or path prefixes; pick one,
  never both),
- emit `hreflang` alternates for every country/language combination that has unique content,
- keep `x-default` pointing at the primary (EN/DE) experience,
- avoid indexing empty market variants; return `noindex` when a product is not purchasable in that
  market (`availableForSale` after context).

Note: the Storefront API does not expose real Shopify Market handles (`localization.market` is
deprecated). Market groups returned by the backend are **derived from currency**, clearly labelled
`derived-*`. Do not present them as official market identifiers.

## 8. Page-level checklist

- [ ] Unique title ≤ 60 chars, description ≤ 155 chars (Shopify SEO fields first, fallback generated).
- [ ] Exactly one canonical per rendered page.
- [ ] Products: Product + BreadcrumbList JSON-LD; breadcrumbs visible in UI.
- [ ] Collections: CollectionPage + BreadcrumbList; collection name and product links in initial HTML.
- [ ] Informational pages: Organization + BreadcrumbList.
- [ ] 404 for unknown handles, 410 for permanently removed products, redirects for renamed handles
      (Shopify URL redirects + frontend redirect table).
- [ ] Internal links are `<a href>` links, not click handlers.
- [ ] Images: responsive `srcset`, explicit dimensions, meaningful alt text (backend audit flags missing alt).
- [ ] Noindex for `/cart`, `/checkout`, `/account`, search result pages, and staging hosts.
- [ ] `robots.txt` + `sitemap.xml` served from the canonical host (frontend/hosting), generated from
      backend data.
- [ ] Validate with Google Rich Results Test, Schema Markup Validator and Search Console after launch.

## 9. Performance budget (prerendered pages)

| Metric | Target |
| --- | --- |
| LCP (mobile) | < 2.5 s |
| CLS | < 0.1 |
| INP | < 200 ms |
| HTML (gzip) | < 100 KB |
| JS on product page | < 200 KB gzip initial |

Prerendered HTML removes the "empty shell" penalty; images and third-party scripts (reviews,
analytics) remain the main risks. Load review widgets only after interaction/idle.

## 10. Rollout plan (after backend approval, with owner sign-off)

1. Implement routes + SSG in the frontend.
2. Generate pages against fixture mode; verify HTML contains metadata and JSON-LD.
3. Point the build at the live Storefront API (read-only) and regenerate.
4. Serve sitemap/robots from staging, crawl with Screaming Frog, validate structured data.
5. Add deploy hooks for catalog changes.
6. Only then change DNS/publish, with redirects from all current Shopify theme URLs.
7. Submit sitemap in Search Console; monitor Coverage and Enhancements.

## 11. Explicit non-goals in this phase

- No prerender service is deployed.
- No sitemap is published from the backend; endpoints provide data only.
- No redirects, DNS, theme or product data are changed.
