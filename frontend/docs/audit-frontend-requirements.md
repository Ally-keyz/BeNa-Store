# October 2026 audit — frontend requirements

Source: `BeNa_Origins_Storefront_Audit_Oct_2026.pdf` (5 pages, extracted locally because the PDF viewer is unavailable). Executive summary: the store already has a differentiated Rwandan-products story; the work is clearer mandatory information, consistent communication, catalog cleanup and a more persuasive buying experience — not a platform rebuild.

The audit has **23 findings** across compliance/trust, catalog/merchandising and buying experience. The backend mapping already exists at `docs/audit-mapping.md`; this document states what the frontend must do.

## 1. Compliance & customer trust

| # | Audit finding | Frontend responsibility |
| --- | --- | --- |
| 1 | Withdrawal function not evident | Legal stub route exists; electronic withdrawal scaffold needs legal review before launch. |
| 2 | Unit prices need checking | `src/lib/money.ts` formats EUR/kg and EUR/L; unknown unit prices render nothing. |
| 3 | Food information may be incomplete | Product detail must show nutrition, ingredients and origin when metafields exist; otherwise show an honest unavailable state. |
| 4 | Allergens not visibly emphasized | Product detail must place allergens in a distinct, visibly emphasized block. |
| 5 | Sale-price references need a 30-day check | Frontend only strikes compare-at when it is strictly greater than price; history remains an owner/legal task. |
| 6 | Business identity and emails differ | One `BRAND` config constant supplies name, email, legal identity and contact links. |
| 7 | Worldwide delivery claim conflicts with selector | Shipping page must use backend market availability, never say “worldwide”. |
| 8 | International shipping fees hard to estimate | Show backend rate guidance where available and defer exact totals to Shopify checkout. |

## 2. Catalog & merchandising

| # | Audit finding | Frontend responsibility |
| --- | --- | --- |
| 9 | “Coming Soon” items show Add to cart | `getAvailability()` blocks cart actions for Coming Soon even when Shopify reports purchasable. |
| 10 | Duplicate Igiseke titles obscure differences | Product cards render backend titles; differentiating titles is an owner data task. |
| 11 | Generic product handles | URLs use backend handles; descriptive handles and redirects are an owner task. |
| 12 | Agashya mixing instructions incomplete | Product detail must render structured preparation steps from metafields/description. |
| 13 | Coffee storytelling uses old launch messaging | Hero copy no longer uses “soon”/launch signup language; active catalog CTA instead. |
| 14 | Product naming and copy inconsistent | Frontend does not rewrite live titles; inconsistency is reported, not auto-fixed. |
| 15 | €0.00 comparison value | `isOnSale()` rejects zero/equal/lower compare-at values. |

Catalog standard adopted by the cards: one clear title, correct availability, descriptive URL, accurate price, unit price where known, and consistent delivery/returns/support cues near purchase.

## 3. Buying experience

| # | Audit finding | Frontend responsibility |
| --- | --- | --- |
| 16 | Homepage hero copy too generic | Hero now leads with “Discover Rwanda in every box” and category-specific CTAs. |
| 17 | Store positioning not prioritized | Navigation and hero establish a clear hierarchy: Rwandan products → coffee / food / crafts. This is **not** a coffee-only shop. |
| 18 | About Us lacks trust evidence | About stub is reserved for substantiated origin, team and fulfillment content. |
| 19 | Social proof not prominent | Reviews area must only show genuine feedback; no fabricated ratings. |
| 20 | Limited filter dimensions | Category/brand/dietary filters need a backend endpoint and Shopify Search & Discovery config; recorded as a gap, not faked. |
| 21 | German localization opportunity | DE/EN copy plus a real country/language/currency selector wired to `/api/v1/localization`. |
| 22 | Trust cues distant from purchase decisions | Product detail will place concise delivery, returns and support cues beside Add to cart. |
| 23 | Recurring-purchase boilerplate needs visual testing | No subscription/deferred-purchase boilerplate is rendered by the frontend. |

## 4. Explicit navigation requested by the owner

The desktop and mobile navigation now contain exactly these primary links, in order:

1. Home
2. Rwandan Products
3. Catalog
4. About Us
5. Contact

The right side of the header shows **EUR / EN** by default. Opening it exposes the region selector (from backend markets), the DE/EN language switch and a market summary. The currency reflects the selected country rather than being hard-coded.

## 5. Out of frontend scope

These remain owner/backend actions and are not silently changed:

- legal review of withdrawal and food/allergen declarations;
- Shopify metafield definitions and values;
- product titles, handles, descriptions and photography;
- Shopify Search & Discovery facets;
- newsletter provider and reviews provider selection;
- webhook secret, DNS, theme, payments and deployment.
