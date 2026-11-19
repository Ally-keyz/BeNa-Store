# Phase 4 review — remaining pages and commerce integration

## Scope completed

All remaining storefront routes are now real implementations, not stubs:

- `/catalog`, `/collections`, `/collections/:handle`, `/rwandan-products`
- `/search`, `/products/:handle`
- `/cart`
- `/about`, `/contact`, `/shipping`, `/faq`, `/legal/:page`
- `/account`, `/account/login`, `/account/orders`, `/account/addresses`
- `/shop`, `/orders` and `/addresses` aliases
- 404 and route-level error boundaries

Shared infrastructure added or wired:

- Backend SEO metadata with local fallback on every content route.
- Socket.IO cache invalidation hints only; no storefront data is taken from a socket event.
- Reusable cart, product, policy, account and contact UI.
- Explicit loading, empty, error and unavailable states.
- Full DE/EN copy; one translation source of truth and one brand/email config module.

## Backend contract handling

- Every request goes through `src/api/client.ts`, which understands `{ success, data, meta?, error? }`.
- Cursor pagination uses `meta.pagination.endCursor` through TanStack infinite queries.
- Cart IDs are URL-encoded by the endpoint layer.
- A missing cart (`404 NOT_FOUND`) is forgotten locally and recreated on the next add.
- Checkout is a handoff only: the storefront renders review and a button that navigates to the backend-provided `checkoutUrl`. No payment form, no Shopify SDK, no direct Shopify call, and no checkout click in tests.

## Audit rules reflected in the UI

- Coming-soon products never render an active add-to-cart.
- Compare-at prices are struck out only when strictly greater than the current price.
- Unit price is hidden when the backend gives no unit measurement.
- Allergens are emphasized separately; missing food facts show explicit “not supplied” rows rather than invented values.
- Ingredients, nutrition, origin and preparation are shown when the backend supplies them.
- Preparation is rendered as structured steps/text, not mixed into a vague sentence.
- Delivery, returns and support cues sit next to the purchase action.
- Shipping copy reflects backend markets only and does not promise worldwide delivery.
- Reviews are not fabricated; there is no fake review endpoint or review UI.
- Detailed filters are not presented as real if the backend has no facets; catalog offers sorting and live collections instead.
- The exact required navigation remains `Home / Rwandan Products / Catalog / About Us / Contact`, with `EUR / EN` and the region/language dialog.

The home category tiles from the earlier snapshot were replaced by a backend-backed category pill filter. Selecting Coffee/Food/Crafts calls `/collections/:handle` and renders products returned by that endpoint; there is no client-side category guessing.

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | 0 errors, 5 existing `react-refresh/only-export-components` warnings |
| `npm run build` | Passed; production bundle generated |
| `npm run test` | 4 files, 21 tests passed |
| `npm run test:e2e` | Passed: 22 mocked API calls, checkout never opened |
| i18n key audit | 457 keys defined, 0 missing literal `t()` keys, 0 unknown dotted literals |

The critical e2e run uses the repository's mock fixtures through a local Vite server and mocked `/api/v1/**` responses. It verifies:

1. Header shell, exact navigation and `EUR / EN` market control.
2. Home category filter calling `GET /collections/coffee` and showing only coffee products.
3. Catalog and search flows against mocked backend products.
4. Product detail add-to-cart creating a cart through `POST /cart`.
5. Checkout handoff present and enabled, with no card/payment inputs.
6. Cart review page showing the handoff without taking payment.
7. Coming-soon product having no add-to-cart action.

The checkout URL used in fixtures is `https://fixtures.invalid/checkout/e2e-critical`; the script asserts that it is never requested. No real Shopify checkout was attempted.

## Known owner data tasks and limitations

- Live backend calls previously timed out (likely Render cold start), so live API verification remains for owner/deployment review.
- Brand name, legal entity, address, contact email and socials are still placeholders in `src/config/index.ts`.
- Legal documents remain marked placeholders until the backend publishes final text.
- Product metafields remain null until Shopify metafield definitions are created, exposed and filled; the UI does not invent allergens, nutrition, ingredients, origin or preparation.
- Native-speaker German review is still needed.
- Newsletter provider is mocked and customer accounts are feature-flagged off in the backend.
- Reviews, detailed facets and contact submission endpoints do not exist in the backend; the frontend does not pretend they do.
- `SHOPIFY_WEBHOOK_SECRET` is still needed for a healthy `/health/ready`.
- Descriptive handles and redirects remain owner data tasks in Shopify.

## Safety statement

No Shopify theme, DNS, product data, payment setting, webhook or deployment was changed. No credentials or secrets were added to the frontend. Nothing was pushed or published.

**Stop point:** Phase 4 is ready for owner approval. Please approve before proceeding to the Phase 6 final verification and closeout.
