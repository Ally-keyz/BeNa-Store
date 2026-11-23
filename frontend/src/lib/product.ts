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

export type ProductCategory =
  | 'coffee'
  | 'drinks'
  | 'tea'
  | 'spices'
  | 'flours'
  | 'snacks'
  | 'spreads'
  | 'sesame'
  | 'perfumes'
  | 'beauty-hair'
  | 'crafts'
  | 'other';

export const ALL_CATEGORIES = 'all';

/** Shopper-facing filters, in display order. */
export const CATEGORY_FILTER_HANDLES = [
  'coffee',
  'drinks',
  'tea',
  'spices',
  'flours',
  'snacks',
  'spreads',
  'sesame',
  'perfumes',
  'beauty-hair',
  'crafts',
] as const satisfies readonly Exclude<ProductCategory, 'other'>[];

interface CategorySignal {
  category: Exclude<ProductCategory, 'other'>;
  pattern: RegExp;
}

/**
 * Strong signals from the fields Shopify merchants actually maintain. Order
 * matters: "Tea Masala" is a spice blend, and a biscuit that mentions coffee
 * breaks in its copy is still a snack.
 */
const TITLE_SIGNALS: CategorySignal[] = [
  {
    category: 'crafts',
    pattern:
      /\b(crafts?|handcraft|handmade|basket|igiseke|imigongo|bracelet|beaded|wall art|woven|textile|accessor(?:y|ies)|caps?|wrap)\b/i,
  },
  {
    category: 'perfumes',
    pattern: /\b(perfumes?|parfum|fragrance|body mist|eau de (?:parfum|toilette))\b/i,
  },
  {
    category: 'beauty-hair',
    pattern:
      /\b(hair|relaxer|soap|skin|jelly|lotion|shampoo|conditioner|cosmetics?|body care)\b|\bmovit\b/i,
  },
  {
    category: 'spreads',
    pattern: /\b(spreads?|blue ?band|margarine|honey|ubuki|jam|peanut butter)\b/i,
  },
  { category: 'sesame', pattern: /\b(sesame|simsim)\b/i },
  {
    category: 'snacks',
    pattern:
      /\b(biscuits?|biskuits?|cookies?|snacks?|mandazi|chips|crisps|nuts?|cakes?|pastry|pastries|compact)\b/i,
  },
  {
    category: 'flours',
    pattern: /\b(flours?|ifu|fufu|sosoma)\b/i,
  },
  {
    category: 'spices',
    pattern:
      /\b(spices?|masala|seasoning|pilau|royco|onga|akabanga|simba mbili|(?:chili|chilli|chill) oil)\b/i,
  },
  { category: 'tea', pattern: /\btea\b|thé/i },
  {
    category: 'drinks',
    pattern:
      /\b(juice|drink|beverage|soda|fanta|beer|malt|skol|primus|syrup|lemonade|water|carbonated)\b/i,
  },
  { category: 'coffee', pattern: /\b(coffee|kaffee|espresso|arabica)\b|kopi/i },
];

/**
 * Products that belong to no shopper-facing group even though incidental
 * words in their name or copy resemble a category. "Fish Masala" stays with
 * spices; plain fish, baking ingredients and prepared dishes do not match.
 */
const OTHER_PRODUCT_TERMS = /\b(fish|indagara|isombe|cassava leaves|baking powder|bicarbonate)\b/i;

/** Weaker description signals, used only when the title is uninformative. */
const DESCRIPTION_SIGNALS: CategorySignal[] = [
  {
    category: 'crafts',
    pattern: /\b(basket|igiseke|imigongo|bracelet|wall art|handcraft|handmade|woven)\b/i,
  },
  { category: 'perfumes', pattern: /\b(fragrance|perfume|parfum|body mist)\b/i },
  {
    category: 'beauty-hair',
    pattern: /\b(hair|skin|soap|relaxer|jelly|lotion|shampoo|conditioner|moisturiz)\b/i,
  },
  { category: 'spreads', pattern: /\b(margarine|blue ?band|honey|spread)\b/i },
  { category: 'sesame', pattern: /\bsesame\b/i },
  { category: 'snacks', pattern: /\b(food bars?|emergency food|ready to eat)\b/i },
  {
    category: 'flours',
    pattern:
      /\b(cassava flour|millet flour|wheat flour|maize flour|corn flour|composite flour|flour blend|traditional [a-z ]{0,20}flour)\b/i,
  },
  { category: 'drinks', pattern: /\b(juice|drink|beverage|soda|beer|malt|fanta|skol|primus)\b/i },
];

/**
 * Best-effort category for the storefront filters. Shopify collections are
 * incomplete, so product text is authoritative here: a drink such as Fanta
 * must appear under Drinks even when the live Drinks collection omits it.
 */
export function getProductCategory(product: Product): ProductCategory {
  const titleText = [product.productType, product.handle, product.title, product.tags.join(' ')]
    .join(' ')
    .toLowerCase();
  const descriptionText = [product.description, product.descriptionHtml]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (OTHER_PRODUCT_TERMS.test(titleText) && !/\bmasala\b/i.test(titleText)) return 'other';

  for (const { category, pattern } of TITLE_SIGNALS) {
    if (pattern.test(titleText)) return category;
  }

  for (const { category, pattern } of DESCRIPTION_SIGNALS) {
    if (pattern.test(descriptionText)) return category;
  }
  return 'other';
}

export function matchesProductCategory(product: Product, category: string): boolean {
  if (category === ALL_CATEGORIES) return true;
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

const ORIGIN_ALIASES: Array<{ canonical: string; terms: string[] }> = [
  { canonical: 'rwandan', terms: ['rwanda', 'rwandan'] },
  { canonical: 'african', terms: ['africa', 'african'] },
  { canonical: 'ugandan', terms: ['uganda', 'ugandan'] },
  { canonical: 'kenyan', terms: ['kenya', 'kenyan'] },
  { canonical: 'ethiopian', terms: ['ethiopia', 'ethiopian'] },
  { canonical: 'tanzanian', terms: ['tanzania', 'tanzanian'] },
];

const GLUTEN_FREE_TERMS = ['gluten-free', 'gluten-frei', 'glutenfree', 'glutenfrei'];

/** Map multilingual facet synonyms to one stable value used by the UI. */
export function canonicalFacetValue(group: FacetGroup, value: string): string {
  const normalized = toFacetValue(value);
  if (group === 'brands') return canonicalBrandValue(normalized);
  if (group === 'dietary' && GLUTEN_FREE_TERMS.includes(normalized)) return 'gluten-free';
  if (group === 'origins') {
    const alias = ORIGIN_ALIASES.find(({ terms }) =>
      terms.some((term) => normalized === term || normalized.startsWith(`${term}-`)),
    );
    return alias?.canonical ?? normalized;
  }
  return normalized;
}

function facetSearchTerms(group: FacetGroup, value: string): string[] {
  const canonical = canonicalFacetValue(group, value);
  if (group === 'dietary' && canonical === 'gluten-free') return GLUTEN_FREE_TERMS;
  if (group === 'origins') {
    return ORIGIN_ALIASES.find(({ canonical: origin }) => origin === canonical)?.terms ?? [canonical];
  }
  return [canonical];
}

/** Match a selected facet value against a product without inventing metadata. */
export function matchesFacet(product: Product, group: FacetGroup, value: string): boolean {
  const normalized = canonicalFacetValue(group, value);
  if (!normalized) return true;
  if (group === 'brands') return canonicalBrandValue(product.vendor) === normalized;
  const text = productFacetText(product).replace(/[^a-z0-9]+/g, ' ');
  return facetSearchTerms(group, value).some((term) =>
    text.includes(toFacetValue(term).replace(/-/g, ' ')),
  );
}
