import type { Product, ProductVariant } from '@/types';

export type AvailabilityStatus = 'available' | 'coming-soon' | 'sold-out';

/**
 * Audit #9 fix: a product whose copy/tags/handle say "coming soon" must never
 * render an active add-to-cart, even if Shopify says it is purchasable.
 */
export function getAvailability(product: Product): AvailabilityStatus {
  const signalText = `${product.handle} ${product.title} ${product.tags.join(' ')}`;
  if (/coming[\s-]?soon/i.test(signalText)) return 'coming-soon';
  const anyAvailable =
    product.availableForSale && product.variants.some((variant) => variant.availableForSale);
  return anyAvailable ? 'available' : 'sold-out';
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
