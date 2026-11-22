# BeNa Origins — Headless Storefront Backend

Backend for the future React + TypeScript storefront of **benaorigins.de**. Shopify remains the
single source of truth for products, variants, prices, inventory, carts, orders, discounts and
payments. This repository contains **no product/order database** and does not implement checkout.

> **Current status:** phases 1-7 + authentication addendum implemented and covered by 91 automated tests.
> Live **tokenless** Storefront API reads + guest cart create/get were verified on 2026-11-19 against
> `benaafricanshop.myshopify.com` (API `2026-10`). Token-gated features (metafields/tags/inventory),
> live Customer Account API login, webhooks and provider integrations remain **UNVERIFIED** until
> their credentials are supplied (see [Credentials & keys](#10-credentials--keys-report)).
>
> No frontend UI was built. No theme, DNS, product, inventory, price, payment or order data was
> changed. No webhook was registered against Shopify.

---

## 1. Project structure

```text
BeNa store/
├── .env.example                 # every variable, safe defaults, no secrets
├── .gitignore                   # .env, dist, reports, logs
├── package.json / package-lock.json
├── tsconfig.json                # strict TypeScript
├── tsconfig.build.json
├── vitest.config.ts
├── eslint.config.mjs
├── .prettierrc.json
├── README.md
├── docs/
│   ├── seo-strategy.md          # prerendering/SSG strategy + backend SEO support
│   ├── socket-events.md         # every Socket.IO event, payload and audience
│   ├── authentication.md        # Layer 1/2/3 auth, customer-account setup, guest-only option
│   └── audit-mapping.md         # all 23 audit findings → backend checks
├── scripts/
│   ├── audit-products.ts        # bulk completeness report (JSON + Markdown)
│   ├── register-webhooks.ts     # DRY-RUN by default
│   ├── mint-admin-token.ts      # admin JWT for API + Socket.IO (server-side)
│   └── live-smoke.ts            # read-only live smoke test
├── src/
│   ├── server.ts                # HTTP + Socket.IO bootstrap, graceful shutdown
│   ├── app.ts                   # Express app, security middleware, routes
│   ├── container.ts             # dependency wiring (no service locator magic)
│   ├── config/                  # Zod-validated env + constants
│   ├── routes/                  # versioned REST routes (/api/v1)
│   ├── controllers/             # HTTP only — never GraphQL
│   ├── services/                # business logic (catalog, cart, audit, SEO, customer auth…)
│   ├── services/customerAuth/   # PKCE, OAuth client, session store, cookies
│   ├── integrations/shopify/    # GraphQL client, fragments, mappers, fixture client
│   ├── schemas/                 # Zod: requests, auth, webhooks
│   ├── middleware/              # request id, logging, validation, errors, limits, requireAdmin
│   ├── types/                   # typed API/domain/audit/auth models
│   ├── utils/                   # errors, logger, HTML/money helpers, request context
│   ├── webhooks/              # HMAC verification, dedup (memory/Redis), processors
│   ├── sockets/               # namespaces, JWT auth, event registry, publisher
│   ├── docs/                  # OpenAPI 3.1 spec + Swagger UI
│   └── fixtures/mock/         # MOCK data (never live Shopify data)
└── tests/
    ├── unit/                    # env, audit rules, HMAC, dedup, socket auth, HTML
    ├── integration/             # routes, cart, webhooks, sockets, SEO, docs
    └── helpers/                 # app/container test harness
```

---

## 2. Quick start

Requirements: Node.js ≥ 20.11 (tested with 20.20.2), npm.

```bash
cp .env.example .env
npm install
npm run dev            # http://localhost:4000, fixture mode
# or
npm run build && npm start
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm test               # 91 tests
npm run audit:report   # writes reports/audit-YYYY-MM-DD.{json,md}
npm run webhooks:register   # dry-run, never calls Shopify
npm run smoke          # read-only live smoke (fixture message when no credentials)
```

- API base: `http://localhost:4000/api/v1`
- Swagger UI: `http://localhost:4000/api/docs`
- OpenAPI JSON: `http://localhost:4000/api/docs/openapi.json`
- Liveness: `GET /health` · Readiness: `GET /health/ready`

**Storefront API version:** `2026-10` (latest stable verified against Shopify docs on
2026-11-19). Configurable via `SHOPIFY_API_VERSION`.

### Deploy to Render

Repository: `https://github.com/Ally-keyz/BeNa-Store`

One-click blueprint (storefront only):

```text
https://render.com/deploy?repo=https://github.com/Ally-keyz/BeNa-Store
```

or Render Dashboard → **New → Blueprint** → select the repo, branch `main`, path `render.yaml`.

#### Backend (already deployed)

The backend already runs at `https://bena-origins.onrender.com` and is managed separately in the Render dashboard. `render.yaml` intentionally does **not** declare it, so creating this Blueprint will not create a duplicate backend service. The backend service settings are preserved in `render.backend.yaml` for reference.

Backend reminders:

- Node 20 build, `npm start`, health check `/health`, live Shopify mode (API `2026-10`).
- `CORS_ALLOWED_ORIGINS` and `SOCKET_CORS_ORIGINS` must include `https://benaorigins.de`, `https://www.benaorigins.de`, `https://bena-origins.onrender.com`, and the new frontend origin `https://bena-origins-frontend.onrender.com`. Add the frontend origin in the dashboard and redeploy the backend if it is missing — otherwise the site loads but API/Socket requests fail CORS.
- Shopify Customer Account callback and JS origin are already registered for the backend URL.

#### Storefront (frontend) on Render

`render.yaml` creates one static site, `bena-origins-frontend`:

- Root Directory: `frontend`; Build: `npm ci && npm run build`; Publish Directory: `dist`
- `/* → /index.html` rewrite so React Router deep links (e.g. `/products/:handle`) survive refresh
- Build-time `VITE_API_BASE_URL=https://bena-origins.onrender.com/api/v1` and `VITE_SOCKET_URL=https://bena-origins.onrender.com`. They are public values baked into the JS bundle — never put secrets in them.
- `NODE_VERSION=20.20.2` is pinned because the repo-root `.nvmrc` is outside the frontend root directory.
- Immutable `Cache-Control` headers for `/assets/*`.

After the first deploy, deep-link to `/catalog` and refresh to verify the SPA rewrite, then check the browser console for CORS errors. If the storefront uses a custom domain, add that origin to the backend CORS lists and to Shopify's Customer Account JS origin/redirect settings, then redeploy.

#### Performance and SEO notes

- The blocking 2.8-second Lottie intro screen was removed, so first paint is the storefront itself.
- Vendor code is split into cacheable chunks and Socket.IO is imported only when the listener starts. The production build no longer emits a chunk-size warning.
- `robots.txt`, `sitemap.xml`, canonical/OG/Twitter tags, Google site verification and Organization JSON-LD are generated at build time by `frontend/seo/buildSeo.ts` (registered in `vite.config.ts`) from `VITE_SITE_URL`; `react-helmet-async` supplies per-route metadata at runtime.
- The build fetches `/api/v1/seo/sitemap?limit=1000` and `/seo/*` metadata from `SEO_API_BASE_URL` (fallback: `VITE_API_BASE_URL`, then `https://bena-origins.onrender.com/api/v1`). It emits a full catalog sitemap and prerendered HTML for every product/collection/page route, plus `noindex` HTML for cart/search/account routes. A backend outage never fails the build. See `docs/seo-strategy.md`.
- The selected language is stored in context rather than in the URL, so hreflang alternates are intentionally omitted — they would all point to the same address.

Free Render services sleep after inactivity and are not suitable for production Socket.IO traffic.
Upgrade before connecting the real storefront. For cookie-safe customer sessions, put the API on a
custom domain under the same site as the storefront (e.g. `api.benaorigins.de`) when DNS changes are
approved; do not change production DNS without approval.

---

## 3. Implemented REST endpoints

All responses (except raw XML/TXT and Swagger UI) use:

```json
{ "success": true, "data": {}, "meta": { "requestId": "…", "generatedAt": "…", "dataSource": "shopify|fixture" } }
```

Errors use `{ "success": false, "error": { "code", "message", "details?", "requestId" } }`.
`meta.pagination` is present on every list. Zod validates params, query and body.

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | `/api/v1/products` | List products, cursor pagination, `query`/`sortKey`, `@inContext` | ✅ tested (fixtures) |
| GET | `/api/v1/products/:handle` | Product detail: variants, images, metafields, prices | ✅ tested (fixtures) |
| GET | `/api/v1/collections` | List collections | ✅ tested (fixtures) |
| GET | `/api/v1/collections/:handle` | Collection + paginated products | ✅ tested (fixtures) |
| GET | `/api/v1/search?q=` | Product search (Shopify relevance) | ✅ tested (fixtures) |
| GET | `/api/v1/search/suggestions?q=` | Predictive search: products, collections, pages, query suggestions | ✅ tested (fixtures) |
| GET | `/api/v1/ai/suggestions/:handle` | Unverified food-fact suggestions from one free hosted model (public, rate-limited, cached) | ✅ tested (fixtures) |
| POST | `/api/v1/cart` | Create Shopify cart; returns real `checkoutUrl` | ✅ tested (fixtures) |
| GET | `/api/v1/cart/:cartId` | Read cart | ✅ tested |
| POST | `/api/v1/cart/:cartId/lines` | Add lines | ✅ tested |
| PATCH | `/api/v1/cart/:cartId/lines` | Update line quantities / merchandise | ✅ tested |
| DELETE | `/api/v1/cart/:cartId/lines` | Remove lines (`{ lineIds }`) | ✅ tested |
| PATCH | `/api/v1/cart/:cartId/buyer-identity` | Email/phone/country/customer token | ✅ tested |
| PATCH | `/api/v1/cart/:cartId/discount-codes` | Replace discount codes | ✅ tested |
| GET | `/api/v1/localization` | Countries, languages, currencies, derived market groups | ✅ tested |
| GET | `/api/v1/shipping` | Shipping policy, claim/market mismatch, rate guidance, optional cart rates | ✅ tested |
| GET | `/api/v1/policies` | Policies + legal notice + identity/email inconsistencies | ✅ tested |
| GET | `/api/v1/auth/login` | Customer Account API login (PKCE/state/nonce) → Shopify | ✅ tested (mock OAuth) |
| GET | `/api/v1/auth/callback` | State/nonce validation, token exchange, session cookie | ✅ tested (mock OAuth) |
| POST | `/api/v1/auth/logout` | CSRF-protected logout + Shopify end-session | ✅ tested |
| GET | `/api/v1/auth/session` | Minimal session status + CSRF token (never tokens) | ✅ tested |
| GET | `/api/v1/account/me` | Logged-in customer profile (read-only) | ✅ tested |
| GET | `/api/v1/account/orders` | Order history, cursor pagination (read-only) | ✅ tested |
| GET | `/api/v1/account/addresses` | Addresses, cursor pagination (read-only) | ✅ tested |
| POST | `/api/v1/account/cart/associate` | Cart buyer identity for prefilled checkout | ✅ tested |
| POST | `/api/v1/newsletter/subscribe` | Provider-agnostic subscription with explicit consent | ✅ tested |
| POST | `/api/v1/restock/subscribe` | Product-specific back-in-stock alert signup (persisted) | ✅ tested |
| GET | `/api/v1/reviews/assessment` | Review-app detection + integration guidance | ✅ tested (config mode) |
| GET | `/api/v1/audit/products` | Bulk product-information completeness (read-only) | ✅ tested |
| GET | `/api/v1/audit/products/:handle` | Single-product completeness | ✅ tested |
| GET | `/api/v1/seo/product/:handle` | Metadata, canonical, JSON-LD | ✅ tested |
| GET | `/api/v1/seo/collection/:handle` | Metadata, canonical, JSON-LD | ✅ tested |
| GET | `/api/v1/seo/page/:handle` | Informational page metadata | ✅ tested |
| GET | `/api/v1/seo/sitemap` | Sitemap data (JSON) | ✅ tested |
| GET | `/api/v1/seo/sitemap.xml` | Sitemap XML | ✅ tested |
| GET | `/api/v1/seo/robots` | robots data (JSON) | ✅ tested |
| GET | `/api/v1/seo/robots.txt` | robots.txt | ✅ tested |
| GET | `/health` | Liveness (outside rate limiter) | ✅ tested |
| GET | `/health/ready` | Shopify reachability + webhook/socket config; 503 on failure | ✅ tested |
| POST | `/webhooks/shopify` | Raw-body HMAC verification, dedup, async processing | ✅ tested |
| GET | `/api/docs` | Swagger UI | ✅ tested |
| GET | `/api/docs/openapi.json` | OpenAPI 3.1 document | ✅ tested |

Notes:

- Checkout is **always Shopify-hosted**. The backend never creates orders, never completes payment
  and has no checkout endpoint.
- `cartId` is a Shopify GID and is intentionally opaque to the frontend; store it client-side.
- Cursor pagination: pass `meta.pagination.endCursor` as `?after=`; `first` is capped at 100.
- **Pagination coverage:** products, collections, collection products and search are cursor-paginated.
  Predictive search is capped at 10 by the Shopify API, cart lines at 100 by Shopify, and audit
  reports are scan-limited (`AUDIT_PRODUCT_SCAN_LIMIT`) — these are bounded sets, not unbounded lists.
- Request ids are generated server-side, returned in `X-Request-Id`, and included in errors.

### Audit endpoint details

`GET /api/v1/audit/products` returns scores, issue counts, itemized findings with audit references
(`#2`–`#15`), catalog-level duplicate-title groups, cache metadata and warnings. Optional query:
`limit`, `refresh`, `country`, `language`. Protected by `x-admin-key` (or a role-bearing JWT) via Layer 2 admin auth. See `docs/audit-mapping.md`.

---

## 4. Shopify integration status

| Capability | Implementation | Verified live? |
| --- | --- | --- |
| Storefront GraphQL client | `ShopifyGraphqlClient` (fetch, timeout, throttle retry, buyer-IP header, private/public token headers) | ✅ live tokenless (2026-11-19) |
| API version | `2026-10` default, env-configurable, regex-validated | ✅ live tokenless |
| Products / variants / prices / images | Full fragment incl. unit price + measurement, inventory quantity (token-only fields toggled) | ✅ live tokenless (list + detail) |
| Metafields (nutrition, ingredients, allergens, origin, preparation) | `metafields(identifiers:)`, namespace/key configurable, graceful ACCESS_DENIED fallback | ❌ token required — **UNVERIFIED** |
| Collections / collection products | Cursor pagination, `@inContext` | ✅ live tokenless (list) |
| Search + predictive search | `products(query:)` + `predictiveSearch` | ✅ live tokenless |
| Cart | create/get/add/update/remove, buyer identity, discount codes, delivery groups, real `checkoutUrl` | ✅ live create/get (`checkoutUrl` hosted by Shopify); mutations mock-tested |
| Localization / markets | `localization` query; market handles derived (Storefront API `market` is deprecated) | ✅ live tokenless (28 countries) |
| Policies / pages | Shop policies + legal-notice page lookup | ✅ live tokenless |
| Customer Account API (Layer 1) | OAuth Code + PKCE BFF, sessions, refresh, profile/orders/addresses, cart association | ❌ mock OAuth only — **UNVERIFIED** |
| Newsletter | `mock` (default), `webhook`, `klaviyo`, `mailchimp` adapters | ❌ provider calls unverified |
| Reviews app | Public-page signature detection + config override | ❌ detection not run against live site in tests |
| Admin API | **Only** the webhook registration script (dry-run default) | ❌ never called |
| Webhooks | HMAC (base64/hex), timing-safe, dedup (memory/Redis), Zod payloads | ❌ no live deliveries |

Live tokenless verification performed against `benaafricanshop.myshopify.com` with Storefront API
`2026-10`: products, product detail, collections, search, predictive search, localization, policies,
shipping, and cart create/get. `checkoutUrl` is a real Shopify-hosted URL. Storefront tokens are
still required for metafields, tags and inventory quantities.

Data source visibility: every response carries `meta.dataSource` (`shopify` or `fixture`) and
fixture mode adds an explicit warning. Mock records live in `src/fixtures/mock/` and are labelled as
such.

### Shopify API details handled deliberately

- **Cart fields:** uses `cost`, `discountCodes`, `deliveryGroups` (not deprecated
  `estimatedCost`/`discountAllocations`), compatible with 2026-07/2026-10 cart changes.
- **Token-required fields:** `tags`, `quantityAvailable`, `metafields` are only requested when a
  Storefront token exists. Without a token, tokenless Storefront access still serves products,
  collections, search and carts; the API reports reduced capabilities instead of failing.
- **Guest cart scoping:** the cart query deliberately does **not** request `buyerIdentity.customer`,
  because that field requires `unauthenticated_read_customers` and would break tokenless guest
  carts. Enable that scope only when you need to read the customer object.
- **Buyer IP:** propagated via `Shopify-Storefront-Buyer-IP` from the incoming request context when
  a private token is used.
- **No Admin token at runtime:** the Admin API token is only read by `scripts/register-webhooks.ts`.

---

## 5. Socket.IO

Attached to the same HTTP server. Two namespaces:

- `/storefront` — public, no sensitive data, `connection.ready`, `subscribe.product`, and
  `product.changed`.
- `/admin` - requires a signed HS256 JWT (`ADMIN_JWT_SECRET`, fallback `SOCKET_ADMIN_JWT_SECRET`). Emits order, fulfillment,
  inventory, product and app-uninstall notifications.

Socket.IO is **never** the source of truth: events are hints, clients re-fetch REST/Shopify data.
Events originate only from HMAC-validated Shopify webhooks.

Full event table, payloads, auth and scaling notes: [`docs/socket-events.md`](docs/socket-events.md).

Mint a local admin token:

```bash
npm run admin:token -- --ttl=3600 --subject=ops
```

---

## 6. Webhook implementation

- Endpoint: `POST /webhooks/shopify` (mounted before JSON parsing to preserve the raw body).
- Verifies `X-Shopify-Hmac-Sha256` with HMAC-SHA256 + `timingSafeEqual`
  (base64 Shopify format, hex fallback).
- Requires `X-Shopify-Topic`, `X-Shopify-Webhook-Id`, `X-Shopify-Shop-Domain`.
- Deduplicates on `${shopDomain}:${webhookId}` for 24 h (in-memory TTL by default, Redis when
  `REDIS_URL` is set, with memory fallback if Redis fails).
- Responds **200 immediately**, then validates with Zod and processes on `setImmediate`.
- Returns `401` on bad signatures, `400` on malformed requests, `503` if no secret is configured.
- Supported topics: `orders/create`, `orders/updated`, `orders/fulfilled`,
  `fulfillments/create`, `products/update`, `inventory_levels/update`, `app/uninstalled`.
- No PII is emitted to Socket.IO; order payloads are reduced to ids/statuses/timestamps.

Registration script:

```bash
npm run webhooks:register                 # dry-run: prints topics & required config
npm run webhooks:register -- --apply      # still refuses unless SHOPIFY_WEBHOOKS_APPLY=true
```

> **Not run against Shopify.** Default subscriptions are `orders/create`, `orders/updated`,
> `orders/fulfilled`, `products/update`, `inventory_levels/update`, `app/uninstalled`.
> `fulfillments/create` is supported by the handler but not subscribed by default (it would
> duplicate `orders/fulfilled` notifications). Register only after owner approval.

---

## 7. Automated test results

Command: `npm test` — **91 tests / 18 files, all passing** (Vitest 3).

| Suite | Coverage |
| --- | --- |
| `tests/unit/env.test.ts` | defaults, API version validation, CORS restrictions, production requirements, secret redaction |
| `tests/unit/schemas.test.ts` | Zod transforms, GID/quantity rules, pagination/boolean coercion |
| `tests/unit/auditRules.test.ts` | #2–#15 rules, scoring, food heuristics, unverified metafields |
| `tests/unit/webhooks.test.ts` | base64/hex HMAC, tampering, dedup + TTL |
| `tests/unit/socketAuth.test.ts` | JWT sign/verify, expiry, handshake token extraction |
| `tests/unit/html.test.ts` | HTML stripping, allergens emphasis, email/business/rate extraction |
| `tests/integration/health.test.ts` | liveness/readiness, envelope, 404 format |
| `tests/integration/catalog.test.ts` | products, detail, collections, search, suggestions, pagination, validation, CORS |
| `tests/integration/cart.test.ts` | full cart lifecycle, checkoutUrl passthrough, invalid ids/bodies |
| `tests/integration/content.test.ts` | localization, shipping gaps, policies inconsistencies, newsletter, reviews |
| `tests/integration/audit.test.ts` | bulk report, cache, admin key/JWT guard, role/401/403, 404 |
| `tests/integration/seo.test.ts` | JSON-LD, canonical, sitemap JSON/XML, robots |
| `tests/integration/webhooks.test.ts` | valid/invalid signatures, dedup, topics, async events, 503 |
| `tests/integration/auth.test.ts` | auth disabled, PKCE/state replay, nonce mismatch, cookies, CSRF, open redirect, account reads, cart association |
| `tests/integration/adminAuth.test.ts` | fail-closed 503, 401 semantics |
| `tests/unit/customerAuth.test.ts` | PKCE vector, cookie signing/flags, returnTo hardening |
| `tests/integration/sockets.test.ts` | public/admin namespaces, auth rejection, event fan-out |
| `tests/integration/docs.test.ts` | Swagger UI, OpenAPI spec, Zod-generated schemas |

Additional verification performed:

- `npm run typecheck` — clean (strict).
- `npm run build` — clean (`dist/`).
- `npm run lint` — clean (ESLint 9 flat config).
- Runtime smoke against `dist/server.js` in fixture mode:
  `health=ok ready=ok source=fixture`; products, suggestions, cart (`checkout hostedBy=shopify`),
  audit report (7 products, average 60.6) all responded correctly.
- **Live tokenless smoke** against `benaafricanshop.myshopify.com` (`NODE_ENV=production`,
  `SHOPIFY_MOCK_MODE=false`): Storefront ping OK; products + product detail; collections; search;
  predictive search; localization (28 countries); policies; shipping report; cart create/get with a
  real Shopify-hosted `checkoutUrl`. No real checkout was completed.
- Fixture audit script produced JSON + Markdown reports under `reports/` (gitignored).

**Not tested live yet:** token-gated metafields/tags/inventory (needs Storefront token), Customer
Account API login (needs client secret + registered callback), live webhook delivery, review
detection, Klaviyo/Mailchimp, Redis adapter, real checkout. `npm run smoke` is read-only.

---

## 8. Environment variables

Full template: [`.env.example`](.env.example). Secrets are server-side only; `.env` is gitignored.
Validation is fail-fast via Zod. Defaults shown in parentheses.

### Runtime / security

| Variable | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no (`development`) | no | `development` / `test` / `production` |
| `PORT` | no (`4000`) | no | HTTP port |
| `LOG_LEVEL` | no (`info`) | no | pino level |
| `LOG_PRETTY` | no (`false`) | no | human-readable dev logs |
| `TRUST_PROXY` | no (`0`) | no | Express trust-proxy hops (set correctly behind a proxy) |
| `CORS_ALLOWED_ORIGINS` | **production yes** | no | comma-separated exact origins; `*` rejected |
| `API_PUBLIC_URL` | no | no | public backend base URL for OpenAPI `servers`; `/` locally |
| `FRONTEND_URL` | no | no | future frontend origin for snippets/diagnostics |
| `SITE_URL` | no (`https://benaorigins.de`) | no | canonical host for SEO/sitemaps |
| `SITE_NAME` | no (`BeNa Origins`) | no | brand name in JSON-LD/titles |
| `ADMIN_API_KEY_SHA256` | production yes* | **yes** (hash) | SHA-256 hex of the accepted `X-Admin-Key` |
| `ADMIN_API_KEY` | alternative | **yes** | plaintext legacy key, hashed at startup (prefer the hash) |
| `ADMIN_JWT_SECRET` | alternative | **yes** | HS256 admin API **and** Socket.IO JWT secret |
| `ADMIN_JWT_TTL_SECONDS` | no (`3600`) | no | admin token lifetime |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` / `CART_RATE_LIMIT_MAX` / `NEWSLETTER_RATE_LIMIT_MAX` / `WEBHOOK_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_MAX` | no | no | rate limits (disabled in `NODE_ENV=test`) |

\* Production requires an admin key hash and/or admin JWT secret; otherwise the server refuses to start. In development, admin routes return `503 NOT_CONFIGURED` if neither is set (fail closed, never open).

### Shopify

| Variable | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `SHOPIFY_STORE_DOMAIN` | live mode yes | no | `xxx.myshopify.com` (never a URL path) |
| `SHOPIFY_API_VERSION` | no (`2026-10`) | no | Storefront API version |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | recommended | **yes** | server-side token (`Shopify-Storefront-Private-Token`) |
| `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` | alternative | no* | browser-style token (`X-Shopify-Storefront-Access-Token`) |
| `SHOPIFY_MOCK_MODE` | no (`auto`) | no | `auto` \| `true` \| `false`; fixtures if no domain+token |
| `SHOPIFY_WEBHOOK_SECRET` | webhooks yes | **yes** | HMAC-SHA256 signing secret |
| `PUBLIC_WEBHOOK_BASE_URL` | webhooks yes | no | public HTTPS base, receiver at `/webhooks/shopify` |
| `SHOPIFY_WEBHOOK_TOPICS` | no | no | comma-separated topics (script only) |
| `SHOPIFY_WEBHOOKS_APPLY` | no (`false`) | no | extra guard for `--apply` |
| `SHOPIFY_ADMIN_API_ACCESS_TOKEN` | script only | **yes** | webhook registration; never used at runtime |
| `SHOPIFY_ADMIN_API_VERSION` | no (`2026-10`) | no | Admin API version for the script |

\* The public Storefront token is designed to be exposed to buyers in browser apps; here it is still
kept server-side because the backend proxies all traffic. Use the **private** token whenever possible.

### Customer accounts (Layer 1, feature-flagged)

| Variable | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `AUTH_CUSTOMER_ACCOUNTS_ENABLED` | no (`false`) | no | Master switch; guest checkout works when false |
| `AUTH_SESSION_TTL_SECONDS` | no (`86400`) | no | server-side session lifetime |
| `AUTH_STATE_TTL_SECONDS` | no (`600`) | no | OAuth state lifetime |
| `AUTH_RATE_LIMIT_MAX` | no (`10`) | no | auth requests per window per IP |
| `SESSION_SECRET` | auth yes | **yes** | signs the session cookie (min 32 chars) |
| `COOKIE_DOMAIN` | no | no | optional shared cookie domain; omit for `__Host-` cookie |
| `COOKIE_SECURE` | prod yes | no | defaults to true in production |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | auth yes | no | Customer Account API OAuth client |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET` | confidential client | **yes** | optional; PKCE is used either way |
| `SHOPIFY_CUSTOMER_ACCOUNT_SCOPE` | no | no | default `openid email customer-account-api:full` |
| `SHOPIFY_CUSTOMER_ACCOUNT_DISCOVERY_URL` | no | no | defaults to `https://{SITE_URL host}/.well-known/openid-configuration` |
| `SHOPIFY_CUSTOMER_ACCOUNT_API_DISCOVERY_URL` | no | no | defaults to `https://{SITE_URL host}/.well-known/customer-account-api` |
| `SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL` / `TOKEN_URL` / `LOGOUT_URL` / `JWKS_URI` | no | no | optional explicit endpoints from discovery |
| `SHOPIFY_CUSTOMER_ACCOUNT_ISSUER` | no | no | optional issuer override for ID-token validation |
| `SHOPIFY_CUSTOMER_ACCOUNT_API_URL` | no | no | optional explicit GraphQL endpoint |
| `SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI` | auth yes | no | must exactly match Shopify's registered redirect URI; HTTPS |
| `SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI` | recommended | no | must be registered in Shopify; HTTPS |
| `SHOPIFY_CUSTOMER_ACCOUNT_JS_ORIGIN` | no | no | must be in Shopify's JavaScript Origin list (defaults to `FRONTEND_URL`) |

### Metafields / audit / shipping claims

| Variable | Default | Purpose |
| --- | --- | --- |
| `SHOPIFY_METAFIELD_NAMESPACES` | `custom,food` | namespaces searched for food metafields |
| `METAFIELD_NUTRITION_KEY` / `METAFIELD_INGREDIENTS_KEY` / `METAFIELD_ALLERGENS_KEY` / `METAFIELD_ORIGIN_KEY` / `METAFIELD_PREPARATION_KEY` | `nutrition` / `ingredients` / `allergens` / `origin` / `preparation` | definition keys |
| `AUDIT_PRODUCT_SCAN_LIMIT` | `250` (max 1000) | max products per report |
| `AUDIT_CACHE_TTL_SECONDS` | `300` | catalog report cache |
| `AUDIT_MIN_IMAGES` | `3` | image-count standard |
| `AUDIT_FOOD_KEYWORDS` | coffee, juice, syrup, … | food detection heuristic |
| `SHIPPING_WORLDWIDE_CLAIM` | `true` | policy claim to compare with markets |
| `SHIPPING_ADVERTISED_COUNTRIES` | `DE,AT,FR,NL,BE,IT,ES,PT,IE,UK` | countries advertised in the region selector (UK normalised to GB) |

### Socket.IO / Redis

| Variable | Required | Secret | Purpose |
| --- | --- | --- | --- |
| `SOCKET_ADMIN_JWT_SECRET` | fallback only | **yes** | fallback for the admin JWT secret when `ADMIN_JWT_SECRET` is absent |
| `SOCKET_ADMIN_TOKEN_TTL_SECONDS` | no (`3600`) | no | token lifetime |
| `SOCKET_CORS_ORIGINS` | no | no | socket CORS allow-list (falls back to CORS list) |
| `REDIS_URL` | no | **yes** | webhook dedup and Socket.IO adapter scaling (not used by restock signups) |

### Newsletter / reviews / restock

| Variable | Default | Secret | Purpose |
| --- | --- | --- | --- |
| `NEWSLETTER_PROVIDER` | `mock` | no | `mock` \| `webhook` \| `klaviyo` \| `mailchimp` |
| `NEWSLETTER_WEBHOOK_URL` / `NEWSLETTER_WEBHOOK_SECRET` | — | secret yes | provider-agnostic webhook (HMAC header) |
| `KLAVIYO_API_KEY` / `KLAVIYO_LIST_ID` / `KLAVIYO_API_REVISION` | — / `2025-01-15` | key yes | Klaviyo adapter |
| `MAILCHIMP_API_KEY` / `MAILCHIMP_LIST_ID` / `MAILCHIMP_SERVER_PREFIX` | — | key yes | Mailchimp adapter |
| `RESTOCK_PROVIDER` | `mock` | no | `mock` \| `resend` \| `webhook` for product-specific alerts |
| `RESTOCK_RESEND_API_KEY` / `RESTOCK_FROM_EMAIL` / `RESTOCK_REPLY_TO_EMAIL` | — | key yes | Direct restock email via Resend |
| `RESTOCK_WEBHOOK_URL` / `RESTOCK_WEBHOOK_SECRET` | — | secret yes | Signed restock event to email automation |
| `RESTOCK_SIGNUP_TTL_SECONDS` | `2592000` | no | Pending signup lifetime (30 days) |
| `REVIEWS_PROVIDER` | `auto` | no | `auto` \| `judge_me` \| `loox` \| `stamped` \| `yotpo` \| `okendo` \| `shopify_product_reviews` \| `none` |
| `REVIEWS_API_TOKEN` | — | **yes** | reserved for a future authenticated provider API |
| `REVIEWS_RATE_LIMIT_MAX` | `5` | no | public review submissions per rate-limit window |
| `REVIEWS_NOTIFICATION_EMAIL` | `store@benaorigins.de` | no | owner recipient for new public review emails (delivery reuses Restock/Resend settings) |
| `SENTRY_DSN` | — | yes | reserved, not wired yet |

### AI product-fact suggestions

One job only: suggest ingredient / allergen / nutrition / origin / preparation values for a product
sheet. It uses a **single pretrained hosted model** through an OpenAI-compatible API, so there is
no training step, no model download, no local inference server and only one deployment variable.

| Variable | Default | Secret | Purpose |
| --- | --- | --- | --- |
| `AI_API_KEY` | — | **yes** | free Groq key; without it the feature is silently hidden in the storefront |
| `AI_ENABLED` | `true` | no | set `false` to disable all AI routes |
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | no | any OpenAI-compatible endpoint |
| `AI_MODEL` | `openai/gpt-oss-20b` | no | pretrained model id (Groq free tier) |
| `AI_TEMPERATURE` | `0.2` | no | low variance for label-style answers |
| `AI_CACHE_TTL_SECONDS` | `3600` | no | in-memory result cache; `0` disables it |
| `AI_RATE_LIMIT_MAX` | `60` | no | public requests per IP per rate-limit window |

Setup in three steps: create a free key at [Groq Console](https://console.groq.com/keys), set
`AI_API_KEY` in `.env` (or Render's dashboard — `render.yaml` already declares it), and deploy.
The key stays server-side; the browser calls `GET /api/v1/ai/suggestions/:handle` with no
credentials. Results are cached for an hour to protect the free quota, `?refresh=true` bypasses the
cache, and `?country`/`?language` are forwarded to the product lookup. Every result is marked
`verified: false` / `needsReview: true`; the storefront keeps the "check the packaging" warning
visible and never writes suggestions back to Shopify. When the key is missing or the provider
fails, the AI accordion is simply omitted and the rest of the product page is unaffected.

---

## 9. Connecting the future React frontend

1. **Point at the API.** `VITE_API_BASE_URL=http://localhost:4000/api/v1`. Add the exact dev and
   production origins to `CORS_ALLOWED_ORIGINS` (and `SOCKET_CORS_ORIGINS` if different).
2. **Reuse the typed models.** `src/types/domain.ts`, `src/types/api.ts`, `src/types/audit.ts` are
   frontend-safe type sources (no secrets). Either import via a shared build step or generate a
   client from `/api/docs/openapi.json`.
3. **Handle the envelope once.** A single fetch wrapper should:
   - parse `{ success, data, meta, error }`,
   - surface `error.code/message/requestId`,
   - read `meta.pagination.endCursor` for “load more”,
   - show `meta.warnings` in development (especially fixture mode).
4. **Catalog flow.** `/products` → product cards; `/products/:handle` → detail with variants and
   `unitPrice`; pass `country`/`language` from the locale selector on every request.
5. **Cart flow.** `POST /cart` with `{ lines: [{ merchandiseId, quantity }] }`; persist
   `data.id`; all subsequent calls use `/cart/:cartId/...`. **URL-encode the cart id**
   (`encodeURIComponent(cart.id)`) because Shopify cart GIDs may include `?key=…`. Redirect to
   `data.checkoutUrl` for checkout (Shopify-hosted, cross-origin). On `404`, discard the stored cart
   and create a new one. Never construct checkout URLs manually.
6. **Localization.** `GET /localization` for selectors; send `country`/`language` to product,
   collection, search, cart and SEO endpoints. Prices come back contextualized via `@inContext`.
7. **Newsletter.** `POST /newsletter/subscribe` with explicit `marketingConsent: true`; show a
   double opt-in message; do not subscribe without consent.
8. **Restock alerts.** `POST /restock/subscribe` with `{ email, productHandle, consent: true,
   country?, language? }`. Signups are stored in process memory only (no Redis/database), so they
   are lost on restart. Register the Shopify `products/update` webhook; the backend re-fetches the
   product, checks availability, and sends one alert per pending signup through `RESTOCK_PROVIDER`.
9. **Accounts (only when `AUTH_CUSTOMER_ACCOUNTS_ENABLED=true`).**
   - Navigate the browser to `GET /auth/login?returnTo=/account` (do not fetch it with XHR).
   - After the callback redirect, call `GET /auth/session` with `credentials: 'include'`.
     The API returns `{ enabled, authenticated, customer, csrfToken }` — never Shopify tokens.
   - Send the session cookie on account requests (`credentials: 'include'`).
   - Logout is a `POST /auth/logout` with `x-csrf-token` from the session response; navigate to the
     returned redirect (or let the browser follow the 303).
   - Associate the cart after login: `POST /account/cart/associate` with `{ cartId }` and the
     `x-csrf-token` header. Checkout remains Shopify-hosted.
   - Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. Put the API on the same
     site as the storefront (e.g. `api.benaorigins.de`) so `Lax` cookies are sent. Cross-site
     frontends would require `SameSite=None; Secure`, which is not enabled.
   - If the flag is off, `/auth/session` returns `{ enabled:false }` and account routes return
     `503 FEATURE_DISABLED`; keep the guest cart flow.
9. **Sockets.**

   ```ts
   import { io } from 'socket.io-client';

   const publicSocket = io(API_ORIGIN + '/storefront');
   publicSocket.on('connection.ready', () => {});
   publicSocket.on('product.changed', ({ handle }) => refetchProduct(handle));

   // Admin tools only (token minted server-side; never ship the JWT secret):
   const adminSocket = io(API_ORIGIN + '/admin', { auth: { token: adminJwt } });
   adminSocket.on('order.created', () => refetchOrders());
   ```

   Always re-fetch REST data after an event; sockets are hints only.
10. **SEO/SSG.** Build-time generation is implemented in `frontend/seo/buildSeo.ts` using `/seo/*`; follow `docs/seo-strategy.md` for validation and refresh strategy.
11. **Errors/limits.** Expect `429` with `RATE_LIMITED`; back off using `RateLimit-*` headers.

---

## 10. CREDENTIALS & KEYS REPORT

Legend: **READY** = works now with defaults/fixtures · **MISSING** = needed for live use ·
**NOT NEEDED YET** = optional / later phase.

| Variable | What it is | Required? | Where exactly to get it | Public/secret | Status | Feature broken without it |
| --- | --- | --- | --- | --- | --- | --- |
| `SHOPIFY_STORE_DOMAIN` | Canonical `xxx.myshopify.com` host | Live mode: yes | Shopify Admin → **Settings → Domains** → copy the `…myshopify.com` domain (or read it from the browser URL while logged in) | Public | **MISSING** | Live Storefront calls cannot start; app stays in fixture mode |
| `SHOPIFY_API_VERSION` | Storefront API version | No (default `2026-10`) | Shopify docs → API versioning / Storefront reference; use the latest stable (currently 2026-10) | Public | **READY** | Wrong version breaks GraphQL fields; changing it without testing risks cart/product queries |
| `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` | Server-side Storefront token | Recommended | Admin → **Settings → Apps and sales channels → Develop apps → Create app** → **Configure Storefront API scopes** → select scopes → Save → **Install app** → API credentials → *Storefront API access token* (public) or, for a private token, use the **Headless** sales channel (Sales channels → Headless → Create storefront) which issues public + private tokens; or create a delegate access token for the custom app | **Secret** | **MISSING** | Metafields, product tags, inventory quantities, and token-gated Storefront features unavailable; audit food checks become “unverified” |
| `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` | Buyer-facing Storefront token (used server-side here) | Alternative to private | Same app/Headless channel → *Storefront API access token* (public) | Public by design (still keep server-side here) | **MISSING** | Same feature loss as above, except tokenless products/collections/cart still work |
| `SHOPIFY_ADMIN_API_ACCESS_TOKEN` | Admin API token for the webhook registration script only | Optional (script) | Same custom app → **API credentials** → *Admin API access token* (shown once) → **Configure Admin API scopes** (`read_products`, `read_orders` if using order webhooks; `read_content` if needed) | **Secret** | **MISSING** | Cannot run `webhooks:register --apply`; runtime API is unaffected. Can be avoided by creating webhooks manually |
| `SHOPIFY_WEBHOOK_SECRET` | HMAC-SHA256 signing secret for webhooks | Yes for webhooks | App-created webhooks: custom app → **API credentials → API secret key**. Admin-created webhooks (Settings → Notifications): each webhook/shop signing secret shown there — it is **not** the app’s API secret; prefer API-created webhooks so one secret covers all | **Secret** | **MISSING** | `/webhooks/shopify` returns `503`; no realtime events or dedup processing |
| `PUBLIC_WEBHOOK_BASE_URL` | Public HTTPS base URL Shopify can reach | Yes for webhooks | Dev: `cloudflared tunnel --url http://localhost:4000` or `ngrok http 4000`; Production: deploy e.g. `https://api.benaorigins.de` with TLS. Receiver: `<base>/webhooks/shopify` | Public | **MISSING** | Shopify cannot deliver webhooks; registration script has no callback URL |
| `SHOPIFY_WEBHOOK_TOPICS` | Topics to manage in the script | No (safe defaults) | Choose from Shopify webhook topics; default: orders/create, orders/updated, orders/fulfilled, products/update, inventory_levels/update, app/uninstalled | Public | **READY** (defaults) | Nothing; script still works with defaults |
| `SHOPIFY_ADMIN_API_VERSION` | Admin API version for script | No (`2026-10`) | Shopify API versioning | Public | **READY** | Only affects the registration script |
| `SHOPIFY_WEBHOOKS_APPLY` | Extra guard for applying webhooks | No (`false`) | Set to `true` only for an approved apply run | Public | **NOT NEEDED YET** | Apply is blocked (intended) |
| Storefront scopes | Permissions granted to the Storefront token | Yes with token | App → Configure Storefront API scopes: `unauthenticated_read_product_listings`, `unauthenticated_read_product_inventory`, `unauthenticated_read_product_tags`, `unauthenticated_read_content`, `unauthenticated_read_checkouts`, `unauthenticated_write_checkouts`; add `unauthenticated_read_selling_plans` only if subscriptions, `unauthenticated_read_metaobjects` only if metaobjects, `unauthenticated_read_customers`/`unauthenticated_write_customers` only for customer accounts | Public scope names | **MISSING** | Missing scopes cause ACCESS_DENIED for tags/inventory/content; metafields require token-based access |
| Metafield definitions (`nutrition`, `ingredients`, `allergens`, `origin`, `preparation`) | Product data for food/compliance checks | Yes for food audit | Admin → **Settings → Custom data → Products → Add definition** → name, namespace (e.g. `custom`), key → **Access → Storefront access: enabled** → Save. Or Admin GraphQL `metafieldDefinitionCreate` with Storefront access | Data | **MISSING** | Food information always reported “unverified/unavailable”; #3/#4 checks are partial |
| Shopify Markets (countries, currencies, languages) | Purchasable markets and localized content | Yes for markets/localization | Admin → **Settings → Markets** → Add market → countries/currencies; **Settings → Languages** → add German; assign languages/markets; publish products | Config | **MISSING / UNKNOWN** | Localization returns only what is configured; worldwide-claim mismatch may be a false positive; `@inContext` has nothing to switch |
| `CORS_ALLOWED_ORIGINS` | Exact allowed browser origins | Production yes | The final storefront origins (e.g. `https://benaorigins.de,https://www.benaorigins.de` + preview) | Public | **READY for dev** / **MISSING production** | Browser calls blocked with `403` |
| `FRONTEND_URL` | Future frontend origin | No | Final deployed storefront URL | Public | **MISSING (prod)** | Only used in diagnostics/scripts; CORS is the real gate |
| `SITE_URL` | Canonical public storefront | No (default benaorigins.de) | Production domain | Public | **READY** | Wrong canonicals/JSON-LD/sitemap URLs |
| `SITE_NAME` | Brand name in metadata | No (default) | Brand decision | Public | **READY** | Slightly wrong titles/JSON-LD |
| `ADMIN_API_KEY_SHA256` | SHA-256 hash of the admin API key | Production: key or JWT | Generate a key then its hash: `node -e "const c=require('crypto');const k=c.randomBytes(32).toString('hex');console.log('KEY',k);console.log('HASH',c.createHash('sha256').update(k).digest('hex'))"`; put only the hash here, keep the key in your secret manager | **Secret** (hash only) | **MISSING** | Without key/JWT, production refuses to start; admin routes return `503 NOT_CONFIGURED` in dev |
| `ADMIN_JWT_SECRET` | HS256 admin API + Socket.IO JWT secret | Production: key or JWT | Generate: `openssl rand -hex 32` | **Secret** | **MISSING** | Admin JWT flows and `/admin` sockets unavailable; API-key auth still works |
| `ADMIN_JWT_TTL_SECONDS` | Admin JWT lifetime | No (`3600`) | Policy | Public | **READY** | Nothing critical |
| `SOCKET_ADMIN_JWT_SECRET` | Fallback admin JWT secret | Optional | Generate: `openssl rand -hex 32` | **Secret** | **NOT NEEDED YET** | Used only when `ADMIN_JWT_SECRET` is absent |
| `SOCKET_ADMIN_TOKEN_TTL_SECONDS` | Legacy socket token lifetime | No (`3600`) | Policy | Public | **READY** | Nothing critical |
| `SOCKET_CORS_ORIGINS` | Socket CORS allow-list | No | Same as CORS or narrower | Public | **READY (dev)** | Browser sockets blocked if origins mismatch |
| `AUTH_CUSTOMER_ACCOUNTS_ENABLED` | Layer 1 master switch | No (`false`) | Set `true` only after Shopify Customer Account API is configured | Public | **READY (false)** | Accounts disabled; guest checkout unaffected |
| `SESSION_SECRET` | Signs the HttpOnly session cookie | Auth: yes | Generate: `openssl rand -hex 32` | **Secret** | **MISSING** | Auth cannot create sessions |
| `COOKIE_DOMAIN` / `COOKIE_SECURE` | Cookie scope/flags | No | Omit domain for `__Host-`; Secure defaults true in prod | Public | **READY (defaults)** | Wrong flags can block cookies |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | Customer Account API OAuth client ID | Auth: yes | Admin → **Settings → Customer accounts** → enable **New customer accounts**; then **Headless** → storefront → **Customer Account API** settings → Client ID | Public | **MISSING** | Login redirect/token exchange impossible; Layer 1 stays unverified |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET` | Confidential-client secret | If shown | Same Customer Account API settings page | **Secret** | **MISSING / N/A** | Only needed for confidential clients; PKCE is used either way |
| `SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL` / `TOKEN_URL` / `LOGOUT_URL` / `JWKS_URI` | OAuth endpoints | Auth: yes | Open `https://{storefront-domain}/.well-known/openid-configuration` and copy `authorization_endpoint`, `token_endpoint`, `end_session_endpoint`, `jwks_uri`; or leave empty and use discovery | Public | **MISSING / DISCOVERABLE** | Auth URLs can be discovered automatically; set explicit only if discovery is blocked |
| `SHOPIFY_CUSTOMER_ACCOUNT_API_URL` | Customer Account GraphQL endpoint | Auth: yes | Open `https://{storefront-domain}/.well-known/customer-account-api` → `graphql_api`; or use discovery | Public | **MISSING / DISCOVERABLE** | Account profile/orders/addresses fail |
| `SHOPIFY_CUSTOMER_ACCOUNT_ISSUER` | ID-token issuer | No | `issuer` from the OpenID discovery document | Public | **DISCOVERABLE** | ID-token issuer validation skipped if omitted when endpoints are explicit |
| `CUSTOMER_ACCOUNT_REDIRECT_URI` (`SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI`) | OAuth callback URL | Auth: yes | Register exactly in Customer Account API settings; must be HTTPS. Dev: `https://{tunnel}/api/v1/auth/callback`; prod: `https://api.benaorigins.de/api/v1/auth/callback` | Public | **MISSING** | Shopify rejects login with redirect_uri mismatch |
| `SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI` (`CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI`) | Post-logout URL | Recommended | Register in the same settings; e.g. `https://benaorigins.de/account/logged-out` | Public | **MISSING** | Logout falls back to `FRONTEND_URL` |
| `SHOPIFY_CUSTOMER_ACCOUNT_JS_ORIGIN` (`CUSTOMER_ACCOUNT_JS_ORIGIN`) | JavaScript origin for token requests | Auth: yes | Register in Customer Account API settings; dev `http://localhost:5173` (or a tunnel), prod `https://benaorigins.de` | Public | **MISSING** | Token endpoint returns `401 invalid_token` without a registered Origin |
| `AUTH_SESSION_TTL_SECONDS` / `AUTH_STATE_TTL_SECONDS` / `AUTH_RATE_LIMIT_MAX` | Session/state/lockout policy | No | Defaults `86400` / `600` / `10` | Public | **READY** | Weak/annoying session or throttling behaviour |
| New Customer Accounts setting | Shopify identity mode | Auth: yes | Admin → **Settings → Customer accounts** → **New customer accounts** (not legacy) | Config | **MISSING / UNKNOWN** | Customer Account API requires new accounts; legacy mode is incompatible |
| Protected customer data | Shopify compliance requirement | Auth: yes | Customer Account API settings / app protected customer data configuration | Config | **MISSING / UNKNOWN** | Live account API may be blocked until requirements are met |
| `NEWSLETTER_PROVIDER` | Newsletter backend selection | No (`mock`) | Choose `mock` (dev), `webhook`, `klaviyo`, `mailchimp` | Public | **READY (mock)** | Mock sends nothing; production needs a real provider |
| `RESTOCK_PROVIDER` | Restock alert backend | No (`mock`) | `mock` (dev), `resend` (direct email), `webhook` (automation) | Public | **READY (mock)** | Set `resend` + verified sender or a signed webhook before launch |
| `NEWSLETTER_WEBHOOK_URL` / `NEWSLETTER_WEBHOOK_SECRET` | Forwarding endpoint + HMAC | If provider=webhook | Your automation endpoint (Zapier/Make/n8n/custom) | Secret for the secret | **NOT NEEDED YET** | Webhook provider returns `503 NOT_CONFIGURED` |
| `KLAVIYO_API_KEY` / `KLAVIYO_LIST_ID` / `KLAVIYO_API_REVISION` | Klaviyo private key + list | If provider=klaviyo | Klaviyo → **Account → Settings → API keys → Create Private API Key** (profiles/lists scopes); list ID from the list URL; revision from Klaviyo API docs | Key **secret**; list ID public | **NOT NEEDED YET** | Klaviyo adapter returns `503`; mock still works |
| `MAILCHIMP_API_KEY` / `MAILCHIMP_LIST_ID` / `MAILCHIMP_SERVER_PREFIX` | Mailchimp credentials | If provider=mailchimp | Mailchimp → **Profile → Extras → API keys**; Audience → **Settings → Audience ID**; server prefix = `usX` suffix of the key | Key **secret**; IDs public | **NOT NEEDED YET** | Mailchimp adapter returns `503`; mock still works |
| `REVIEWS_PROVIDER` | Installed review app (or `auto`) | No (`auto`) | Detect via `GET /api/v1/reviews/assessment` + Admin → **Settings → Apps and sales channels → Apps** | Public | **MISSING / UNKNOWN** | Detection may mislabel; integration guidance is still returned |
| `REVIEWS_API_TOKEN` | Review provider API token | Only when a provider API feed is wired | Judge.me: Settings → API → private token. Loox: Settings → API token. Okendo: API key/subscriber ID. Stamped: public key/store hash. Yotpo: app key | **Secret** | **NOT NEEDED YET** | Public customer reviews use the built-in POST endpoint; a provider feed is still optional |
| `REVIEWS_NOTIFICATION_EMAIL` | Owner recipient for new public reviews | No (`store@benaorigins.de`) | Public review submissions email via the Restock/Resend transport | Public | **READY** | Delivery is simulated unless `RESTOCK_PROVIDER=resend` is configured |
| `REDIS_URL` | Redis for webhook dedup and Socket.IO scaling only | No | Upstash/Railway/ElastiCache/self-hosted; use `rediss://…` with TLS | **Secret** | **NOT NEEDED YET** | Restock signups are memory-only by design; dedup falls back to memory without Redis |
| `SENTRY_DSN` | Error reporting | No | Sentry project settings | Secret-ish | **NOT NEEDED YET** | Reserved; not wired in this phase |
| `TRUST_PROXY` | Proxy hop count | No | Hosting docs (1 for one reverse proxy) | Public | **MISSING for prod** | Wrong client IPs → rate limiting/CORS/buyer-IP issues |
| `LOG_LEVEL` / `LOG_PRETTY` | Logging | No | — | Public | **READY** | Nothing critical |

### Storefront scopes — exact list for this build

Required for full functionality:

```text
unauthenticated_read_product_listings
unauthenticated_read_product_inventory
unauthenticated_read_product_tags
unauthenticated_read_content
unauthenticated_read_checkouts
unauthenticated_write_checkouts
```

Only if used later:

```text
unauthenticated_read_selling_plans      # subscriptions / selling plans
unauthenticated_read_metaobjects        # metaobjects (not product metafields)
unauthenticated_read_customers          # legacy Storefront customer flows (not used by Customer Account API)
unauthenticated_write_customers          # legacy Storefront customer flows (not used by Customer Account API)
```

Shopify’s current docs note that **product tags, inventory quantities, metafields/metaobjects and
customers require token-based Storefront access**; products, collections, search, pages and cart
also work tokenless with a lower query-complexity limit (1,000).

### "Do these first" (ordered by unblocking the most functionality)

1. **Add `SHOPIFY_STORE_DOMAIN` + a private Storefront token** (and the scopes above). This unlocks
   live catalog, variants, images, tags, inventory and all audits. Verify with
   `npm run smoke` (read-only).
2. **Expose the five food metafield definitions to the Storefront API** and confirm the actual
   namespaces/keys. This is the only way #2/#3/#4 become authoritative rather than “unverified”.
3. **Set `SHOPIFY_WEBHOOK_SECRET` + `PUBLIC_WEBHOOK_BASE_URL`** (tunnel in dev). Then dry-run
   `npm run webhooks:register`; apply only with approval. This unlocks Socket.IO business events.
4. **Set `ADMIN_API_KEY_SHA256` and/or `ADMIN_JWT_SECRET`** (`openssl rand -hex 32`). This
   protects the admin API and the `/admin` Socket.IO namespace.
5. **Decide on customer accounts.** If yes: enable **New customer accounts**, create the Customer
   Account API client in the Headless channel, register redirect/logout/JS origins, generate
   `SESSION_SECRET`, then set `AUTH_CUSTOMER_ACCOUNTS_ENABLED=true`. If no: leave it `false` and
   skip all Layer 1 credentials (see `docs/authentication.md`).
6. **Decide production origins + newsletter provider**: set `CORS_ALLOWED_ORIGINS` /
   `FRONTEND_URL` / `SITE_URL`, and either keep `mock` or configure Klaviyo/Mailchimp/webhook with a
   documented consent/double opt-in process.

---

## 11. Missing Shopify configuration & open risks / questions

1. **No credentials supplied** → every live integration is unverified. Fixtures prove behaviour, not
   Shopify compatibility. First live action should be `npm run smoke` (read-only).
2. **Metafield reality unknown.** Namespaces (`custom`,`food`) and keys are assumptions. Definitions
   must be exposed to the Storefront API; otherwise food findings degrade to “unverified”. Please
   confirm the real namespace/key names and whether values are JSON vs plain text.
3. **Reviews app unknown.** Detection uses public-page signatures; it cannot prove the app is active
   or that reviews are genuine. Confirm in Admin → Apps. No review content is scraped.
4. **Legal notice (“Impressum”) may not be a Shopify page.** The backend looks up page handles
   `impressum`, `legal-notice`, `imprint`, … If it lives elsewhere, `policies` will report a gap.
   Requirement #6 cannot be fully automated without the source URL(s).
5. **Shipping rates:** the Storefront API exposes no rate table. `GET /shipping` can only return
   estimates for a cart with buyer identity; carrier rates would need `withCarrierRates` + `@defer`.
   Admin shipping profiles would need `read_shipping`.
6. **Markets:** market handles are deprecated/not exposed. Country/currency groups are derived and
   labelled; if exact market segmentation is required, an Admin read integration is needed.
7. **Webhook secret model:** app-created webhooks use the app’s API secret key; admin-created
   (Settings → Notifications) webhooks use a different signing secret. The backend supports one
   secret. Decide: create all webhooks via API (recommended) or tell me the admin secret(s).
8. **Order webhooks + protected customer data:** order topics may require protected customer data
   access for the app. This backend only reads non-PII fields, but Shopify’s approval still applies.
9. **No PII store:** admin order events intentionally omit customer details. A future admin UI needs
   its own authenticated order integration; do not expand socket payloads with PII.
10. **Newsletter consent evidence:** Shopify’s native marketing consent cannot be written by a
    passwordless server call. Provider choice + double opt-in + consent record retention must be
    decided (GDPR). The backend currently sends only with explicit `marketingConsent: true`.
11. **Cart persistence:** there is no cart database by design. If a stored cart id 404s (expiry),
    the frontend must create a new cart. Confirm acceptable UX.
12. **Heuristic audit rules:** units/naming, preparation, allergen emphasis and “worldwide” claims
    can produce false positives. Reports are advisory; no live data was modified. Legal findings
    (#1, #2, #3, #4, #5, #7) require German legal review.
13. **Search facets (#20)** are not implemented: the Storefront API product filters
    (`ProductFilter`) and Shopify Search & Discovery configuration are a separate decision.
14. **Localization (#21):** translations must be configured in Shopify Languages/Markets; the API
    only returns what exists. Decide URL strategy (`?country=&language=` vs path prefixes) before SSG.
15. **API version drift:** pinned to `2026-10`. A future upgrade can change cart/metafield fields;
    re-run tests and a live smoke before bumping `SHOPIFY_API_VERSION`.
16. **Infrastructure unknowns:** production host, TLS/API subdomain, log/metrics destination,
    `TRUST_PROXY` hops, Redis availability, and whether multi-instance deployment is planned.
17. **CORS/preview origins:** exact production domains (with/without `www`) and Vercel/Netlify
    preview URLs are unknown; wildcard is intentionally rejected.
18. **Scope approvals:** confirm the Headless channel vs custom app path. If customer accounts are
    in scope, additional Storefront/Customer Account scopes and protected-data review apply.
19. **Customer accounts remain UNVERIFIED.** The addendum is implemented and mock-tested, but no
    live Customer Account API login has been performed. Confirm: New customer accounts enabled,
    Customer Account API client created, redirect/logout/JS origins registered, protected customer
    data requirements met.
20. **Cart → checkout authentication caveat:** we set `customerAccessToken` on the cart per current
    Shopify docs. Verify live that prefilled checkout works; the documented fallback is appending
    `sso=silent` to `checkoutUrl`.
21. **Cross-site cookies:** the session cookie is `SameSite=Lax`, so the API and storefront must be
    on the same site (e.g. `api.benaorigins.de` + `benaorigins.de`). A frontend on another domain
    would require `SameSite=None; Secure` changes.
22. **Sessions without Redis** are lost on restart; with multiple instances, set `REDIS_URL`.
23. **Auth redirect URIs** must be HTTPS and registered exactly; local development requires a
    tunnel. Do not use localhost HTTP redirect URIs with Shopify.

**Questions I need answered (non-blocking):** Which review app is installed? Where is the Impressum
hosted? Which newsletter provider do you want? Is the frontend deployed on a subdomain of
benaorigins.de or elsewhere? Do you want exact Shopify Markets segmentation (requires Admin read
access)? Should facets (#20) be part of the next phase?

---

## 12. Security summary

- Secrets only via env; `.env` gitignored; `.env.example` contains no real values.
- Admin token never exposed client-side; Storefront private token stays server-side.
- Customer Account API tokens live only in the server-side session store; browsers get an HttpOnly,
  signed session cookie and a CSRF token, never a Shopify token.
- OAuth state is single-use, PKCE is always used, ID-token nonce/issuer/audience are verified.
- Helmet (CSP allowing only Swagger UI CDN), strict CORS allow-list, rate limits (global + cart +
  newsletter + webhook), request ids, structured pino logs with redaction.
- Webhook HMAC verified against the raw body with `timingSafeEqual`; dedup before processing.
- Internal audit/review endpoints protected by admin API key (SHA-256 hash comparison) and/or a
  role-bearing JWT; 401 vs 403 semantics are consistent.
- Admin Socket.IO namespace requires a short-lived JWT; public namespace carries no sensitive data.
- Errors never include tokens, upstream headers or stack traces.

## 13. Explicitly not built (and deliberately unchanged)

- React UI, Tailwind, router, Socket.IO client app.
- Product/order database, customer password storage, payment handling, checkout completion.
- Address/profile mutations (account routes are read-only until approved).
- Admin UI for audits or orders.
- Review widgets/API calls, newsletter provider UI.
- Sitemap publishing, prerendering deployment, DNS changes, theme changes, live product fixes.

Backend review is the gate: please review this report and the two docs (`docs/audit-mapping.md`,
`docs/seo-strategy.md`) before any UI or live-data work begins.
