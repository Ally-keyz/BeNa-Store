# Catalog inventory review — owner snapshot (50 products)

Source: `scripts/data/catalog-inventory.json` (owner-provided screenshot, **no Shopify handles**).
Regenerate the machine-readable report with `npm run catalog:inventory`.

**Important:** this is a read-only review. Because the snapshot has titles but no handles, no
live title/handle mutations are generated. `scripts/data/catalog-fixes.json` is intentionally
empty for title and handle changes until exact handles are confirmed.

## Status breakdown

| Status | Products |
| --- | ---: |
| Active | 22 |
| Draft | 18 |
| Unlisted | 10 |
| **Total** | **50** |

Owner-reported context: average sell-through **1.17%**; ABC analysis has no data (all bands
EUR 0.00). That is consistent with a catalog that is mostly not actively selling.

## Most useful findings

### 1. Draft products with stock (14)

These are not visible to shoppers but hold inventory. Review whether they should be published:
Energy drink (48), Malti (48), Kinazi 2kg (5), Rwandan baseball Caps (10), Rwandan Flag Wrap (10),
Royco Beef 500g (24), Green Tea (40), Thé Vert/ Loose Green Tea (36), Gold Blend Tea(Amajyane) (36),
Riham Biscuits (168), Fanta Orange 33 Cl (10), Fanta Citron 33 Cl (72), Fanta Orange 1.5 L (24),
Fanta Citron 1.5 L (72).

### 2. Active products with no or negative stock (7)

Fufu de Manioc-1kg, SOSOMA Industries Ifu y'Uburo (Millet Flour) 1Kg, Sesame, UBURANGA Honey🍯,
Skol Malt 50cl, Gold Blend Tea Bag, and **Blueband /250g at -4**. The negative value is a
data-integrity issue to verify in Shopify; the others will show as unavailable.

### 3. Duplicate titles (3 groups)

- **Rwandan Original T-shirt 🇷🇼** appears three times (two at 0 stock, one at 20 stock; one uses
  `T-Shirt` capitalization).
- **Hand Craft Igiseke (Coming Soon)** appears twice (0 and 2 in stock).
- **Imigongo Wall Art (Coming Soon)** / **(Coming soon)** appears twice (0 and 5 in stock).

Only one product per group should remain active/published; the others should be merged, made
distinct with real variant information, or kept unlisted. Handles are required before any rename.

### 4. "Coming Soon" products (6)

Hand Craft Igiseke (×2), Primus 50cl, Imigongo Wall Art (×2), Petit Mutzing 33cl /pc.

These labels are **kept** in Shopify: removing "Coming Soon" from genuinely unavailable products
would be misleading. The storefront uses Shopify's live availability as the source of truth, so a
product with stock is shown as available and can be added to the cart even if its title, handle or
tags still carry the stale label. Unavailable products with the label are shown as "Coming soon"
and are excluded from the home hero.

### 5. Missing product categories (4)

Kopavitamin, Energy drink, Rwandan Flag Wrap, Imigongo Wall Art (Coming soon). Adding categories
would improve catalog faceting.

### 6. Safe title-normalization candidates (7)

| Current | Suggested |
| --- | --- |
| Gold Blend Tea(Amajyane) | Gold Blend Tea (Amajyane) |
| Fufu de Manioc-1kg | Fufu de Manioc - 1kg |
| Akanozo-Ifu y’uburo 1Kg | Akanozo - Ifu y’uburo 1Kg |
| Akanozo-Ifu Y’ Imvange 1kg | Akanozo - Ifu Y’ Imvange 1kg |
| UBURANGA Honey🍯 | UBURANGA Honey 🍯 |
| Rwandan Original T-shirt 🇷🇼 (×2) | Rwandan Original T-Shirt 🇷🇼 |

These are cosmetic only. They are **not** applied because the snapshot lacks handles.

## What can be done now

- Keep the storefront as-is; no live writes are required by this review.
- If you later want title/handle fixes applied, send the exact Shopify handle for each product
  you want changed (found in Shopify admin → Products → click product → URL after `/products/`).
- The compare-at cleanup in `npm run catalog:fixes` remains safe and dry-run by default; it does
  not change prices and only clears invalid compare-at values.
