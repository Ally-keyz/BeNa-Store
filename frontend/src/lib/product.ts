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
