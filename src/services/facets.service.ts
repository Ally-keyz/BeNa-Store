import type { AppConfig } from '../config/env';
import type { CatalogFacets, CommerceClient, MarketContext, Product } from '../types/domain';

type FacetBucket = Map<string, { value: string; label: string; count: number }>;

const DIETARY_TERMS = [
  'vegan',
  'vegetarian',
  'gluten-free',
  'glutenfrei',
  'organic',
  'bio',
  'fair-trade',
  'fairtrade',
  'halal',
  'dairy-free',
  'lactose-free',
];

const ORIGIN_TERMS = ['rwanda', 'rwandan', 'uganda', 'kenya', 'ethiopia', 'tanzania', 'africa', 'african'];

const CATEGORY_TERMS: Array<{ value: string; terms: string[] }> = [
  { value: 'coffee', terms: ['coffee', 'kaffee', 'espresso'] },
  { value: 'food', terms: ['food', 'cookies', 'biscuit', 'beverage', 'juice', 'syrup', 'margarine', 'oil', 'coffee'] },
  { value: 'crafts', terms: ['craft', 'basket', 'bag', 'textile', 'handmade'] },
];

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function add(bucket: FacetBucket, raw: string | null | undefined): void {
  const value = raw?.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!value || value.length > 60) return;
  const existing = bucket.get(value);
  if (existing) existing.count += 1;
  else bucket.set(value, { value, label: titleCase(value), count: 1 });
}

function productText(product: Product): string {
  return `${product.title} ${product.productType} ${product.vendor} ${product.tags.join(' ')} ${product.description}`.toLowerCase();
}

function deriveCategory(product: Product): string | null {
  const explicit = product.productType?.trim();
  if (explicit) return explicit;
  const text = productText(product);
  return CATEGORY_TERMS.find((entry) => entry.terms.some((term) => text.includes(term)))?.value ?? null;
}

function serialize(bucket: FacetBucket): CatalogFacets['categories'] {
  return [...bucket.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Read-only facet discovery from the current catalog (audit #20). */
export class FacetsService {
  private cache: { expiresAt: number; value: CatalogFacets } | null = null;

  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
  ) {}

  async get(context: MarketContext = {}, options: { refresh?: boolean } = {}): Promise<CatalogFacets> {
    if (!options.refresh && this.cache && this.cache.expiresAt > Date.now()) return this.cache.value;

    const categories: FacetBucket = new Map();
    const brands: FacetBucket = new Map();
    const dietary: FacetBucket = new Map();
    const origins: FacetBucket = new Map();

    let after: string | undefined;
    let scanned = 0;
    let hasNextPage = false;

    while (scanned < this.config.facets.scanLimit) {
      const first = Math.min(100, this.config.facets.scanLimit - scanned);
      const page = await this.client.listProducts({ first, after, ...context });
      for (const product of page.items) {
        add(categories, deriveCategory(product));
        add(brands, product.vendor);
        const text = productText(product);
        for (const term of DIETARY_TERMS) if (text.includes(term)) add(dietary, term);
        for (const term of ORIGIN_TERMS) if (text.includes(term)) add(origins, term);
        if (product.metafields?.origin?.value) add(origins, product.metafields.origin.value);
        scanned += 1;
      }
      after = page.pageInfo.endCursor ?? undefined;
      hasNextPage = page.pageInfo.hasNextPage;
      if (!hasNextPage || page.items.length === 0) break;
    }

    const value: CatalogFacets = {
      categories: serialize(categories),
      brands: serialize(brands),
      dietary: serialize(dietary),
      origins: serialize(origins),
      scannedProducts: scanned,
      truncated: hasNextPage,
      checkedAt: new Date().toISOString(),
    };

    if (this.config.facets.cacheTtlSeconds > 0) {
      this.cache = { expiresAt: Date.now() + this.config.facets.cacheTtlSeconds * 1000, value };
    }
    return value;
  }
}
