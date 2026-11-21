import { describe, expect, it } from 'vitest';
import type { Product, ProductVariant } from '@/types';
import { normalizeCatalogFacets } from '@/features/catalog/facets';
import {
  getAvailability,
  getDefaultVariant,
  getProductCategory,
  hasVariantChoice,
  matchesFacet,
  toFacetValue,
} from './product';

function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 'gid://shopify/ProductVariant/1',
    title: 'Default Title',
    sku: null,
    availableForSale: true,
    quantityAvailable: 1,
    price: { amount: '10.00', currencyCode: 'EUR' },
    compareAtPrice: null,
    unitPrice: null,
    unitPriceMeasurement: null,
    requiresShipping: true,
    selectedOptions: [],
    image: null,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'gid://shopify/Product/1',
    handle: 'test-product',
    title: 'Test product',
    description: '',
    descriptionHtml: '',
    vendor: '',
    productType: '',
    tags: [],
    availableForSale: true,
    createdAt: '',
    updatedAt: '',
    publishedAt: null,
    onlineStoreUrl: null,
    url: '',
    seo: { title: null, description: null },
    priceRange: {
      minVariantPrice: { amount: '10.00', currencyCode: 'EUR' },
      maxVariantPrice: { amount: '10.00', currencyCode: 'EUR' },
    },
    compareAtPriceRange: {
      minVariantPrice: { amount: '0.00', currencyCode: 'EUR' },
      maxVariantPrice: { amount: '0.00', currencyCode: 'EUR' },
    },
    featuredImage: null,
    images: [],
    options: [],
    variants: [variant()],
    metafields: {
      nutrition: null,
      ingredients: null,
      allergens: null,
      origin: null,
      preparation: null,
    },
    ...overrides,
  };
}

describe('product availability', () => {
  it('blocks add-to-cart for coming-soon products even when purchasable', () => {
    expect(getAvailability(product({ title: 'Coming Soon — test' }))).toBe('coming-soon');
    expect(getAvailability(product({ handle: 'coming-soon-1' }))).toBe('coming-soon');
    expect(getAvailability(product({ tags: ['coming soon'] }))).toBe('coming-soon');
  });

  it('uses Shopify availability when no coming-soon signal exists', () => {
    expect(getAvailability(product())).toBe('available');
    expect(getAvailability(product({ availableForSale: false }))).toBe('sold-out');
    expect(getAvailability(product({ variants: [variant({ availableForSale: false })] }))).toBe(
      'sold-out',
    );
  });

  it('selects the first purchasable variant and detects variant choice', () => {
    const variants = [
      variant({ id: 'a', availableForSale: false }),
      variant({ id: 'b', availableForSale: true }),
    ];
    expect(getDefaultVariant(product({ variants }))?.id).toBe('b');
    expect(hasVariantChoice(product({ variants }))).toBe(true);
    expect(hasVariantChoice(product({ variants: [variant()] }))).toBe(false);
  });

  it('categorises products from type and tags when a collection is missing', () => {
    expect(getProductCategory(product({ productType: 'Food', tags: ['coffee'] }))).toBe('coffee');
    expect(getProductCategory(product({ productType: 'Food', tags: ['pantry'] }))).toBe('food');
    expect(getProductCategory(product({ tags: ['igiseke', 'basket'] }))).toBe('crafts');
    expect(getProductCategory(product())).toBe('other');
  });
});

describe('catalog facets', () => {
  it('normalizes facet values consistently', () => {
    expect(toFacetValue('BeNa Origins')).toBe('bena-origins');
    expect(toFacetValue('Gluten-Free')).toBe('gluten-free');
    expect(toFacetValue('Rwanda!')).toBe('rwanda');
  });

  it('matches brand facets against the vendor', () => {
    const item = product({ vendor: 'BeNa Origins' });
    expect(matchesFacet(item, 'brands', 'bena-origins')).toBe(true);
    expect(matchesFacet(item, 'brands', 'other-brand')).toBe(false);
  });

  it('treats Bena Shop Taste of Africa as the same brand as Bena Store', () => {
    const item = product({ vendor: 'Bena Shop Taste of Africa' });
    expect(matchesFacet(item, 'brands', 'bena-store')).toBe(true);
  });

  it('merges duplicate brand facets into one option', () => {
    const facets = {
      categories: [],
      brands: [
        { value: 'bena-store', label: 'Bena Store', count: 52 },
        { value: 'bena-shop-taste-of-africa', label: 'Bena Shop Taste Of Africa', count: 2 },
      ],
      dietary: [],
      origins: [],
      scannedProducts: 54,
      truncated: false,
      checkedAt: '',
    };
    const normalized = normalizeCatalogFacets(facets);
    expect(normalized?.brands).toEqual([
      { value: 'bena-store', label: 'Bena Store', count: 54 },
    ]);
  });

  it('matches dietary and origin facets against catalog text only', () => {
    const item = product({ title: 'Rwandan Gluten-Free Coffee', tags: ['vegan'] });
    expect(matchesFacet(item, 'dietary', 'gluten-free')).toBe(true);
    expect(matchesFacet(item, 'dietary', 'vegan')).toBe(true);
    expect(matchesFacet(item, 'origins', 'rwanda')).toBe(true);
    expect(matchesFacet(item, 'dietary', 'halal')).toBe(false);
  });
});
