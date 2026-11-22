# BeNa Origins storefront design system

This document describes the implemented Phase 2 visual system. It is the code-facing source of truth for tokens and interaction patterns; copy lives in `src/i18n/{en,de}.ts`, brand/public URLs in `src/config/index.ts`, and audit intent in `docs/audit-frontend-requirements.md`.

## 1. Brand direction

Modern, minimalist premium. The interface uses a **vivid brand orange (`#ff7034`), white and near-black** with warm orange tints. CTAs use black text on the brand orange for strong contrast. The supplied logo keeps its own artwork but is treated as an image asset, never as a UI palette source.

- Primary CTA / brand: `#ff7034` (`brand`, `terra-500`)
- CTA hover: `#e85618` (`brand-dark`, `terra-600`)
- Paper: `#FFFFFF`
- Ink: `#0D0B0A`
- Warm supporting tints are derived from the brand orange, white and black.

## 2. Color tokens

Defined in `src/index.css` under `@theme`:

| Token | Value | Intended use |
| --- | --- | --- |
| `brand` / `terra-500` | `#ff7034` | Primary CTA, active states, focus accents |
| `brand-dark` / `terra-600` | `#e85618` | CTA hover, focus ring |
| `terra-50` | `#FFF7F2` | Soft section fills, placeholder art |
| `terra-100` | `#FFEADD` | Hairline dividers |
| `terra-200` | `#FFD2B8` | Outlines, input borders |
| `terra-300` | `#FFB188` | Muted decorative accents |
| `terra-400` | `#FF905C` | Decorative illustration only |
| `terra-700` | `#B84312` | Strong accent text, placeholder labels |
| `terra-800` | `#8A320D` | Secondary CTA text |
| `terra-900` | `#6D270A` | Deep accent text |
| `terra-950` | `#301206` | Reserved deep shade |
| `neutral-500` | `#7A6B62` | Muted metadata on white |
| `neutral-600` | `#685A52` | Body/supporting text on white |
| `ink` | `#0D0B0A` | Headings, primary body text, CTA text |
| `paper` | `#FFFFFF` | Page background |

`neutral-500` stays at `#7A6B62` to clear WCAG AA for normal text.

## 3. Verified contrast

Ratios were computed with the WCAG 2.x relative-luminance formula. All normal-text pairs below meet or exceed 4.5:1.

| Foreground | Background | Ratio |
| --- | --- | ---: |
| `#0D0B0A` (ink) | `#FFFFFF` | 19.64:1 |
| `#0D0B0A` (ink) | `#ff7034` (brand CTA) | 7.13:1 |
| `#0D0B0A` (ink) | `#e85618` (CTA hover) | 5.40:1 |
| `#6D270A` (terra-900) | `#FFFFFF` | 10.80:1 |
| `#8A320D` (terra-800) | `#FFFFFF` | 8.26:1 |
| `#B84312` (terra-700) | `#FFFFFF` | 5.46:1 |
| `#7A6B62` (neutral-500) | `#FFFFFF` | 5.11:1 |
| `#685A52` (neutral-600) | `#FFFFFF` | 6.62:1 |

Focus indicator: `2px solid #e85618` with `2px` offset.

## 4. Typography and font loading

Both fonts are self-hosted; there is no Google Fonts or other external request.

- Body: **DM Sans Variable**, `public/fonts/dm-sans-latin.woff2`, weights `100–1000`.
- Display: **Plus Jakarta Sans Variable**, `public/fonts/plus-jakarta-sans-latin.woff2`, weights `200–800`.
- `@font-face` declarations live at the top of `src/index.css`; preload links live in `index.html`.
- Fallback stack: `ui-sans-serif, system-ui, sans-serif`; `font-display: swap`.

Scale:

- H1: `clamp(28px, 3.2vw, 44px)`, tight tracking, 1.08 line height in the hero.
- Card title and price: `15px`.
- Unit price and fine metadata: `12–13px`.
- Utility labels: `11px`, medium weight, `0.18–0.2em` tracking, uppercase.

## 5. Logo treatment

- Source files: `src/assets/logo_new.png` (imported by the header and `BrandLogo`) and the identical `public/logo_new.png` (referenced directly by the About page).
- The current logo is a square 500×500 image; `object-contain` shows all of it without cropping.
- Placed on white in the header in a `44px` tile beside the typographic `BeNa Origins` wordmark; `BrandLogo` uses `36px` on mobile and `40px` from the `sm` breakpoint upward.
- Never recolor, crop, stretch, rotate, place on a dark background, or derive UI colors from the artwork.
- The artwork's own wording and the trading name (`BeNa Origins`) stay separate in `src/config/index.ts` until the owner confirms one brand name.

## 6. Layout and scale

Shared classes live in `src/lib/layout.ts`:

- Page container: `max-width: 1280px`, `16px` side padding on mobile, `24px` at `sm`, `32px` at `lg`.
- Section rhythm: `48px` on mobile, `64px` at `sm`, `72px` at `lg`.

Header:

- `56px` mobile / `64px` desktop including the bottom border.
- Required desktop links, in order: **Home · Rwandan Products · Catalog · About Us · Contact**.
- Right side: search, cart, and a compact **EUR / EN** region-and-language selector.
- The selector opens a dialog with backend-backed country choices, DE/EN language buttons and a market summary. It does not call Shopify directly.
- The store is positioned as a broad **Rwandan products** shop (coffee, food and crafts), not a coffee-only store.

Hero:

- Contained inside the shared `contentContainer` (`max-w-5xl`), which every home section uses so all edges line up.
- `400px` on mobile; `clamp(380px, 40vw, 460px)` on larger screens.
- Radius `24px`; dark ink surface with real product photography when the catalog supplies it.
- Slides are built from the newest products (or a category-specific set on `/rwandan-products`), with live price and product link; editorial slides are a fallback only.
- Side arrows, elongated active progress bar, pause control, autoplay `7000ms`.
- Autoplay pauses on hover, touch, focus and `prefers-reduced-motion`.

Product grid:

- `4` columns at `lg`, `3` at `md`, `2` on small screens.
- `20–24px` gutters.
- Each card is a **square `1:1` tile** with a square image, rounded `16px`, no border and no shadow.
- Featured and catalog feeds grow automatically with an IntersectionObserver sentinel — no "Load more" click.
- Title left, price right; compare-at struck through only when strictly greater than the current price. No per-kg or per-unit price labels are rendered.
- Coming Soon never renders Add to cart.

Product detail:

- Thumbnails sit to the left of a viewport-fitted central image; clicking it opens a full-screen lightbox with arrow controls.
- All product information (description, allergens, details, food information, preparation) stays in the right-hand column; only related products appear below.

## 7. Radii, surfaces and motion

- Card radius: `16px`.
- Hero/section panel radius: `24px`.
- Pills: `9999px`.
- Motion: fade `180ms`, dialog `220ms`, drawer `240ms`, eased with `cubic-bezier(0.22, 1, 0.36, 1)`.
- `prefers-reduced-motion: reduce` collapses all animations and transitions and disables carousel autoplay.

## 8. Audit alignment

The October 2026 audit asked for a clearer value proposition, a coherent category hierarchy, visible localization, allergen/food information, honest shipping claims and trust cues near purchase decisions. The frontend responds by:

- leading the hero with broad Rwandan products rather than generic coffee copy;
- using the required five-item navigation and a real region/language selector;
- keeping compare-at safeguards in `src/lib/money.ts`;
- reserving product-detail space for allergens, nutrition, ingredients, origin and preparation;
- using one brand/email config constant;
- labelling all missing photography and legal content as placeholders.

## 9. Content placeholders

Missing photography uses `PlaceholderImage`, explicitly labelled for assistive technology. Missing legal/product content uses marked stubs and is never presented as final. No tracker or non-essential script is loaded; cookie preferences gate any future analytics/marketing script.

German copy is flagged `REVIEW(de)` in `src/i18n/de.ts` and needs a native-speaker pass before launch.
