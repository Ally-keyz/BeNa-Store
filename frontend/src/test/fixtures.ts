import type { Money, Product, ProductMetafields } from '@/types';

export function money(amount: string, currencyCode = 'EUR'): Money {
  return { amount, currencyCode };
}

export function metafield(value: string, type = 'single_line_text_field') {
  return { namespace: 'custom', key: 'fixture', type, value };
}

export function emptyMetafields(): ProductMetafields {
  return {
    nutrition: null,
    ingredients: null,
    allergens: null,
    origin: null,
    preparation: null,
  };
}

export function productFixture(overrides: Partial<Product> = {}): Product {
  return {
    id: 'gid://shopify/Product/1',
    handle: 'rwanda-honey',
    title: 'Rwanda Honey',
    description: 'Golden honey from Rwandan beekeepers.',
    descriptionHtml: '<p>Golden honey from Rwandan beekeepers.</p>',
    vendor: 'BeNa Origins',
    productType: 'Food',
    tags: [],
    availableForSale: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
    onlineStoreUrl: null,
    url: 'https://benaorigins.de/products/rwanda-honey',
    seo: { title: null, description: null },
    priceRange: { minVariantPrice: money('18.90'), maxVariantPrice: money('18.90') },
    compareAtPriceRange: { minVariantPrice: money('18.90'), maxVariantPrice: money('18.90') },
    featuredImage: null,
    images: [],
    options: [],
    variants: [
      {
        id: 'gid://shopify/ProductVariant/1',
        title: 'Default Title',
        sku: 'RW-HONEY-250',
        availableForSale: true,
        quantityAvailable: 20,
        price: money('18.90'),
        compareAtPrice: null,
        unitPrice: null,
        unitPriceMeasurement: null,
        requiresShipping: true,
        selectedOptions: [],
        image: null,
      },
    ],
    metafields: emptyMetafields(),
    ...overrides,
  };
}
