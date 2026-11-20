import type {
  Cart,
  CartDeliveryGroup,
  CartLine,
  CollectionSummary,
  CountryInfo,
  LocalizationInfo,
  MetafieldValue,
  Money,
  PageInfo,
  PolicySet,
  Product,
  ProductImage,
  ProductMetafields,
  ProductVariant,
  ShopInfo,
  StorePage,
} from '../../types/domain';
import type { AppConfig } from '../../config/env';
import type {
  RawCart,
  RawCollection,
  RawImage,
  RawLocalization,
  RawMetafield,
  RawMoney,
  RawMoneyRange,
  RawPage,
  RawPolicy,
  RawProduct,
  RawShop,
  RawVariant,
} from './types';

export function mapMoney(raw: RawMoney | null | undefined): Money {
  return { amount: raw?.amount ?? '0.00', currencyCode: raw?.currencyCode ?? 'EUR' };
}

export function mapImage(raw: RawImage | null | undefined): ProductImage | null {
  if (!raw?.url) return null;
  return {
    url: raw.url,
    altText: raw.altText ?? null,
    width: raw.width ?? null,
    height: raw.height ?? null,
  };
}

function mapMoneyRange(raw: RawMoneyRange | null | undefined): {
  minVariantPrice: Money;
  maxVariantPrice: Money;
} {
  return {
    minVariantPrice: mapMoney(raw?.minVariantPrice),
    maxVariantPrice: mapMoney(raw?.maxVariantPrice),
  };
}

function mapPageInfo(raw: { pageInfo: PageInfo }): PageInfo {
  return {
    hasNextPage: Boolean(raw.pageInfo.hasNextPage),
    hasPreviousPage: Boolean(raw.pageInfo.hasPreviousPage),
    startCursor: raw.pageInfo.startCursor ?? null,
    endCursor: raw.pageInfo.endCursor ?? null,
  };
}

export function mapConnection<T, U>(
  raw: { pageInfo: PageInfo; edges: Array<{ node: T }> },
  mapper: (node: T) => U,
): { items: U[]; pageInfo: PageInfo } {
  return {
    items: raw.edges.map((edge) => mapper(edge.node)),
    pageInfo: mapPageInfo(raw),
  };
}

export function mapVariant(raw: RawVariant): ProductVariant {
  return {
    id: raw.id,
    title: raw.title,
    sku: raw.sku ?? null,
    availableForSale: Boolean(raw.availableForSale),
    quantityAvailable: typeof raw.quantityAvailable === 'number' ? raw.quantityAvailable : null,
    price: mapMoney(raw.price),
    compareAtPrice: raw.compareAtPrice ? mapMoney(raw.compareAtPrice) : null,
    unitPrice: raw.unitPrice ? mapMoney(raw.unitPrice) : null,
    unitPriceMeasurement: raw.unitPriceMeasurement
      ? {
          measuredType: raw.unitPriceMeasurement.measuredType ?? null,
          quantityUnit: raw.unitPriceMeasurement.quantityUnit,
          quantityValue: raw.unitPriceMeasurement.quantityValue,
          referenceUnit: raw.unitPriceMeasurement.referenceUnit,
          referenceValue: raw.unitPriceMeasurement.referenceValue,
        }
      : null,
    requiresShipping: Boolean(raw.requiresShipping),
    selectedOptions: raw.selectedOptions ?? [],
    image: mapImage(raw.image),
  };
}

function toMetafieldValue(raw: RawMetafield): MetafieldValue {
  return {
    namespace: raw.namespace,
    key: raw.key,
    type: raw.type,
    value: raw.value,
  };
}

/**
 * Resolve the five logical food fields from the exposed metafield list.
 * Metafields only arrive when a Storefront token is used AND the definition
 * is exposed to the Storefront API; otherwise every value is null and the
 * completeness report explicitly flags "unavailable", not "missing".
 */
export function mapMetafields(
  rawMetafields: Array<RawMetafield | null> | undefined,
  config: AppConfig['metafields'],
): ProductMetafields {
  const entries = (rawMetafields ?? []).filter((entry): entry is RawMetafield => Boolean(entry));
  const resolve = (logicalKey: string): MetafieldValue | null => {
    for (const namespace of config.namespaces) {
      const found = entries.find(
        (entry) =>
          entry.namespace === namespace &&
          entry.key.toLowerCase() === logicalKey.toLowerCase(),
      );
      if (found) return toMetafieldValue(found);
    }
    const fallback = entries.find(
      (entry) => entry.key.toLowerCase() === logicalKey.toLowerCase(),
    );
    return fallback ? toMetafieldValue(fallback) : null;
  };

  return {
    nutrition: resolve(config.keys.nutrition),
    ingredients: resolve(config.keys.ingredients),
    allergens: resolve(config.keys.allergens),
    origin: resolve(config.keys.origin),
    preparation: resolve(config.keys.preparation),
  };
}

export function mapProduct(
  raw: RawProduct,
  options: { siteUrl: string; metafields: AppConfig['metafields'] },
): Product {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description ?? '',
    descriptionHtml: raw.descriptionHtml ?? '',
    vendor: raw.vendor ?? '',
    productType: raw.productType ?? '',
    tags: raw.tags ?? [],
    availableForSale: Boolean(raw.availableForSale),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt ?? null,
    onlineStoreUrl: raw.onlineStoreUrl ?? null,
    url: `${options.siteUrl}/products/${raw.handle}`,
    seo: { title: raw.seo?.title ?? null, description: raw.seo?.description ?? null },
    priceRange: mapMoneyRange(raw.priceRange),
    compareAtPriceRange: mapMoneyRange(raw.compareAtPriceRange),
    featuredImage: mapImage(raw.featuredImage),
    images: (raw.images?.edges ?? [])
      .map((edge) => mapImage(edge.node))
      .filter((image): image is ProductImage => Boolean(image)),
    options: raw.options ?? [],
    variants: (raw.variants?.edges ?? []).map((edge) => mapVariant(edge.node)),
    metafields: mapMetafields(raw.metafields, options.metafields),
  };
}

export function mapCollection(raw: RawCollection, siteUrl: string): CollectionSummary {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description ?? '',
    updatedAt: raw.updatedAt,
    url: `${siteUrl}/collections/${raw.handle}`,
    image: mapImage(raw.image),
    seo: { title: raw.seo?.title ?? null, description: raw.seo?.description ?? null },
  };
}

function mapCartLine(raw: RawCart['lines']['edges'][number]['node'], siteUrl: string): CartLine {
  const merchandise = raw.merchandise;
  return {
    id: raw.id,
    quantity: raw.quantity,
    cost: {
      amountPerQuantity: mapMoney(raw.cost.amountPerQuantity),
      subtotalAmount: mapMoney(raw.cost.subtotalAmount),
      totalAmount: mapMoney(raw.cost.totalAmount),
    },
    merchandise: merchandise
      ? {
          id: merchandise.id,
          title: merchandise.title,
          sku: merchandise.sku ?? null,
          availableForSale: Boolean(merchandise.availableForSale),
          price: mapMoney(merchandise.price),
          image: mapImage(merchandise.image),
          product: {
            id: merchandise.product.id,
            handle: merchandise.product.handle,
            title: merchandise.product.title,
            description: merchandise.product.description ?? '',
            descriptionHtml: merchandise.product.descriptionHtml ?? '',
            url:
              merchandise.product.onlineStoreUrl ??
              `${siteUrl}/products/${merchandise.product.handle}`,
          },
          selectedOptions: merchandise.selectedOptions ?? [],
        }
      : null,
  };
}

function mapDeliveryGroup(group: RawCart['deliveryGroups']['edges'][number]['node']): CartDeliveryGroup {
  const mapOption = (option: NonNullable<RawCart['deliveryGroups']['edges'][number]['node']['selectedDeliveryOption']>) => ({
    handle: option.handle,
    title: option.title ?? null,
    code: option.code ?? null,
    deliveryMethodType: option.deliveryMethodType,
    estimatedCost: mapMoney(option.estimatedCost),
  });
  return {
    id: group.id,
    groupType: group.groupType,
    deliveryOptions: (group.deliveryOptions ?? []).map(mapOption),
    selectedDeliveryOption: group.selectedDeliveryOption
      ? mapOption(group.selectedDeliveryOption)
      : null,
  };
}

export function mapCart(raw: RawCart, options: { siteUrl: string; warnings?: string[] }): Cart {
  const warnings = options.warnings ?? [];
  return {
    id: raw.id,
    totalQuantity: raw.totalQuantity,
    // Passed through untouched: checkout is always Shopify-hosted.
    checkoutUrl: raw.checkoutUrl,
    checkout: { hostedBy: 'shopify', url: raw.checkoutUrl },
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    cost: {
      subtotalAmount: raw.cost?.subtotalAmount ? mapMoney(raw.cost.subtotalAmount) : null,
      totalAmount: raw.cost?.totalAmount ? mapMoney(raw.cost.totalAmount) : null,
      totalTaxAmount: raw.cost?.totalTaxAmount ? mapMoney(raw.cost.totalTaxAmount) : null,
      totalDutyAmount: raw.cost?.totalDutyAmount ? mapMoney(raw.cost.totalDutyAmount) : null,
    },
    lines: (raw.lines?.edges ?? []).map((edge) => mapCartLine(edge.node, options.siteUrl)),
    discountCodes: raw.discountCodes ?? [],
    buyerIdentity: {
      email: raw.buyerIdentity?.email ?? null,
      phone: raw.buyerIdentity?.phone ?? null,
      countryCode: raw.buyerIdentity?.countryCode ?? null,
      customer: raw.buyerIdentity?.customer
        ? { id: raw.buyerIdentity.customer.id, email: raw.buyerIdentity.customer.email ?? null }
        : null,
    },
    deliveryGroups: (raw.deliveryGroups?.edges ?? []).map((edge) => mapDeliveryGroup(edge.node)),
    warnings,
  };
}

function mapCountry(country: RawLocalization['availableCountries'][number]): CountryInfo {
  return {
    isoCode: country.isoCode,
    name: country.name,
    currency: { isoCode: country.currency.isoCode, symbol: country.currency.symbol },
  };
}

export function mapLocalization(raw: RawLocalization): LocalizationInfo {
  const availableCountries = (raw.availableCountries ?? []).map(mapCountry);
  const languageCodes = (raw.availableLanguages ?? []).map((language) => language.isoCode);

  // The Storefront API no longer exposes market handles (localization.market is
  // deprecated). Derive currency groups and label them as derived, never as
  // real Shopify Market handles.
  const currencyGroups = new Map<string, CountryInfo[]>();
  for (const country of availableCountries) {
    const list = currencyGroups.get(country.currency.isoCode) ?? [];
    list.push(country);
    currencyGroups.set(country.currency.isoCode, list);
  }

  return {
    requested: { country: null, language: null, marketHandle: null },
    country: raw.country ? mapCountry(raw.country) : null,
    language: raw.language
      ? { isoCode: raw.language.isoCode, name: raw.language.name }
      : null,
    availableCountries,
    availableLanguages: raw.availableLanguages ?? [],
    markets: [...currencyGroups.entries()].map(([currency, countries]) => ({
      handle: `derived-${currency.toLowerCase()}`,
      countries: countries.map((country) => country.isoCode),
      currencies: [currency],
      languages: languageCodes,
    })),
  };
}

export function mapPolicy(raw: RawPolicy | null): PolicySet['policies']['shipping'] {
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.title,
    handle: raw.handle,
    url: raw.url ?? null,
    body: raw.body ?? '',
  };
}

export function mapShop(raw: RawShop): ShopInfo {
  return {
    name: raw.name,
    description: raw.description ?? null,
    primaryDomain: raw.primaryDomain
      ? { url: raw.primaryDomain.url, host: raw.primaryDomain.host }
      : null,
    paymentSettings: null,
    brand: raw.brand
      ? {
          logo: mapImage(raw.brand.logo),
          slogan: raw.brand.slogan ?? null,
          shortDescription: raw.brand.shortDescription ?? null,
        }
      : null,
  };
}

export function mapPage(raw: RawPage, siteUrl: string): StorePage {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    body: raw.body ?? '',
    bodySummary: raw.bodySummary ?? '',
    updatedAt: raw.updatedAt,
    url: raw.onlineStoreUrl ?? `${siteUrl}/pages/${raw.handle}`,
  };
}
