import type { Logger } from 'pino';
import type { AppConfig } from '../../config/env';
import type {
  Cart,
  CartBuyerIdentityInput,
  CartCreateInput,
  CartLineInput,
  CollectionDetail,
  CollectionListQuery,
  CollectionProductsQuery,
  CollectionSummary,
  CommerceClient,
  LocalizationInfo,
  MarketContext,
  Paginated,
  PolicyBundle,
  PredictiveSearchResults,
  Product,
  ProductListQuery,
  SearchQuery,
  ShopInfo,
  StorePage,
} from '../../types/domain';
import { badRequest, upstreamError } from '../../utils/errors';
import { ShopifyGraphqlClient, ShopifyGraphqlError } from './graphqlClient';
import {
  CART_FRAGMENT,
  COLLECTION_FRAGMENT,
  IMAGE_FRAGMENT,
  MONEY_FRAGMENT,
  buildContext,
  buildProductFragment,
} from './fragments';
import {
  mapCart,
  mapCollection,
  mapConnection,
  mapLocalization,
  mapPage,
  mapPolicy,
  mapProduct,
  mapShop,
} from './mappers';
import type {
  RawCart,
  RawCollection,
  RawCollectionConnection,
  RawLocalization,
  RawPage,
  RawProduct,
  RawProductConnection,
  RawShop,
} from './types';

interface UserError {
  field: string[] | null;
  message: string;
  code: string | null;
}

interface CartPayload {
  cart: RawCart | null;
  userErrors: UserError[];
}

interface MutationResult<T> {
  [key: string]: T | null;
}

const PAGE_INFO = /* GraphQL */ `
  pageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`;

export class StorefrontCommerceClient implements CommerceClient {
  readonly mode = 'shopify' as const;
  readonly capabilities: CommerceClient['capabilities'];
  readonly graphql: ShopifyGraphqlClient;

  private readonly siteUrl: string;
  private readonly metafieldsConfig: AppConfig['metafields'];
  private readonly metafieldIdentifiers: Array<{ namespace: string; key: string }>;
  private readonly logger: Logger;
  /** Token-gated fields can be disabled at runtime after ACCESS_DENIED. */
  private tokenFieldsEnabled: boolean;
  private metafieldsEnabled: boolean;

  constructor(options: {
    storeDomain: string;
    apiVersion: string;
    privateToken: string | null;
    publicToken: string | null;
    siteUrl: string;
    metafields: AppConfig['metafields'];
    logger: Logger;
  }) {
    this.logger = options.logger;
    this.siteUrl = options.siteUrl;
    this.metafieldsConfig = options.metafields;
    this.graphql = new ShopifyGraphqlClient({
      storeDomain: options.storeDomain,
      apiVersion: options.apiVersion,
      privateToken: options.privateToken,
      publicToken: options.publicToken,
      logger: options.logger,
    });

    this.metafieldIdentifiers = options.metafields.namespaces.flatMap((namespace) =>
      [
        options.metafields.keys.nutrition,
        options.metafields.keys.ingredients,
        options.metafields.keys.allergens,
        options.metafields.keys.origin,
        options.metafields.keys.preparation,
      ].map((key) => ({ namespace, key })),
    );

    this.capabilities = {
      metafields: this.graphql.hasToken,
      productTags: this.graphql.hasToken,
      inventoryQuantity: this.graphql.hasToken,
    };
    this.tokenFieldsEnabled = this.graphql.hasToken;
    this.metafieldsEnabled = this.graphql.hasToken;
  }

  /**
   * If the token lacks one of the requested token-only scopes, drop those
   * fields and continue with tokenless-safe product data instead of failing
   * the whole endpoint.
   */
  private degradeTokenFields(reason: string): void {
    this.tokenFieldsEnabled = false;
    this.metafieldsEnabled = false;
    this.capabilities.metafields = false;
    this.capabilities.productTags = false;
    this.capabilities.inventoryQuantity = false;
    this.logger.warn(reason);
  }

  // ---------------------------------------------------------------- shop ---

  async getShop(): Promise<ShopInfo> {
    const data = await this.graphql.query<{ shop: RawShop }>(
      /* GraphQL */ `
        query Shop {
          shop {
            name
            description
            primaryDomain {
              url
              host
            }
            brand {
              logo { ...ImageFields }
              slogan
              shortDescription
            }
          }
        }
        ${IMAGE_FRAGMENT}
      `,
      {},
      { operation: 'Shop' },
    );
    return mapShop(data.shop);
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; detail?: string }> {
    const startedAt = Date.now();
    try {
      await this.graphql.query<{ shop: { name: string } }>(
        /* GraphQL */ `query Ping { shop { name } }`,
        {},
        { operation: 'Ping', timeoutMs: 5000 },
      );
      return { ok: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        detail: error instanceof ShopifyGraphqlError ? error.message : 'Storefront API unreachable',
      };
    }
  }

  // ------------------------------------------------------------ products ---

  private metafieldArgs(include: boolean): {
    variableDefinitions: string[];
    variables: Record<string, unknown>;
  } {
    if (!include || !this.metafieldsEnabled) return { variableDefinitions: [], variables: {} };
    return {
      variableDefinitions: ['$metafields: [HasMetafieldsIdentifier!]!'],
      variables: { metafields: this.metafieldIdentifiers },
    };
  }

  private productQueryParts(includeMetafields: boolean): {
    variableDefinitions: string[];
    variables: Record<string, unknown>;
    fragments: string;
  } {
    const meta = this.metafieldArgs(includeMetafields);
    return {
      variableDefinitions: meta.variableDefinitions,
      variables: meta.variables,
      fragments: [
        buildProductFragment({
          tokenFields: this.tokenFieldsEnabled,
          includeMetafields,
        }),
        IMAGE_FRAGMENT,
        MONEY_FRAGMENT,
      ].join('\n'),
    };
  }

  private mapProducts(connection: RawProductConnection): Paginated<Product> {
    return mapConnection(connection, (node) =>
      mapProduct(node, { siteUrl: this.siteUrl, metafields: this.metafieldsConfig }),
    );
  }

  async listProducts(query: ProductListQuery): Promise<Paginated<Product>> {
    const includeMetafields = Boolean(query.includeMetafields && this.graphql.hasToken);    const ctx = buildContext(query);
    const parts = this.productQueryParts(includeMetafields);
    const variableDefinitions = [
      '$first: Int!',
      '$after: String',
      '$query: String',
      '$sortKey: ProductSortKeys',
      '$reverse: Boolean',
      ...ctx.variableDefinitions,
      ...parts.variableDefinitions,
    ];
    const document = /* GraphQL */ `
      query Products(${variableDefinitions.join(', ')})${ctx.directive} {
        products(
          first: $first
          after: $after
          query: $query
          sortKey: $sortKey
          reverse: $reverse
        ) {
          ${PAGE_INFO}
          edges {
            cursor
            node { ...ProductFields }
          }
        }
      }
      ${parts.fragments}
    `;
    const variables = {
      first: query.first ?? 20,
      after: query.after ?? null,
      query: query.query ?? null,
      sortKey: query.sortKey ?? 'CREATED_AT',
      reverse: query.reverse ?? true,
      ...ctx.variables,
      ...parts.variables,
    };

    try {
      const data = await this.graphql.query<{ products: RawProductConnection }>(document, variables, {
        operation: 'Products',
      });
      return this.mapProducts(data.products);
    } catch (error) {
      if (error instanceof ShopifyGraphqlError && error.isAccessDenied) {
        if (includeMetafields) {
          this.metafieldsEnabled = false;
          this.capabilities.metafields = false;
          this.logger.warn(
            'Metafield access denied; retrying without metafields. Expose the definitions to the Storefront API.',
          );
          return this.listProducts({ ...query, includeMetafields: false });
        }
        if (this.tokenFieldsEnabled) {
          this.degradeTokenFields(
            'Token-only product fields denied; retrying without tags/inventory quantities.',
          );
          return this.listProducts({ ...query, includeMetafields: false });
        }
      }
      throw error;
    }
  }

  async getProductByHandle(handle: string, ctx?: MarketContext): Promise<Product | null> {
    const includeMetafields = this.metafieldsEnabled;
    const context = buildContext(ctx);
    const parts = this.productQueryParts(includeMetafields);
    const document = /* GraphQL */ `
      query ProductByHandle(
        $handle: String!
        ${context.variableDefinitions.length ? `, ${context.variableDefinitions.join(', ')}` : ''}
        ${parts.variableDefinitions.length ? `, ${parts.variableDefinitions.join(', ')}` : ''}
      )${context.directive} {
        product(handle: $handle) {
          ...ProductFields
        }
      }
      ${parts.fragments}
    `;
    try {
      const data = await this.graphql.query<{ product: RawProduct | null }>(
        document,
        { handle, ...context.variables, ...parts.variables },
        { operation: 'ProductByHandle' },
      );
      return data.product
        ? mapProduct(data.product, { siteUrl: this.siteUrl, metafields: this.metafieldsConfig })
        : null;
    } catch (error) {
      if (error instanceof ShopifyGraphqlError && error.isAccessDenied) {
        if (this.metafieldsEnabled) {
          this.metafieldsEnabled = false;
          this.capabilities.metafields = false;
          this.logger.warn(
            'Metafield access denied for product query; retrying without metafields. Audit food checks will be partial.',
          );
          return this.getProductByHandle(handle, ctx);
        }
        if (this.tokenFieldsEnabled) {
          this.degradeTokenFields(
            'Token-only product fields denied; retrying without tags/inventory quantities.',
          );
          return this.getProductByHandle(handle, ctx);
        }
      }
      throw error;
    }
  }

  // --------------------------------------------------------- collections ---

  async listCollections(query: CollectionListQuery): Promise<Paginated<CollectionSummary>> {
    const data = await this.graphql.query<{ collections: RawCollectionConnection }>(
      /* GraphQL */ `
        query Collections($first: Int!, $after: String, $query: String, $sortKey: CollectionSortKeys, $reverse: Boolean) {
          collections(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
            ${PAGE_INFO}
            edges {
              node { ...CollectionFields }
            }
          }
        }
        ${COLLECTION_FRAGMENT}
        ${IMAGE_FRAGMENT}
      `,
      {
        first: query.first ?? 20,
        after: query.after ?? null,
        query: query.query ?? null,
        sortKey: query.sortKey ?? 'TITLE',
        reverse: query.reverse ?? false,
      },
      { operation: 'Collections' },
    );
    return mapConnection(data.collections, (node) => mapCollection(node, this.siteUrl));
  }

  async getCollectionByHandle(
    handle: string,
    query: CollectionProductsQuery = {},
  ): Promise<CollectionDetail | null> {
    const ctx = buildContext(query);
    // Collection browsing does not need metafields; keeps query cost low.
    const includeMetafields = false;
    const parts = this.productQueryParts(includeMetafields);
    const document = /* GraphQL */ `
      query CollectionByHandle(
        $handle: String!
        $productsFirst: Int!
        $productsAfter: String
        $productsSortKey: ProductCollectionSortKeys
        $productsReverse: Boolean
        ${ctx.variableDefinitions.length ? `, ${ctx.variableDefinitions.join(', ')}` : ''}
        ${parts.variableDefinitions.length ? `, ${parts.variableDefinitions.join(', ')}` : ''}
      )${ctx.directive} {
        collection(handle: $handle) {
          ...CollectionFields
          products(
            first: $productsFirst
            after: $productsAfter
            sortKey: $productsSortKey
            reverse: $productsReverse
          ) {
            ${PAGE_INFO}
            edges {
              cursor
              node { ...ProductFields }
            }
          }
        }
      }
      ${COLLECTION_FRAGMENT}
      ${parts.fragments}
    `;
    let data: { collection: RawCollection | null };
    try {
      data = await this.graphql.query<{ collection: RawCollection | null }>(
        document,
        {
          handle,
          productsFirst: query.first ?? 20,
          productsAfter: query.after ?? null,
          productsSortKey: query.sortKey ?? 'COLLECTION_DEFAULT',
          productsReverse: query.reverse ?? false,
          ...ctx.variables,
          ...parts.variables,
        },
        { operation: 'CollectionByHandle' },
      );
    } catch (error) {
      if (
        error instanceof ShopifyGraphqlError &&
        error.isAccessDenied &&
        this.tokenFieldsEnabled
      ) {
        this.degradeTokenFields(
          'Token-only fields denied for collection products; retrying without tags/inventory quantities.',
        );
        return this.getCollectionByHandle(handle, query);
      }
      throw error;
    }
    if (!data.collection) return null;
    const products = data.collection.products
      ? this.mapProducts(data.collection.products)
      : {
          items: [],
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        };
    return { ...mapCollection(data.collection, this.siteUrl), products };
  }

  // -------------------------------------------------------------- search ---

  async searchProducts(query: SearchQuery): Promise<Paginated<Product>> {
    return this.listProducts({
      first: query.first,
      after: query.after,
      query: query.query,
      sortKey: 'RELEVANCE',
      reverse: false,
      country: query.country,
      language: query.language,
    });
  }

  async predictiveSearch(query: SearchQuery): Promise<PredictiveSearchResults> {
    const typeMap: Record<string, string> = {
      product: 'PRODUCT',
      collection: 'COLLECTION',
      page: 'PAGE',
      article: 'ARTICLE',
      query: 'QUERY',
    };
    const types = (query.types ?? ['product', 'collection', 'page', 'query']).map(
      (type) => typeMap[type] ?? 'PRODUCT',
    );
    const ctx = buildContext(query);
    const document = /* GraphQL */ `
      query PredictiveSearch(
        $query: String!
        $limit: Int
        $types: [PredictiveSearchType!]
        $unavailableProducts: SearchUnavailableProductsType
        ${ctx.variableDefinitions.length ? `, ${ctx.variableDefinitions.join(', ')}` : ''}
      )${ctx.directive} {
        predictiveSearch(
          query: $query
          limit: $limit
          types: $types
          unavailableProducts: $unavailableProducts
        ) {
          products {
            id
            handle
            title
            featuredImage { ...ImageFields }
            priceRange {
              minVariantPrice { ...MoneyFields }
              maxVariantPrice { ...MoneyFields }
            }
          }
          collections { id handle title }
          pages { id handle title }
          queries { text }
        }
      }
      ${IMAGE_FRAGMENT}
      ${MONEY_FRAGMENT}
    `;
    const data = await this.graphql.query<{
      predictiveSearch: {
        products: Array<{
          id: string;
          handle: string;
          title: string;
          featuredImage: RawProduct['featuredImage'];
          priceRange: RawProduct['priceRange'];
        }>;
        collections: Array<{ id: string; handle: string; title: string }>;
        pages: Array<{ id: string; handle: string; title: string }>;
        queries: Array<{ text: string }>;
      };
    }>(
      document,
      {
        query: query.query,
        limit: query.first ?? 8,
        types,
        unavailableProducts: query.unavailableProducts ?? null,
        ...ctx.variables,
      },
      { operation: 'PredictiveSearch' },
    );

    const result = data.predictiveSearch;
    return {
      products: result.products.map((product) => ({
        id: product.id,
        handle: product.handle,
        title: product.title,
        url: `${this.siteUrl}/products/${product.handle}`,
        featuredImage: product.featuredImage
          ? {
              url: product.featuredImage.url,
              altText: product.featuredImage.altText ?? null,
              width: product.featuredImage.width ?? null,
              height: product.featuredImage.height ?? null,
            }
          : null,
        priceRange: {
          minVariantPrice: {
            amount: product.priceRange.minVariantPrice.amount,
            currencyCode: product.priceRange.minVariantPrice.currencyCode,
          },
          maxVariantPrice: {
            amount: product.priceRange.maxVariantPrice.amount,
            currencyCode: product.priceRange.maxVariantPrice.currencyCode,
          },
        },
      })),
      collections: result.collections.map((collection) => ({
        ...collection,
        url: `${this.siteUrl}/collections/${collection.handle}`,
      })),
      pages: result.pages.map((page) => ({
        ...page,
        url: `${this.siteUrl}/pages/${page.handle}`,
      })),
      queries: result.queries.map((entry) => entry.text),
    };
  }

  // -------------------------------------------------- localization/shop ---

  async getLocalization(ctx?: MarketContext): Promise<LocalizationInfo> {
    const context = buildContext(ctx);
    const variables =
      context.variableDefinitions.length > 0
        ? `(${context.variableDefinitions.join(', ')})`
        : '';
    const document = /* GraphQL */ `
      query Localization${variables}${context.directive} {
        localization {
          country {
            isoCode
            name
            currency { isoCode symbol }
          }
          language { isoCode name }
          availableCountries {
            isoCode
            name
            currency { isoCode symbol }
          }
          availableLanguages { isoCode name }
        }
      }
    `;
    const data = await this.graphql.query<{ localization: RawLocalization }>(
      document,
      context.variables,
      { operation: 'Localization' },
    );
    const mapped = mapLocalization(data.localization);
    mapped.requested = {
      country: ctx?.country?.toUpperCase() ?? null,
      language: ctx?.language?.toUpperCase() ?? null,
      marketHandle: null,
    };
    return mapped;
  }

  async getPolicies(): Promise<PolicyBundle> {
    const data = await this.graphql.query<{ shop: RawShop }>(
      /* GraphQL */ `
        query Policies {
          shop {
            name
            privacyPolicy { id title handle url body }
            refundPolicy { id title handle url body }
            shippingPolicy { id title handle url body }
            termsOfService { id title handle url body }
            subscriptionPolicy { id title handle url body }
          }
        }
      `,
      {},
      { operation: 'Policies' },
    );
    const shop = data.shop;
    return {
      shopName: shop.name,
      policies: {
        shipping: mapPolicy(shop.shippingPolicy),
        refund: mapPolicy(shop.refundPolicy),
        privacy: mapPolicy(shop.privacyPolicy),
        termsOfService: mapPolicy(shop.termsOfService),
        subscription: mapPolicy(shop.subscriptionPolicy),
        legalNotice: null,
      },
      gaps: ['legalNotice'],
    };
  }

  async getPages(query: string, first = 5): Promise<StorePage[]> {
    const data = await this.graphql.query<{
      pages: { edges: Array<{ node: RawPage }> };
    }>(
      /* GraphQL */ `
        query Pages($first: Int!, $query: String) {
          pages(first: $first, query: $query) {
            edges {
              node {
                id
                handle
                title
                body
                bodySummary
                updatedAt
                onlineStoreUrl
              }
            }
          }
        }
      `,
      { first, query: query || null },
      { operation: 'Pages' },
    );
    return data.pages.edges.map((edge) => mapPage(edge.node, this.siteUrl));
  }

  // ---------------------------------------------------------------- cart ---

  private cartUserErrors(payload: CartPayload | null | undefined, action: string): RawCart {
    const errors = payload?.userErrors ?? [];
    if (!payload?.cart) {
      if (errors.length > 0) {
        throw badRequest(`Shopify rejected ${action}`, errors);
      }
      throw upstreamError(`Shopify did not return a cart for ${action}`);
    }
    return payload.cart;
  }

  private async runCartMutation(
    document: string,
    variables: Record<string, unknown>,
    action: string,
    cartKey: string,
    operation: string,
  ): Promise<Cart> {
    const data = await this.graphql.query<MutationResult<CartPayload>>(document, variables, {
      operation,
    });
    const payload = data[cartKey];
    const rawCart = this.cartUserErrors(payload, action);
    const warnings = (payload?.userErrors ?? []).map((error) => error.message);
    return mapCart(rawCart, { siteUrl: this.siteUrl, warnings });
  }

  async createCart(input: CartCreateInput): Promise<Cart> {
    const ctx = buildContext({ country: input.country, language: input.language });
    const document = /* GraphQL */ `
      mutation CartCreate(
        $input: CartInput
        ${ctx.variableDefinitions.length ? `, ${ctx.variableDefinitions.join(', ')}` : ''}
      )${ctx.directive} {
        cartCreate(input: $input) {
          cart { ...CartFields }
          userErrors { field message code }
        }
      }
      ${CART_FRAGMENT}
      ${IMAGE_FRAGMENT}
      ${MONEY_FRAGMENT}
    `;

    const cartInput: Record<string, unknown> = {};
    if (input.lines?.length) {
      cartInput.lines = input.lines.map((line) => this.toLineInput(line));
    }
    if (input.buyerIdentity) {
      cartInput.buyerIdentity = this.toBuyerIdentity(input.buyerIdentity);
    }
    if (input.note) cartInput.note = input.note;
    if (input.attributes?.length) cartInput.attributes = input.attributes;

    const data = await this.graphql.query<MutationResult<CartPayload>>(
      document,
      { input: cartInput, ...ctx.variables },
      { operation: 'CartCreate' },
    );
    const cart = this.cartUserErrors(data.cartCreate, 'cart creation');

    if (input.discountCodes?.length) {
      return this.updateCartDiscountCodes(cart.id, input.discountCodes);
    }
    return mapCart(cart, { siteUrl: this.siteUrl });
  }

  private toLineInput(line: CartLineInput): Record<string, unknown> {
    return {
      merchandiseId: line.merchandiseId,
      quantity: line.quantity,
      ...(line.attributes?.length ? { attributes: line.attributes } : {}),
    };
  }

  private toBuyerIdentity(identity: CartBuyerIdentityInput): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (identity.email) result.email = identity.email;
    if (identity.phone) result.phone = identity.phone;
    if (identity.countryCode) result.countryCode = identity.countryCode.toUpperCase();
    if (identity.customerAccessToken) result.customerAccessToken = identity.customerAccessToken;
    return result;
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const data = await this.graphql.query<{ cart: RawCart | null }>(
      /* GraphQL */ `
        query Cart($id: ID!) {
          cart(id: $id) {
            ...CartFields
          }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `,
      { id: cartId },
      { operation: 'Cart' },
    );
    return data.cart ? mapCart(data.cart, { siteUrl: this.siteUrl }) : null;
  }

  async addCartLines(cartId: string, lines: CartLineInput[]): Promise<Cart> {
    return this.runCartMutation(
      /* GraphQL */ `
        mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
          cartLinesAdd(cartId: $cartId, lines: $lines) {
            cart { ...CartFields }
            userErrors { field message code }
          }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `,
      { cartId, lines: lines.map((line) => this.toLineInput(line)) },
      'cart line addition',
      'cartLinesAdd',
      'CartLinesAdd',
    );
  }

  async updateCartLines(
    cartId: string,
    lines: Array<{ id: string; quantity: number; merchandiseId?: string }>,
  ): Promise<Cart> {
    return this.runCartMutation(
      /* GraphQL */ `
        mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart { ...CartFields }
            userErrors { field message code }
          }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `,
      {
        cartId,
        lines: lines.map((line) => ({
          id: line.id,
          quantity: line.quantity,
          ...(line.merchandiseId ? { merchandiseId: line.merchandiseId } : {}),
        })),
      },
      'cart line update',
      'cartLinesUpdate',
      'CartLinesUpdate',
    );
  }

  async removeCartLines(cartId: string, lineIds: string[]): Promise<Cart> {
    return this.runCartMutation(
      /* GraphQL */ `
        mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart { ...CartFields }
            userErrors { field message code }
          }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `,
      { cartId, lineIds },
      'cart line removal',
      'cartLinesRemove',
      'CartLinesRemove',
    );
  }

  async updateCartBuyerIdentity(
    cartId: string,
    identity: CartBuyerIdentityInput,
  ): Promise<Cart> {
    return this.runCartMutation(
      /* GraphQL */ `
        mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
          cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
            cart { ...CartFields }
            userErrors { field message code }
          }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `,
      { cartId, buyerIdentity: this.toBuyerIdentity(identity) },
      'buyer identity update',
      'cartBuyerIdentityUpdate',
      'CartBuyerIdentityUpdate',
    );
  }

  async updateCartDiscountCodes(cartId: string, codes: string[]): Promise<Cart> {
    return this.runCartMutation(
      /* GraphQL */ `
        mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
          cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
            cart { ...CartFields }
            userErrors { field message code }
          }
        }
        ${CART_FRAGMENT}
        ${IMAGE_FRAGMENT}
        ${MONEY_FRAGMENT}
      `,
      { cartId, discountCodes: codes },
      'discount code update',
      'cartDiscountCodesUpdate',
      'CartDiscountCodesUpdate',
    );
  }
}
