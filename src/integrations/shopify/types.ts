/** Raw Storefront API (2026-10) response shapes — only fields we request. */

export interface RawMoney {
  amount: string;
  currencyCode: string;
}

export interface RawMoneyRange {
  minVariantPrice: RawMoney;
  maxVariantPrice: RawMoney;
}

export interface RawImage {
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

export interface RawMetafield {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

export interface RawUnitPriceMeasurement {
  measuredType: string | null;
  quantityUnit: string;
  quantityValue: number;
  referenceUnit: string;
  referenceValue: number;
}

export interface RawVariant {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  price: RawMoney;
  compareAtPrice: RawMoney | null;
  unitPrice: RawMoney | null;
  unitPriceMeasurement: RawUnitPriceMeasurement | null;
  requiresShipping: boolean;
  selectedOptions: Array<{ name: string; value: string }>;
  image: RawImage | null;
}

export interface RawProduct {
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
  seo: { title: string | null; description: string | null };
  priceRange: RawMoneyRange;
  compareAtPriceRange: RawMoneyRange;
  featuredImage: RawImage | null;
  images: { edges: Array<{ node: RawImage }> };
  options: Array<{ id: string; name: string; values: string[] }>;
  variants: { edges: Array<{ node: RawVariant }> };
  metafields?: Array<RawMetafield | null>;
}

export interface RawPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface RawProductConnection {
  pageInfo: RawPageInfo;
  edges: Array<{ cursor: string; node: RawProduct }>;
}

export interface RawCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  updatedAt: string;
  image: RawImage | null;
  seo: { title: string | null; description: string | null };
  products?: RawProductConnection;
}

export interface RawCollectionConnection {
  pageInfo: RawPageInfo;
  edges: Array<{ node: RawCollection }>;
}
export interface RawCartLine {
  id: string;
  quantity: number;
  cost: {
    amountPerQuantity: RawMoney;
    subtotalAmount: RawMoney;
    totalAmount: RawMoney;
  };
  merchandise: {
    id: string;
    title: string;
    sku: string | null;
    availableForSale: boolean;
    price: RawMoney;
    image: RawImage | null;
    selectedOptions: Array<{ name: string; value: string }>;
    product: {
      id: string;
      handle: string;
      title: string;
      onlineStoreUrl?: string | null;
    };
  } | null;
}

export interface RawCart {
  id: string;
  totalQuantity: number;
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
  cost: {
    subtotalAmount: RawMoney | null;
    totalAmount: RawMoney | null;
    totalTaxAmount: RawMoney | null;
    totalDutyAmount: RawMoney | null;
  };
  lines: { edges: Array<{ node: RawCartLine }> };
  discountCodes: Array<{ code: string; applicable: boolean }>;
  buyerIdentity: {
    email: string | null;
    phone: string | null;
    countryCode: string | null;
    customer: { id: string; email: string | null } | null;
  };
  deliveryGroups: {
    edges: Array<{
      node: {
        id: string;
        groupType: string;
        deliveryOptions: Array<{
          handle: string;
          title: string | null;
          code: string | null;
          deliveryMethodType: string;
          estimatedCost: RawMoney;
        }>;
        selectedDeliveryOption: {
          handle: string;
          title: string | null;
          code: string | null;
          deliveryMethodType: string;
          estimatedCost: RawMoney;
        } | null;
      };
    }>;
  };
}

export interface RawPolicy {
  id: string;
  title: string;
  handle: string;
  url: string | null;
  body: string;
}

export interface RawShop {
  name: string;
  description: string | null;
  primaryDomain: { url: string; host: string } | null;
  brand: {
    logo: RawImage | null;
    slogan: string | null;
    shortDescription: string | null;
  } | null;
  privacyPolicy: RawPolicy | null;
  refundPolicy: RawPolicy | null;
  shippingPolicy: RawPolicy | null;
  termsOfService: RawPolicy | null;
  subscriptionPolicy: RawPolicy | null;
}

export interface RawLocalization {
  country: { isoCode: string; name: string; currency: { isoCode: string; symbol: string } } | null;
  language: { isoCode: string; name: string } | null;
  availableCountries: Array<{
    isoCode: string;
    name: string;
    currency: { isoCode: string; symbol: string };
  }>;
  availableLanguages: Array<{ isoCode: string; name: string }>;
}

export interface RawPage {
  id: string;
  handle: string;
  title: string;
  body: string;
  bodySummary: string;
  updatedAt: string;
  onlineStoreUrl: string | null;
}

export interface RawConnection<T> {
  pageInfo: RawPageInfo;
  edges: Array<{ cursor: string; node: T }>;
}

export interface RawProductVariantWithProduct extends RawVariant {
  product?: { id: string; handle: string; title: string } | null;
}
