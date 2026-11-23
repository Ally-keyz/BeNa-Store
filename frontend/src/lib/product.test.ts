import { describe, expect, it } from 'vitest';
import type { Product, ProductVariant } from '@/types';
import { normalizeCatalogFacets } from '@/features/catalog/facets';
import {
  CATEGORY_FILTER_HANDLES,
  getAvailability,
  getDefaultVariant,
  getProductCategory,
  getStockQuantity,
  hasVariantChoice,
  matchesFacet,
  matchesProductCategory,
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
  it('sums known stock across variants and reports unknown stock as null', () => {
    expect(getStockQuantity(product())).toBe(1);
    expect(
      getStockQuantity(
        product({
          variants: [
            variant({ id: 'a', quantityAvailable: 2 }),
            variant({ id: 'b', quantityAvailable: 5 }),
          ],
        }),
      ),
    ).toBe(7);
    expect(getStockQuantity(product({ variants: [] }))).toBeNull();
    expect(
      getStockQuantity(product({ variants: [variant({ quantityAvailable: null })] })),
    ).toBeNull();
  });

  it('shows products with stock as available even when a stale label says coming soon', () => {
    expect(getAvailability(product({ title: 'Coming Soon — test' }))).toBe('available');
    expect(getAvailability(product({ handle: 'coming-soon-1' }))).toBe('available');
    expect(getAvailability(product({ tags: ['coming soon'] }))).toBe('available');
    expect(
      getAvailability(
        product({
          title: 'Coming Soon — test',
          variants: [variant({ quantityAvailable: 2, availableForSale: false })],
        }),
      ),
    ).toBe('available');
  });

  it('shows zero-stock products as coming soon or sold out', () => {
    expect(
      getAvailability(
        product({ title: 'Coming Soon — test', variants: [variant({ quantityAvailable: 0 })] }),
      ),
    ).toBe('coming-soon');
    expect(
      getAvailability(product({ variants: [variant({ quantityAvailable: 0 })] })),
    ).toBe('sold-out');
    // Zero stock wins even when Shopify reports the product as purchasable.
    expect(
      getAvailability(
        product({
          availableForSale: true,
          variants: [variant({ quantityAvailable: 0, availableForSale: true })],
        }),
      ),
    ).toBe('sold-out');
  });

  it('falls back to Shopify availability when stock quantity is unknown', () => {
    const unknownStock = [variant({ quantityAvailable: null })];
    expect(getAvailability(product({ variants: unknownStock }))).toBe('available');
    expect(getAvailability(product({ variants: unknownStock, availableForSale: false }))).toBe(
      'sold-out',
    );
    expect(
      getAvailability(
        product({
          title: 'Coming Soon — test',
          variants: unknownStock,
          availableForSale: false,
        }),
      ),
    ).toBe('coming-soon');
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

  it('exposes every shopper-facing filter handle', () => {
    expect(CATEGORY_FILTER_HANDLES).toEqual([
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
    ]);
  });

  it('categorises products from type, title, tags and copy', () => {
    expect(getProductCategory(product({ productType: 'Food', tags: ['coffee'] }))).toBe('coffee');
    expect(getProductCategory(product({ title: 'Premium Rwandan Arabica Coffee' }))).toBe('coffee');
    expect(getProductCategory(product({ title: 'Kinazi Cassava Flour' }))).toBe('flours');
    expect(
      getProductCategory(product({ title: 'Sosoma 2', description: 'Sosoma Flour for porridge' })),
    ).toBe('flours');
    expect(getProductCategory(product({ tags: ['igiseke', 'basket'] }))).toBe('crafts');
    expect(getProductCategory(product())).toBe('other');
  });

  it('classifies every beverage as a drink, regardless of Shopify collection membership', () => {
    for (const title of [
      'Fanta Orange 33 Cl',
      'Skol Malt 50cl',
      'Primus 50cl',
      'Energy drink',
      'Malti Juice',
      'Agashya Juice',
    ]) {
      expect(getProductCategory(product({ title }))).toBe('drinks');
    }
    expect(getProductCategory(product({ title: 'Green Tea' }))).toBe('tea');
    expect(getProductCategory(product({ title: 'Thé Vert / Loose Green Tea' }))).toBe('tea');
    expect(getProductCategory(product({ title: 'Strong Blend Black Tea' }))).toBe('tea');
    // Masala wins over the tea mention because it is a spice blend.
    expect(getProductCategory(product({ title: 'Tea Masala' }))).toBe('spices');
  });

  it('classifies the other grouped product categories', () => {
    expect(getProductCategory(product({ title: 'Blueband /250g' }))).toBe('spreads');
    expect(getProductCategory(product({ title: 'BeNa R&D Honey' }))).toBe('spreads');
    expect(getProductCategory(product({ title: 'Riham Biscuits' }))).toBe('snacks');
    expect(getProductCategory(product({ title: 'Akarabo Biskuit' }))).toBe('snacks');
    expect(getProductCategory(product({ title: 'Sesame' }))).toBe('sesame');
    expect(getProductCategory(product({ title: 'Sweet Love Fragrance Mist' }))).toBe('perfumes');
    expect(getProductCategory(product({ title: 'Miadi Hair Relaxer' }))).toBe('beauty-hair');
    expect(getProductCategory(product({ title: 'Pyaar Soap' }))).toBe('beauty-hair');
    expect(
      getProductCategory(product({ title: 'Movit', description: 'Skin Jelly and Hair care' })),
    ).toBe('beauty-hair');
    expect(getProductCategory(product({ title: 'Rwandan baseball Caps' }))).toBe('crafts');
    expect(getProductCategory(product({ title: 'Rwandan Flag Wrap' }))).toBe('crafts');
    expect(getProductCategory(product({ title: 'Imigongo Wall Art' }))).toBe('crafts');
    expect(getProductCategory(product({ title: 'Simba Mbili' }))).toBe('spices');
    // Incidental category words do not pull unrelated products into a filter.
    expect(getProductCategory(product({ title: 'Ground Dried Small Fish' }))).toBe('other');
    expect(getProductCategory(product({ title: 'Bicarbonate' }))).toBe('other');
    expect(getProductCategory(product({ title: 'Isombe Ku Munota' }))).toBe('other');
    // Snack copy mentioning tea time or coffee breaks stays with snacks.
    expect(
      getProductCategory(
        product({ title: 'Riham Biscuits', description: 'Perfect for tea time and coffee breaks' }),
      ),
    ).toBe('snacks');
  });

  it('only matches products from the selected category', () => {
    const drink = product({ title: 'Malti Juice' });
    const spice = product({ title: 'Pilau Masala' });
    expect(matchesProductCategory(drink, 'all')).toBe(true);
    expect(matchesProductCategory(drink, 'drinks')).toBe(true);
    expect(matchesProductCategory(drink, 'tea')).toBe(false);
    expect(matchesProductCategory(drink, 'spices')).toBe(false);
    expect(matchesProductCategory(spice, 'spices')).toBe(true);
    expect(matchesProductCategory(product({ title: 'Blueband' }), 'spreads')).toBe(true);
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

  it('merges translated origin and gluten-free facets into one option each', () => {
    const facets = {
      categories: [],
      brands: [],
      dietary: [
        { value: 'gluten-free', label: 'Gluten-Free', count: 2 },
        { value: 'glutenfrei', label: 'Glutenfrei', count: 3 },
      ],
      origins: [
        { value: 'rwanda', label: 'Rwanda', count: 4 },
        { value: 'rwandan', label: 'Rwandan', count: 5 },
        { value: 'africa', label: 'Africa', count: 2 },
        { value: 'african', label: 'African', count: 6 },
      ],
      scannedProducts: 20,
      truncated: false,
      checkedAt: '',
    };
    const normalized = normalizeCatalogFacets(facets);
    expect(normalized?.dietary).toEqual([
      { value: 'gluten-free', label: 'Gluten free', count: 5 },
    ]);
    expect(normalized?.origins).toEqual([
      { value: 'rwandan', label: 'Rwandan', count: 9 },
      { value: 'african', label: 'African', count: 8 },
    ]);
  });

  it('matches dietary and origin facets against catalog text only', () => {
    const item = product({ title: 'Rwandan Gluten-Free Coffee', tags: ['vegan'] });
    expect(matchesFacet(item, 'dietary', 'gluten-free')).toBe(true);
    expect(matchesFacet(item, 'dietary', 'vegan')).toBe(true);
    expect(matchesFacet(item, 'origins', 'rwanda')).toBe(true);
    expect(matchesFacet(item, 'origins', 'rwandan')).toBe(true);
    const germanLabels = product({ title: 'Rwanda coffee', tags: ['glutenfrei'] });
    expect(matchesFacet(germanLabels, 'dietary', 'gluten-free')).toBe(true);
    expect(matchesFacet(germanLabels, 'dietary', 'glutenfrei')).toBe(true);
    expect(matchesFacet(item, 'dietary', 'halal')).toBe(false);
  });
});
