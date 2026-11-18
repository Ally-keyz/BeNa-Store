# Audit mapping — October 2026 storefront review → backend checks

This table maps the 23 findings in *BeNa Origins Storefront Audit, Oct 2026* to what this backend
detects. **Nothing is fixed automatically.** All audit endpoints are read-only and legal items are
risk flags, not legal conclusions.

Legend: **API** = `GET /api/v1/audit/products` / `/audit/products/:handle`; **SHIP** =
`GET /api/v1/shipping`; **POL** = `GET /api/v1/policies`; **REV** = `GET /api/v1/reviews/assessment`.

| # | Finding | Backend coverage | Where | Notes / limits |
| --- | --- | --- | --- | --- |
| 1 | Withdrawal function not evident [VERIFY] | Risk flag when the refund policy mentions withdrawal but no electronic/online withdrawal function. | POL | Heuristic text check only; German EVZ compliance requires human/legal review. |
| 2 | Unit prices need checking | `MISSING_UNIT_PRICE`, `MISSING_UNIT_PRICE_VARIANTS`, `UNIT_PRICE_MEASUREMENT_MISSING` on food items (`unitPrice` / `unitPriceMeasurement`). | API | Unit price may be empty if not configured per market; flagged per variant. |
| 3 | Food information may be incomplete | `MISSING_FOOD_INFORMATION` (nutrition, ingredients, origin missing from exposed metafields **and** description). Without token: `FOOD_INFORMATION_UNVERIFIED` (info, not penalised). | API | Metafield definitions must be exposed to the Storefront API; namespaces/keys configurable. |
| 4 | Allergens not visibly emphasized | `ALLERGENS_NOT_EMPHASIZED` when EU allergen keywords appear but none is bold/highlighted or under an allergen heading; `ALLERGENS_MISSING`; `ALLERGEN_STATEMENT_NOT_VERIFIABLE`. | API | HTML emphasis heuristic; packaging/legal declaration is the authority. |
| 5 | Sale-price references need a 30-day check | `SALE_PRICE_VERIFICATION_REQUIRED` whenever compare-at > price. | API | Deliberately **not** an error: the Storefront API cannot prove price history. Needs manual evidence. |
| 6 | Business identity and emails differ | Extracts emails/business-name candidates from all policies + legal notice; flags `inconsistentEmails` / `inconsistentBusinessNames` with evidence. | POL | Extraction is heuristic; legal notice is looked up as a page (`impressum`, `legal-notice`, `imprint`, …). |
| 7 | Worldwide delivery claim conflicts with selector | `WORLDWIDE_CLAIM_MISMATCH`, `ADVERTISED_COUNTRY_UNAVAILABLE`, plus advertised vs Shopify-available country sets. | SHIP | Compares policy text/`SHIPPING_WORLDWIDE_CLAIM` with `localization.availableCountries`; derived markets only. |
| 8 | International shipping fees hard to estimate | `MISSING_RATE_GUIDANCE`, `rateExamples`, `hasUsableRateTable`, optional cart delivery estimates. | SHIP | No standalone rate table exists in the Storefront API; rates require a cart with buyer identity. |
| 9 | “Coming Soon” items show Add to cart | `COMING_SOON_CONTRADICTION` (title/tags/description vs `availableForSale`). | API | High severity. |
| 10 | Duplicate Igiseke titles | Normalized-title grouping across the scanned catalog; `DUPLICATE_TITLE_GROUP` + per-product `DUPLICATE_TITLE`. | API | Full-catalog report only; truncated scans warn. |
| 11 | Generic product handles | `GENERIC_HANDLE` for `coming-soon`, `coming-soon-1`, `product-*`, `item-*`, `test-*`, `untitled*`. | API | Suggests descriptive handles + Shopify URL redirects. |
| 12 | Agashya mixing instructions incomplete | `PREPARATION_AMBIGUOUS` when “mix with <amount>” names no liquid; `PREPARATION_MISSING` for concentrate/syrup/powder products lacking action+quantity. | API | Heuristic; preparation metafield short-circuits the check. |
| 13 | Coffee storytelling uses old launch messaging | `STALE_LAUNCH_COPY` when a purchasable product still says “soon”. | API | Text heuristic; story pages/blogs not scanned. |
| 14 | Product naming and copy inconsistent | `INCONSISTENT_UNITS` for `100Ml`, `1Kg`, mixed `kg/Kg`, `100ML`, etc. | API | Flags casing/format, not prose quality. |
| 15 | €0.00 comparison value | `COMPARE_AT_INVALID` when compare-at is 0.00 or ≤ price. | API | Per-variant evidence. |
| 16 | Homepage hero copy too generic | Not covered by backend. | — | Content/copy decision for the frontend. |
| 17 | Store positioning not prioritized | Not covered by backend. | — | Merchandising/content strategy. |
| 18 | About Us lacks trust evidence | Not covered; only page metadata is exposed. | — | Editorial/content task; human review. |
| 19 | Social proof not prominent | Reviews assessment detects provider signatures and documents integration; Product JSON-LD deliberately omits `aggregateRating`. | REV + `/seo/product/:handle` | Detection proves only that a signature exists, not that reviews are active/genuine. |
| 20 | Limited filter dimensions | Not implemented as facets. | — | Requires Shopify Search & Discovery configuration and a future filtered-products endpoint (`ProductFilter`). Recorded as a gap. |
| 21 | German localization opportunity | Country/language/currency data + `@inContext` on every query. | `/api/v1/localization` | Actual DE/EN translations and market setup happen in Shopify Admin. |
| 22 | Trust cues distant from purchase decisions | Not covered by backend. | — | Frontend placement decision (delivery/returns/support near Add to cart). |
| 23 | Recurring-purchase boilerplate needs visual testing | Not API-detectable. | — | Requires browser/theme inspection; no theme changes were made. |

## Rules that go beyond the 23 findings

| Check | Why |
| --- | --- |
| `FEW_IMAGES` / `NO_IMAGES` / `MISSING_ALT_TEXT` | Catalog standard, accessibility and SEO; also flagged by audit’s SEO gaps. |
| `STALE_LAUNCH_COPY` | Derived from finding #13 but applied to product copy. |
| `FOOD_INFORMATION_UNVERIFIED` | Honest handling when no token/metafield exposure exists. |

## What the completeness score means

Weighted penalties: critical 30, high 15, medium 7, low 2, info 0. Score = `max(0, 100 − penalties)`;
grades A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40, F < 40. The score is a prioritisation aid, not a compliance
certificate.

## Reproduce

```bash
npm run audit:report -- --limit=500
# writes reports/audit-YYYY-MM-DD.json and .md
```

or

```bash
curl http://localhost:4000/api/v1/audit/products?limit=250 \
  -H "x-admin-key: $ADMIN_KEY"
```
