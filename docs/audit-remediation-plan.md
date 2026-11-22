# October 2026 audit — phased remediation plan

Source: `BeNa_Origins_Storefront_Audit_Oct_2026.pdf` (23 findings) and
`frontend/docs/audit-frontend-requirements.md`.

This plan records what the repository implements for each phase and the owner gates that
remain. **No live Shopify data, theme, DNS, payments, webhooks or policies are changed by this
repository.**

## Owner-supplied data already applied

- Legal/business identity: **BeNa Store**, brand **BeNa Origins**, Germany,
  **Am Galgenköppel 4, 34289 Zierenberg**, **store@benaorigins.de**.
  These are defaults in `frontend/src/config/index.ts` and `frontend/.env.example`.
- Socials: generic Instagram and Facebook links only. **TikTok removed** (no account).
- About Us founder/partner/fulfilment evidence sections: **removed** — the owner cannot supply
  substantiation now.
- Withdrawal legal-approval gate and public "awaiting approval" notice: **removed** — the owner
  has no power over that approval now. The form is rendered as a normal legal page.
- Product facts: **AI-generated suggestions are used for now**. All metafield values in
  `scripts/data/metafields.json` remain placeholders and are never published. Every AI value is
  labelled "AI-generated suggestion — check the packaging before use", and the allergen callout
  always says to check the packaging.

## Phase 0 — Guardrails (done)

- Keep all secrets server-side; frontend uses only `VITE_*` public values.
- Audit endpoints remain read-only.
- Live-apply scripts are dry-run by default and require an explicit `--apply` plus an env guard.
- Public identity values are configurable but now have real owner-supplied defaults.

## Phase 1 — Compliance and customer trust (findings 1–8, 23)

| Item | Code delivered | Status / remaining owner action |
| --- | --- | --- |
| #1 withdrawal | `POST /api/v1/withdrawals`, provider-agnostic webhook/mock adapter, full frontend form at `/legal/withdrawal` | Delivered; legal approval gate removed at owner request |
| #2 unit prices | Backend flags retained; no frontend unit-price labels are rendered | Configure unit prices on Shopify only if needed for other channels (optional) |
| #3 food info | AI suggestions with unverified labels; metafield UI kept for future | Rely on AI for now; metafield apply is blocked |
| #4 allergens | Prominent allergen callout plus emphasized accordion block, with packaging warning | Delivered |
| #5 price history | Invalid compare-at values hidden; price-info disclosure | `scripts/export-sale-prices.ts` produces evidence CSV; manual 30-day-low check still needed |
| #6 identity | Owner-supplied identity in config defaults | Applied; override only if details change |
| #7 shipping claim | Availability-driven shipping page + markets report | Correct live policy text if still needed |
| #8 shipping rates | Backend guidance + cart estimates + final-at-checkout copy | Publish a rate table if desired |
| #23 boilerplate | Frontend renders none; e2e assertion added | Visually check the live Shopify theme |

## Phase 2 — Catalog cleanup (findings 9–15)

- Shopify's live `availableForSale` state is the source of truth: products that are actually in
  the store can be added to the cart even if their title/handle/tag still says "Coming Soon".
  The stale label is only shown for products Shopify reports as unavailable; `coming-soon-8`
  hero priority was removed.
- The owner supplied a **50-product catalog snapshot** in `scripts/data/catalog-inventory.json`.
  It has titles/status/stock/category but **no Shopify handles**, so no handle-based live writes
  are proposed.
- `npm run catalog:inventory` produces a read-only review: status counts, duplicates, out-of-stock
  active products, draft/unlisted products with stock, negative stock, missing categories, and safe
  title-normalization candidates. See `docs/catalog-inventory-review.md`.
- `scripts/data/catalog-fixes.json` intentionally has empty `titleNormalizations` and
  `handleRedirects` until exact Shopify handles are confirmed. Agashya copy stays blocked.
- `scripts/apply-metafields.ts` remains available for future verified facts but is not to be used
  now: all shipped values are placeholders and are skipped.

## Phase 3 — Buying experience (findings 16–22)

- Hero, positioning and trust cues: delivered.
- About Us: original pillar/story sections remain; owner-substantiation sections removed.
- Reviews: `GET /api/v1/reviews/product/:handle` reads genuine provider data when configured;
  `ProductReviews` renders only real reviews and no fabricated ratings.
- Facets: `GET /api/v1/catalog/facets` plus catalog brand/dietary/origin filters.
- Localization: country/currency selector in header and mobile nav.

## Phase 4 — Verification and launch

- Cookie-consent state and consent-gated analytics event sink (`frontend/src/lib/analytics.ts`).
  No third-party script, pixel or network request is created.
- Backend unit/integration tests for withdrawals, reviews and facets.
- Frontend unit tests for facets, product helpers, analytics and the allergen callout.
- Critical e2e covers the region selector, facets, reviews, and the withdrawal declaration.
  Checkout is never opened by e2e.
- Live verification: customer login, webhook delivery, live audit, native German review,
  accessibility/performance/form/checkout checks, owner approval before publish.

## Verification status (code side)

| Check | Result |
| --- | --- |
| Backend `npm run typecheck` | pass |
| Backend `npm test` | 25 files / 118 tests passed |
| Backend `npm run lint` | pass (0 errors) |
| Frontend `npm run typecheck` / `npm run build` | pass |
| Frontend `npm test` | 8 files / 35 tests passed |
| Frontend `npm run lint` | pass (0 errors; pre-existing fast-refresh warnings only) |
| Frontend `npm run test:e2e` | pass (42 mocked API calls; checkout never opened) |
| `npm run catalog:fixes` (dry-run) | no handle-based intents; zero Shopify writes; runs without credentials |
| `npm run metafields:apply` (dry-run) | all 35 placeholders skipped; zero writes; runs without credentials |
| `npm run catalog:inventory` | read-only report from the owner snapshot |
| `npm run sale-prices:export` | read-only CSV evidence exporter |
| `--apply` without `SHOPIFY_LIVE_APPLY=1` | refused before any Shopify request (verified) |

No Shopify writes, deployments, DNS/theme/payment/webhook changes or policy publications were
made. All changes remain uncommitted for owner review.

## Live-apply scripts and guards

| Command | Purpose | Write guard |
| --- | --- | --- |
| `npm run catalog:fixes` | Handle-keyed title/handle fixes, verified preparation copy, invalid compare-at cleanup | Dry-run; needs `--apply` **and** `SHOPIFY_LIVE_APPLY=1`; currently no handle-keyed intents |
| `npm run metafields:apply` | Create Storefront-accessible `custom` metafield definitions and assign verified values | Dry-run; needs `--apply` **and** `SHOPIFY_LIVE_APPLY=1`; skips all placeholders |
| `npm run sale-prices:export` | Read-only CSV evidence export for sale-price verification | Never writes, even with flags |
| `npm run catalog:inventory` | Read-only review of the owner snapshot | Never calls Shopify |

Dry-run needs no credentials and makes no Shopify calls; real credentials are loaded only when
both guards are present. Required server-side environment for apply scripts:
`SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_API_ACCESS_TOKEN`, optionally `SHOPIFY_ADMIN_API_VERSION`.
Tokens are never logged or exposed through `VITE_*`.

## Owner checklist — what still needs you

1. **Sale-price evidence (findings #5/#6):** run `npm run sale-prices:export` when you have Shopify
   Admin credentials, open `scripts/data/reports/sale-prices.csv`, and manually confirm the
   previous 30-day low for each sale. No code change is needed for this.
2. **Reviews (optional):** choose a genuine reviews provider and set `REVIEWS_API_URL_TEMPLATE`
   in the backend `.env`, or leave it empty to keep the honest "reviews unavailable" state.
3. **Shopify credentials (optional, only for live writes):** create a Shopify Admin app and set
   `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_ADMIN_API_ACCESS_TOKEN`. Nothing is written unless you also
   pass `--apply` and set `SHOPIFY_LIVE_APPLY=1`.
4. **Exact Shopify handles (optional, only for catalog fixes):** if you want title/handle fixes
   applied, send the handle for each product you want changed; the snapshot only has titles.
5. **Live checks:** verify real customer login, webhook delivery/signatures, run the live audit,
   have a native German speaker review `frontend/src/i18n/de.ts`, and complete accessibility /
   performance / form / checkout tests on the live storefront.
6. **Final written approval** before any live data, theme, policy or deployment change.

Removed from your checklist at your request: withdrawal legal approval, About Us substantiation,
TikTok/social account URLs, and owner-supplied nutrition/ingredients/allergens/origin/preparation
(AI is used instead, clearly labelled as unverified).
