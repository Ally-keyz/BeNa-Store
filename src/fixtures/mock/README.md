# MOCK FIXTURES — NOT LIVE SHOPIFY DATA

`data.ts` contains hand-authored records used only when the backend runs in fixture mode
(`SHOPIFY_MOCK_MODE=true`, or `auto` without Storefront credentials).

- Product names, prices and descriptions are shaped after the public BeNa Origins catalog and the
  October 2026 audit, but they are **not** fetched from Shopify.
- Image URLs point at `fixtures.invalid` intentionally — they are placeholders.
- Checkout URLs point at `fixtures.invalid/checkout/...` and cannot complete a purchase.
- Never copy these values into the live store.
- Fixture mode is always visible as `meta.dataSource = "fixture"` and in `meta.warnings`.

Fixtures are excluded from production behaviour when `SHOPIFY_MOCK_MODE=false` and real credentials
are configured.
