/**
 * MOCK FIXTURES — hand-authored, NOT live Shopify data.
 *
 * These records exist so the whole API can be exercised without credentials.
 * Product names/prices reflect the shape of the public BeNa Origins catalog
 * (including the issues described in the October 2026 audit), but nothing here
 * is fetched from Shopify. Fixture mode is always reported as
 * `meta.dataSource = "fixture"`.
 */

import type {
  CollectionSummary,
  LocalizationInfo,
  MetafieldValue,
  Money,
  PolicyBundle,
  Product,
  ProductImage,
  ProductMetafields,
  ProductVariant,
  ShopInfo,
  StorePage,
} from '../../types/domain';

const CURRENCY = 'EUR';
const SITE = 'https://benaorigins.de';
const NOW = '2026-10-20T09:00:00.000Z';

export const money = (amount: number): Money => ({
  amount: amount.toFixed(2),
  currencyCode: CURRENCY,
});

export const image = (slug: string, altText: string | null = null): ProductImage => ({
  url: `https://fixtures.invalid/images/${slug}.jpg`,
  altText,
  width: 1200,
  height: 1200,
});

const metafield = (
  key: string,
  value: string,
  type = 'multi_line_text_field',
): MetafieldValue => ({ namespace: 'custom', key, type, value });

export const emptyMetafields = (): ProductMetafields => ({
  nutrition: null,
  ingredients: null,
  allergens: null,
  origin: null,
  preparation: null,
});

interface ProductSeed {
  slug: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  tags?: string[];
  productType?: string;
  vendor?: string;
  price: number;
  compareAtPrice?: number | null;
  availableForSale?: boolean;
  images?: ProductImage[];
  unitPrice?: { amount: number; referenceUnit: 'KG' | 'L' } | null;
  metafields?: Partial<ProductMetafields>;
}

function buildProduct(seed: ProductSeed): Product {
  const productId = `gid://shopify/Product/${seed.slug}`;
  const variantId = `gid://shopify/ProductVariant/${seed.slug}-default`;
  const images = seed.images ?? [image(seed.slug)];
  const compareAt =
    seed.compareAtPrice !== undefined && seed.compareAtPrice !== null
      ? money(seed.compareAtPrice)
      : null;

  const variant: ProductVariant = {
    id: variantId,
    title: 'Default Title',
    sku: `BENA-${seed.slug.toUpperCase()}`,
    availableForSale: seed.availableForSale ?? true,
    quantityAvailable: 25,
    price: money(seed.price),
    compareAtPrice: compareAt,
    unitPrice: seed.unitPrice ? money(seed.unitPrice.amount) : null,
    unitPriceMeasurement: seed.unitPrice
      ? {
          measuredType: 'WEIGHT',
          quantityUnit: seed.unitPrice.referenceUnit === 'L' ? 'ML' : 'G',
          quantityValue: 250,
          referenceUnit: seed.unitPrice.referenceUnit,
          referenceValue: 1,
        }
      : null,
    requiresShipping: true,
    selectedOptions: [{ name: 'Title', value: 'Default Title' }],
    image: images[0] ?? null,
  };

  return {
    id: productId,
    handle: seed.handle,
    title: seed.title,
    description: seed.descriptionHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    descriptionHtml: seed.descriptionHtml,
    vendor: seed.vendor ?? 'BeNa Origins',
    productType: seed.productType ?? '',
    tags: seed.tags ?? [],
    availableForSale: seed.availableForSale ?? true,
    createdAt: NOW,
    updatedAt: NOW,
    publishedAt: NOW,
    onlineStoreUrl: `${SITE}/products/${seed.handle}`,
    url: `${SITE}/products/${seed.handle}`,
    seo: { title: null, description: null },
    priceRange: { minVariantPrice: money(seed.price), maxVariantPrice: money(seed.price) },
    compareAtPriceRange: {
      minVariantPrice: compareAt ?? money(0),
      maxVariantPrice: compareAt ?? money(0),
    },
    featuredImage: images[0] ?? null,
    images,
    options: [{ id: `gid://shopify/ProductOption/${seed.slug}`, name: 'Title', values: ['Default Title'] }],
    variants: [variant],
    metafields: { ...emptyMetafields(), ...seed.metafields },
  };
}

export const fixtureProducts: Product[] = [
  buildProduct({
    slug: 'coming-soon',
    handle: 'coming-soon',
    title: 'Igiseke Basket',
    tags: ['igiseke', 'coming-soon', 'basket'],
    descriptionHtml:
      '<p><strong>Coming Soon</strong> — handwoven Igiseke basket in natural sisal. Add to cart available now.</p>',
    price: 30,
    images: [image('igiseke-natural')],
  }),
  buildProduct({
    slug: 'coming-soon-1',
    handle: 'coming-soon-1',
    title: 'Igiseke Basket',
    tags: ['igiseke', 'basket', 'black'],
    descriptionHtml:
      '<p>Handwoven Igiseke basket, black colorway. Sisal and sweetgrass, made in Rwanda.</p>',
    price: 35,
    images: [image('igiseke-black', 'Black Igiseke basket'), image('igiseke-black-2', 'Igiseke side view'), image('igiseke-black-3', 'Igiseke detail')],
  }),
  buildProduct({
    slug: 'akabanga-chill-oil',
    handle: 'akabanga-chill-oil',
    title: 'Akabanga Chill oil 100Ml',
    productType: 'Food',
    tags: ['food', 'oil', 'akabanga'],
    descriptionHtml:
      '<p>Akabanga chili oil, extra hot. Ingredients: chili, sunflower oil.</p><p>Allergens: none declared.</p>',
    price: 6.5,
    images: [image('akabanga-front', 'Akabanga bottle'), image('akabanga-back')],
  }),
  buildProduct({
    slug: 'agashya-syrup',
    handle: 'agashya-juice-syrup',
    title: 'Agashya Syrup 1Kg',
    productType: 'Food',
    tags: ['food', 'juice', 'agashya'],
    descriptionHtml:
      '<p>Agashya is a concentrate. Mix it with 1.5L and enjoy. Ingredients: passion fruit, sugar.</p>',
    price: 8.5,
    compareAtPrice: 10,
    images: [image('agashya-bottle', 'Agashya syrup bottle'), image('agashya-label')],
  }),
  buildProduct({
    slug: 'blueband-margarine',
    handle: 'blueband-margarine',
    title: 'Blueband Margarine 250g',
    productType: 'Food',
    tags: ['food', 'margarine'],
    descriptionHtml:
      '<p>Blueband margarine for baking and spreading.</p><p>Contains: milk, soy. Store cool and dry.</p>',
    price: 5.5,
    compareAtPrice: 0,
    images: [image('blueband-pack')],
  }),
  buildProduct({
    slug: 'akarabo-biscuits',
    handle: 'akarabo-biscuits',
    title: 'Akarabo Biscuits 200g',
    productType: 'Food',
    tags: ['food', 'biscuits'],
    descriptionHtml:
      '<p>Crunchy Rwandan biscuits. Ingredients: wheat flour, butter, eggs, sugar, vanilla.</p>',
    price: 4.2,
    images: [
      image('akarabo-pack', 'Akarabo biscuit pack'),
      image('akarabo-open', 'Biscuits on a plate'),
      image('akarabo-detail', 'Biscuit texture'),
    ],
    metafields: {
      ingredients: metafield('ingredients', 'wheat flour, butter, eggs, sugar, vanilla', 'list.single_line_text_field'),
    },
  }),
  buildProduct({
    slug: 'rwanda-coffee-250g',
    handle: 'rwanda-coffee-250g',
    title: 'Rwanda Coffee 250g',
    productType: 'Food',
    tags: ['food', 'coffee'],
    descriptionHtml:
      '<p>Single-origin Rwandan coffee, medium roast. <strong>Allergens:</strong> none.</p><p>Brew 12g per 200ml of water at 93°C.</p>',
    price: 15,
    compareAtPrice: 18,
    images: [
      image('coffee-bag', 'Rwanda coffee bag'),
      image('coffee-beans', 'Roasted coffee beans'),
      image('coffee-cup', 'Brewed coffee in a cup'),
      image('coffee-farm', 'Coffee farm in Rwanda'),
    ],
    unitPrice: { amount: 60, referenceUnit: 'KG' },
    metafields: {
      nutrition: metafield('nutrition', 'Energy 0 kJ / 0 kcal per 200 ml brewed coffee'),
      ingredients: metafield('ingredients', '100% Arabica coffee'),
      allergens: metafield('allergens', 'None'),
      origin: metafield('origin', 'Rwanda, Western Province'),
      preparation: metafield('preparation', 'Brew 12g coffee per 200ml water at 93°C.'),
    },
  }),
];

export const fixtureCollections: Array<CollectionSummary & { productIds: string[] }> = [
  {
    id: 'gid://shopify/Collection/coffee',
    handle: 'coffee',
    title: 'Coffee',
    description: 'Rwandan single-origin coffee.',
    updatedAt: NOW,
    url: `${SITE}/collections/coffee`,
    image: image('collection-coffee', 'Coffee collection'),
    seo: { title: null, description: null },
    productIds: ['gid://shopify/Product/rwanda-coffee-250g'],
  },
  {
    id: 'gid://shopify/Collection/food',
    handle: 'food',
    title: 'Food & Pantry',
    description: 'Rwandan pantry staples and snacks.',
    updatedAt: NOW,
    url: `${SITE}/collections/food`,
    image: image('collection-food', 'Food collection'),
    seo: { title: null, description: null },
    productIds: [
      'gid://shopify/Product/akabanga-chill-oil',
      'gid://shopify/Product/agashya-syrup',
      'gid://shopify/Product/blueband-margarine',
      'gid://shopify/Product/akarabo-biscuits',
    ],
  },
  {
    id: 'gid://shopify/Collection/crafts',
    handle: 'crafts',
    title: 'Crafts',
    description: 'Handwoven Igiseke baskets and home goods.',
    updatedAt: NOW,
    url: `${SITE}/collections/crafts`,
    image: image('collection-crafts', 'Crafts collection'),
    seo: { title: null, description: null },
    productIds: [
      'gid://shopify/Product/coming-soon',
      'gid://shopify/Product/coming-soon-1',
    ],
  },
];

export const fixtureShop: ShopInfo = {
  name: 'BeNa Origins',
  description: 'Rwandan coffee, food and crafts.',
  primaryDomain: { url: 'https://benaorigins.de', host: 'benaorigins.de' },
  paymentSettings: null,
  brand: {
    logo: image('bena-logo', 'BeNa Origins logo'),
    slogan: 'Taste of Rwanda',
    shortDescription: 'Rwandan products, delivered across Europe.',
  },
};

export const fixturePolicies: PolicyBundle = {
  shopName: 'BeNa Origins',
  gaps: ['legalNotice'],
  policies: {
    shipping: {
      id: 'gid://shopify/ShopPolicy/shipping',
      title: 'Shipping policy',
      handle: 'shipping-policy',
      url: `${SITE}/policies/shipping-policy`,
      body: `<h2>Shipping</h2><p>We deliver worldwide. Delivery within Germany costs €7.50. International shipping fees depend on weight and destination.</p><p>Orders are dispatched within 1–3 business days.</p>`,
    },
    refund: {
      id: 'gid://shopify/ShopPolicy/refund',
      title: 'Refund policy',
      handle: 'refund-policy',
      url: `${SITE}/policies/refund-policy`,
      body: `<h2>Returns</h2><p>Contact store@benaorigins.de to withdraw from your purchase by email or post.</p>`,
    },
    privacy: {
      id: 'gid://shopify/ShopPolicy/privacy',
      title: 'Privacy policy',
      handle: 'privacy-policy',
      url: `${SITE}/policies/privacy-policy`,
      body: `<h2>Privacy</h2><p>Data controller: BeNa Origins UG. Questions: Hello@benaorigins.de.</p>`,
    },
    termsOfService: {
      id: 'gid://shopify/ShopPolicy/terms',
      title: 'Terms of service',
      handle: 'terms-of-service',
      url: `${SITE}/policies/terms-of-service`,
      body: `<h2>Terms</h2><p>BeNa Shop e.K., Hauptstrasse 1, Germany. Contact shop@benashop.de.</p>`,
    },
    subscription: null,
    legalNotice: null,
  },
};

export const fixturePages: StorePage[] = [
  {
    id: 'gid://shopify/Page/impressum',
    handle: 'impressum',
    title: 'Impressum',
    body:
      '<h1>Impressum</h1><p>BeNa Shop e.K.<br/>Hauptstrasse 1<br/>Germany</p><p>E-Mail: shop@benashop.de</p><p>Inhaber: BeNa Handels GmbH</p>',
    bodySummary: 'Legal notice for BeNa Shop e.K.',
    updatedAt: NOW,
    url: `${SITE}/pages/impressum`,
  },
  {
    id: 'gid://shopify/Page/faq',
    handle: 'faq',
    title: 'FAQ',
    body: '<p>Questions about shipping, returns or products? Email store@benaorigins.de.</p>',
    bodySummary: 'Frequently asked questions',
    updatedAt: NOW,
    url: `${SITE}/pages/faq`,
  },
];

export const fixtureLocalization: LocalizationInfo = {
  requested: { country: 'DE', language: 'EN', marketHandle: null },
  country: {
    isoCode: 'DE',
    name: 'Germany',
    currency: { isoCode: 'EUR', symbol: '€' },
  },
  language: { isoCode: 'EN', name: 'English' },
  availableCountries: [
    ['DE', 'Germany'],
    ['AT', 'Austria'],
    ['FR', 'France'],
    ['NL', 'Netherlands'],
    ['BE', 'Belgium'],
    ['IT', 'Italy'],
    ['ES', 'Spain'],
    ['PT', 'Portugal'],
    ['IE', 'Ireland'],
    ['GB', 'United Kingdom'],
  ].map(([isoCode, name]) => ({
    isoCode: isoCode as string,
    name: name as string,
    currency: { isoCode: 'EUR', symbol: '€' },
  })),
  availableLanguages: [
    { isoCode: 'EN', name: 'English' },
    { isoCode: 'DE', name: 'German' },
  ],
  markets: [
    {
      handle: 'derived-eur',
      countries: ['DE', 'AT', 'FR', 'NL', 'BE', 'IT', 'ES', 'PT', 'IE'],
      currencies: ['EUR'],
      languages: ['EN', 'DE'],
    },
    {
      handle: 'derived-gbp',
      countries: ['GB'],
      currencies: ['GBP'],
      languages: ['EN'],
    },
  ],
};

export const fixtureCartConfig = {
  checkoutUrlBase: 'https://fixtures.invalid/checkout',
  domesticCountry: 'DE',
  deliveryOptions: [
    { handle: 'de-standard', title: 'Germany standard', code: 'DE_STANDARD', cost: 7.5 },
    { handle: 'eu-weight', title: 'Europe weight-based', code: 'EU_WEIGHT', cost: 19.9 },
  ],
};
