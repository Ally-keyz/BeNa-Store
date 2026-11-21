/**
 * Domain models returned by this API.
 *
 * These are the typed response models the React frontend consumes. They are a
 * 1:1 copy of the backend's `src/types/domain.ts`; Shopify remains the single
 * source of truth and nothing here is persisted by the frontend.
 */

export type DataSource = 'shopify' | 'fixture';

export interface Money {
  /** Decimal string, exactly as Shopify returns it (e.g. "12.90"). */
  amount: string;
  currencyCode: string;
}

export interface ProductImage {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface UnitPriceMeasurement {
  measuredType: string | null;
  quantityUnit: string;
  quantityValue: number;
  referenceUnit: string;
  referenceValue: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  /** Requires unauthenticated_read_product_inventory; null when not granted. */
  quantityAvailable: number | null;
  price: Money;
  compareAtPrice: Money | null;
  unitPrice: Money | null;
  unitPriceMeasurement: UnitPriceMeasurement | null;
  requiresShipping: boolean;
  selectedOptions: SelectedOption[];
  image: ProductImage | null;
}

export interface MetafieldValue {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

/** Logical food/compliance fields, resolved from exposed metafields. */
export interface ProductMetafields {
  nutrition: MetafieldValue | null;
  ingredients: MetafieldValue | null;
  allergens: MetafieldValue | null;
  origin: MetafieldValue | null;
  preparation: MetafieldValue | null;
}

/** A single AI-suggested field value. Never treated as verified fact. */
export interface AISuggestedField {
  value: string;
  /** 0-1 confidence from the model; low confidence means "unsure". */
  confidence: number;
  /** Short rationale explaining why the model suggested this. */
  rationale: string;
}

/** AI-generated ingredient/allergen suggestions for a product.
 *
 * Safety contract:
 * - These are suggestions only, never authoritative facts.
 * - `verified` is false until a human owner reviews and approves.
 * - Allergen suggestions carry extra caution: they must not be published
 *   without verification against the product packaging.
 * - Suggestions are generated on demand and are not persisted to Shopify.
 */
export interface AISuggestion {
  productId: string;
  handle: string;
  title: string;
  /** True only after an owner has reviewed and approved the suggestion. */
  verified: boolean;
  /** True when the suggestion still awaits owner review. */
  needsReview: boolean;
  /** When the suggestion was generated. */
  suggestedAt: string;
  /** Model used to generate the suggestion. */
  model: string;
  ingredients: AISuggestedField | null;
  allergens: AISuggestedField | null;
  nutrition: AISuggestedField | null;
  origin: AISuggestedField | null;
  preparation: AISuggestedField | null;
  /** Human-readable safety notice shown alongside the suggestion. */
  disclaimer: string;
}

export interface SeoFields {
  title: string | null;
  description: string | null;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  availableForSale: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  onlineStoreUrl: string | null;
  /** Absolute URL on the public storefront (for canonical/SEO/sitemap). */
  url: string;
  seo: SeoFields;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  compareAtPriceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  featuredImage: ProductImage | null;
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
  metafields: ProductMetafields;
}

export interface CollectionSummary {
  id: string;
  handle: string;
  title: string;
  description: string;
  updatedAt: string;
  url: string;
  image: ProductImage | null;
  seo: SeoFields;
}

export interface CollectionDetail extends CollectionSummary {
  products: Paginated<Product>;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface Paginated<T> {
  items: T[];
  pageInfo: PageInfo;
}

export interface PredictiveSearchResults {
  products: Array<{
    id: string;
    handle: string;
    title: string;
    url: string;
    featuredImage: ProductImage | null;
    priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  }>;
  collections: Array<{ id: string; handle: string; title: string; url: string }>;
  pages: Array<{ id: string; handle: string; title: string; url: string }>;
  queries: string[];
}

export interface CartLine {
  id: string;
  quantity: number;
  cost: {
    amountPerQuantity: Money;
    subtotalAmount: Money;
    totalAmount: Money;
  };
  merchandise: {
    id: string;
    title: string;
    sku: string | null;
    availableForSale: boolean;
    price: Money;
    image: ProductImage | null;
    product: {
      id: string;
      handle: string;
      title: string;
      description: string;
      descriptionHtml: string;
      url: string;
    };
    selectedOptions: SelectedOption[];
  } | null;
}

export interface CartDeliveryOption {
  handle: string;
  title: string | null;
  code: string | null;
  deliveryMethodType: string;
  estimatedCost: Money;
}

export interface CartDeliveryGroup {
  id: string;
  groupType: string;
  deliveryOptions: CartDeliveryOption[];
  selectedDeliveryOption: CartDeliveryOption | null;
}

export interface Cart {
  id: string;
  totalQuantity: number;
  checkoutUrl: string;
  /** Always Shopify-hosted. The backend never completes checkout. */
  checkout: { hostedBy: 'shopify'; url: string };
  createdAt: string;
  updatedAt: string;
  cost: {
    subtotalAmount: Money | null;
    totalAmount: Money | null;
    totalTaxAmount: Money | null;
    totalDutyAmount: Money | null;
  };
  lines: CartLine[];
  discountCodes: Array<{ code: string; applicable: boolean }>;
  buyerIdentity: {
    email: string | null;
    phone: string | null;
    countryCode: string | null;
    customer: { id: string; email: string | null } | null;
  };
  deliveryGroups: CartDeliveryGroup[];
  warnings: string[];
}

export interface CountryInfo {
  isoCode: string;
  name: string;
  currency: { isoCode: string; symbol: string };
}

export interface LocalizationInfo {
  requested: {
    country: string | null;
    language: string | null;
    marketHandle: string | null;
  };
  country: CountryInfo | null;
  language: { isoCode: string; name: string; endonymName?: string } | null;
  availableCountries: CountryInfo[];
  availableLanguages: Array<{ isoCode: string; name: string; endonymName?: string }>;
  markets: Array<{
    handle: string;
    countries: string[];
    currencies: string[];
    languages: string[];
  }>;
}

export interface ShopPolicy {
  id: string;
  title: string;
  handle: string;
  url: string | null;
  body: string;
}

export interface PolicyBundle {
  shopName: string;
  policies: PolicySet['policies'];
  gaps: string[];
}

export interface PolicySet {
  shopName: string;
  updatedAt: string;
  policies: {
    shipping: ShopPolicy | null;
    refund: ShopPolicy | null;
    privacy: ShopPolicy | null;
    termsOfService: ShopPolicy | null;
    subscription: ShopPolicy | null;
    legalNotice: ShopPolicy | null;
  };
  /** Identity signals extracted from policy bodies (audit #6). */
  identity: {
    emails: string[];
    businessNames: string[];
    inconsistentEmails: boolean;
    inconsistentBusinessNames: boolean;
    findings: string[];
  };
  gaps: string[];
}

export interface StorePage {
  id: string;
  handle: string;
  title: string;
  body: string;
  bodySummary: string;
  updatedAt: string;
  url: string | null;
}

export interface ShopInfo {
  name: string;
  description: string | null;
  primaryDomain: { url: string; host: string } | null;
  paymentSettings: {
    currencyCode: string;
    countryCode: string | null;
    acceptedCardBrands: string[];
  } | null;
  brand: { logo: ProductImage | null; slogan: string | null; shortDescription: string | null } | null;
}

export interface MoneyV2Input {
  amount: number;
  currencyCode: string;
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
  attributes?: Array<{ key: string; value: string }>;
}

export interface CartBuyerIdentityInput {
  email?: string;
  phone?: string;
  countryCode?: string;
  customerAccessToken?: string;
}

export interface CartCreateInput {
  lines?: CartLineInput[];
  buyerIdentity?: CartBuyerIdentityInput;
  discountCodes?: string[];
  note?: string;
  attributes?: Array<{ key: string; value: string }>;
  country?: string;
  language?: string;
}

/** Query context for @inContext(country, language). */
export interface MarketContext {
  country?: string;
  language?: string;
}

export interface ProductListQuery extends MarketContext {
  first?: number;
  after?: string;
  before?: string;
  query?: string;
  sortKey?: string;
  reverse?: boolean;
  /** Internal: include metafields (requires token). Used by the audit service. */
  includeMetafields?: boolean;
}

export interface CollectionListQuery extends MarketContext {
  first?: number;
  after?: string;
  query?: string;
  sortKey?: string;
  reverse?: boolean;
}

export interface CollectionProductsQuery extends MarketContext {
  first?: number;
  after?: string;
  sortKey?: string;
  reverse?: boolean;
}

export interface SearchQuery extends MarketContext {
  query: string;
  first?: number;
  after?: string;
  types?: Array<'product' | 'collection' | 'page' | 'article' | 'query'>;
  unavailableProducts?: 'LAST' | 'SHOW' | 'HIDE';
}

/** Commerce backend contract. Implemented by Shopify and fixture clients. */
export interface CommerceClient {
  readonly mode: DataSource;
  readonly capabilities: {
    metafields: boolean;
    productTags: boolean;
    inventoryQuantity: boolean;
  };

  getShop(): Promise<ShopInfo>;
  listProducts(query: ProductListQuery): Promise<Paginated<Product>>;
  getProductByHandle(handle: string, ctx?: MarketContext): Promise<Product | null>;
  listCollections(query: CollectionListQuery): Promise<Paginated<CollectionSummary>>;
  getCollectionByHandle(
    handle: string,
    query?: CollectionProductsQuery,
  ): Promise<CollectionDetail | null>;
  searchProducts(query: SearchQuery): Promise<Paginated<Product>>;
  predictiveSearch(query: SearchQuery): Promise<PredictiveSearchResults>;
  getLocalization(ctx?: MarketContext): Promise<LocalizationInfo>;
  getPolicies(): Promise<PolicyBundle>;
  getPages(query: string, first?: number): Promise<StorePage[]>;

  createCart(input: CartCreateInput): Promise<Cart>;
  getCart(cartId: string): Promise<Cart | null>;
  addCartLines(cartId: string, lines: CartLineInput[]): Promise<Cart>;
  updateCartLines(
    cartId: string,
    lines: Array<{ id: string; quantity: number; merchandiseId?: string }>,
  ): Promise<Cart>;
  removeCartLines(cartId: string, lineIds: string[]): Promise<Cart>;
  updateCartBuyerIdentity(cartId: string, identity: CartBuyerIdentityInput): Promise<Cart>;
  updateCartDiscountCodes(cartId: string, codes: string[]): Promise<Cart>;

  ping(): Promise<{ ok: boolean; latencyMs: number; detail?: string }>;
}

/** SEO / structured-data payloads. */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  openGraph: {
    title: string;
    description: string;
    url: string;
    type: string;
    image: string | null;
  };
  twitter: { card: string; title: string; description: string; image: string | null };
  jsonLd: unknown[];
}

export interface SitemapEntry {
  url: string;
  lastModified: string | null;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

export interface SitemapData {
  baseUrl: string;
  generatedAt: string;
  entries: SitemapEntry[];
  truncated: boolean;
  notes: string[];
}

export interface RobotsData {
  baseUrl: string;
  rules: Array<{ userAgent: string; allow: string[]; disallow: string[] }>;
  sitemaps: string[];
  host: string;
}

export interface NewsletterSubscriptionResult {
  email: string;
  status: 'subscribed' | 'pending_confirmation' | 'already_subscribed';
  provider: string;
  consent: {
    marketing: boolean;
    source: string;
    recordedAt: string;
  };
  /** True when the result is simulated (no provider credentials). */
  simulated: boolean;
  message: string;
}

export interface RestockSignupResult {
  email: string;
  productHandle: string;
  status: 'registered' | 'already_registered';
  provider: 'mock' | 'webhook' | 'resend';
  store: 'memory';
  simulated: boolean;
  registeredAt: string;
  message: string;
}

export interface ReviewProviderAssessment {
  detectedProvider: string;
  detection: 'config_override' | 'public_page_signature' | 'none_detected';
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  installedSignals: string[];
  status: 'VERIFIED' | 'UNVERIFIED — needs admin confirmation';
  integration: {
    recommendedApproach: string;
    requiredCredentials: string[];
    endpointsToAddLater: string[];
    notes: string[];
  };
  alternatives: Array<{ provider: string; requires: string; widgetsSupportStorefrontApi: string }>;
  checkedAt: string;
  dataSource: DataSource;
}

export interface WithdrawalSubmission {
  orderNumber: string;
  email: string;
  fullName: string;
  countryCode?: string;
  orderedOn?: string;
  itemDescription?: string;
  reason?: string;
  declaration: true;
  language?: string;
}

export interface WithdrawalResult {
  reference: string;
  status: 'received' | 'simulated';
  provider: string;
  receivedAt: string;
  message: string;
  simulated: boolean;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
  verifiedPurchase?: boolean;
}

export interface ProductReviewsResult {
  handle: string;
  status: 'available' | 'not_configured' | 'unavailable';
  source: string | null;
  reviews: ProductReview[];
  summary: { count: number; averageRating: number | null };
  simulated: boolean;
  message: string;
  checkedAt: string;
}

export interface ReviewSubmission {
  author: string;
  rating: number;
  body: string;
  language?: string;
}

export interface ReviewSubmissionResult {
  handle: string;
  reference: string;
  review: ProductReview;
  status: 'received' | 'simulated';
  provider: string;
  receivedAt: string;
  notification: {
    provider: string;
    delivered: boolean;
    simulated: boolean;
    message: string;
  };
  message: string;
  simulated: boolean;
}

export interface CatalogFacetValue {
  value: string;
  label: string;
  count: number;
}

export interface CatalogFacets {
  categories: CatalogFacetValue[];
  brands: CatalogFacetValue[];
  dietary: CatalogFacetValue[];
  origins: CatalogFacetValue[];
  scannedProducts: number;
  truncated: boolean;
  checkedAt: string;
}
