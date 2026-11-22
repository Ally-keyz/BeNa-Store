import type { Product, ProductVariant } from '@/types';

export type AvailabilityStatus = 'available' | 'coming-soon' | 'sold-out';

/**
 * Total units currently in stock across variants, or `null` when Shopify did
 * not expose inventory quantities (the field needs the inventory scope).
 * A single unknown variant makes the total unknown so we never show a
 * misleading partial count.
 */
export function getStockQuantity(product: Product): number | null {
  if (product.variants.length === 0) return null;

  let total = 0;
  for (const variant of product.variants) {
    if (variant.quantityAvailable === null) return null;
    total += variant.quantityAvailable;
  }
  return Math.max(0, total);
}

function hasComingSoonSignal(product: Product): boolean {
  const signalText = `${product.handle} ${product.title} ${product.tags.join(' ')}`;
  return /coming[\s-]?soon/i.test(signalText);
}

/**
 * Stock quantity drives the label: products with units in the store are
 * always shown as available, even if their title/tags still say "coming soon".
 * "Coming soon" / "Sold out" are only shown when stock is known to be zero
 * (or when stock is unknown and Shopify also says the product cannot be sold).
 * Actual add-to-cart is still gated by Shopify's `availableForSale` flag.
 */
export function getAvailability(product: Product): AvailabilityStatus {
  const stock = getStockQuantity(product);

  if (stock === 0) return hasComingSoonSignal(product) ? 'coming-soon' : 'sold-out';
  if (stock !== null && stock > 0) return 'available';

  const anyAvailable =
    product.availableForSale && product.variants.some((variant) => variant.availableForSale);
  if (anyAvailable) return 'available';

  return hasComingSoonSignal(product) ? 'coming-soon' : 'sold-out';
}

/** Best image for cards/detail: featured image, else first image, else variant image. */
export function getPrimaryImage(product: Product) {
  return (
    product.featuredImage ??
    product.images[0] ??
    product.variants.find((variant) => variant.image)?.image ??
    null
  );
}

/** First purchasable variant, else the first variant. */
export function getDefaultVariant(product: Product): ProductVariant | null {
  if (product.variants.length === 0) return null;
  return product.variants.find((variant) => variant.availableForSale) ?? product.variants[0] ?? null;
}

/** True when the product has more than one meaningful variant option. */
export function hasVariantChoice(product: Product): boolean {
  return product.variants.length > 1;
}

export type ProductCategory = 'coffee' | 'food' | 'crafts' | 'other';

/**
 * Best-effort category for storefront filters. The storefront must keep
 * working even when a Shopify collection handle is missing, so category filters
 * can fall back to product type, tags and handle signals.
 */
export function getProductCategory(product: Product): ProductCategory {
  const haystack = [
    product.productType,
    product.handle,
    product.title,
    product.tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();

  if (/\bcoffee\b|\bkaffee\b/.test(haystack)) return 'coffee';
  if (/\bcrafts?\b|\bbasket\b|\bigiseke\b|\bwoven\b|\bhandmade\b|\bhomeware\b/.test(haystack)) {
    return 'crafts';
  }
  if (
    /\bfood\b|\bpantry\b|\bsnack\b|\bbiscuit\b|\bsauce\b|\boil\b|\bsyrup\b|\bmargarine\b|\bflour\b|\brice\b|\bbeans\b|\bspice\b|\bchocolate\b|\bdrink\b|\bjuice\b|\btea\b/.test(
      haystack,
    )
  ) {
    return 'food';
  }
  return 'other';
}

export function matchesProductCategory(product: Product, category: string): boolean {
  if (category === 'all') return true;
  return getProductCategory(product) === category;
}

/** Normalize a facet label/value the same way the backend facet service does. */
export function toFacetValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Shopify vendors that represent the same storefront brand. */
const BRAND_ALIASES: Record<string, string> = {
  'bena-shop-taste-of-africa': 'bena-store',
};

/** Normalize vendor aliases so catalog facets and product matching agree. */
export function canonicalBrandValue(value: string): string {
  const normalized = toFacetValue(value);
  return BRAND_ALIASES[normalized] ?? normalized;
}

/** Text searched by catalog-derived dietary/origin facets. */
export function productFacetText(product: Product): string {
  return [
    product.title,
    product.productType,
    product.vendor,
    product.tags.join(' '),
    product.description,
    product.metafields?.origin?.value,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export type FacetGroup = 'brands' | 'dietary' | 'origins';

/** Match a selected facet value against a product without inventing metadata. */
export function matchesFacet(product: Product, group: FacetGroup, value: string): boolean {
  const normalized = toFacetValue(value);
  if (!normalized) return true;
  if (group === 'brands') return canonicalBrandValue(product.vendor) === canonicalBrandValue(value);
  return productFacetText(product)
    .replace(/[^a-z0-9]+/g, ' ')
    .includes(normalized.replace(/-/g, ' '));
}
