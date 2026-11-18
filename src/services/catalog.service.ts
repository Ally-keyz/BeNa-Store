import type { AppConfig } from '../config/env';
import type {
  CollectionDetail,
  CollectionListQuery,
  CollectionProductsQuery,
  CommerceClient,
  MarketContext,
  Paginated,
  Product,
  ProductListQuery,
  SearchQuery,
  PredictiveSearchResults,
  CollectionSummary,
} from '../types/domain';
import { notFound } from '../utils/errors';

export class ProductsService {
  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
  ) {}

  list(query: ProductListQuery): Promise<Paginated<Product>> {
    return this.client.listProducts(query);
  }

  async byHandle(handle: string, ctx?: MarketContext): Promise<Product> {
    const product = await this.client.getProductByHandle(handle, ctx);
    if (!product) throw notFound('Product', handle);
    return product;
  }

  warnings(): string[] {
    const warnings: string[] = [];
    if (!this.client.capabilities.metafields) {
      warnings.push(
        'Storefront token missing: metafields (nutrition, ingredients, allergens, origin) are not available. Product output is partial.',
      );
    }
    if (!this.client.capabilities.productTags) {
      warnings.push('Storefront token missing: product tags are not available.');
    }
    if (!this.client.capabilities.inventoryQuantity) {
      warnings.push('Storefront token missing: exact inventory quantities are not available.');
    }
    if (this.config.shopify.useFixtures) {
      warnings.push('FIXTURE MODE: product data is mocked, not live Shopify data.');
    }
    return warnings;
  }
}

export class CollectionsService {
  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
  ) {}

  list(query: CollectionListQuery): Promise<Paginated<CollectionSummary>> {
    return this.client.listCollections(query);
  }

  async byHandle(
    handle: string,
    query: CollectionProductsQuery,
  ): Promise<CollectionDetail> {
    const collection = await this.client.getCollectionByHandle(handle, query);
    if (!collection) throw notFound('Collection', handle);
    return collection;
  }

  warnings(): string[] {
    const warnings: string[] = [];
    if (this.config.shopify.useFixtures) {
      warnings.push('FIXTURE MODE: collection data is mocked, not live Shopify data.');
    }
    return warnings;
  }
}

export class SearchService {
  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
  ) {}

  search(query: SearchQuery): Promise<Paginated<Product>> {
    return this.client.searchProducts(query);
  }

  predictive(query: SearchQuery): Promise<PredictiveSearchResults> {
    return this.client.predictiveSearch(query);
  }

  warnings(): string[] {
    return this.config.shopify.useFixtures
      ? ['FIXTURE MODE: search results are mocked, not live Shopify data.']
      : [];
  }
}

export class LocalizationService {
  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
  ) {}

  get(ctx?: MarketContext) {
    return this.client.getLocalization(ctx);
  }

  warnings(): string[] {
    const warnings = [
      'Market handles are not exposed by the Storefront API (localization.market is deprecated). Currency groups are derived from availableCountries, not from Shopify Markets handles.',
      '@inContext(country, language) is used for every localized query; pass ?country=DE&language=DE to price/translate accordingly.',
    ];
    if (this.config.shopify.useFixtures) {
      warnings.push('FIXTURE MODE: localization data is mocked.');
    }
    return warnings;
  }
}
