import type {
  Cart,
  CartBuyerIdentityInput,
  CartCreateInput,
  CartDeliveryGroup,
  CartLine,
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
  ProductVariant,
  SearchQuery,
  ShopInfo,
  StorePage,
} from '../../types/domain';
import { notFound } from '../../utils/errors';
import {
  fixtureCartConfig,
  fixtureCollections,
  fixtureLocalization,
  fixturePages,
  fixturePolicies,
  fixtureProducts,
  fixtureShop,
} from '../../fixtures/mock/data';

const SITE = 'https://benaorigins.de';
const VALID_DISCOUNT_CODES = new Set(['BENA10']);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cursorFor(index: number): string {
  return `cursor:${index}`;
}

function indexFromCursor(after: string | undefined): number {
  if (!after) return 0;
  const match = /^cursor:(\d+)$/.exec(after);
  if (!match) return 0;
  return Number.parseInt(match[1]!, 10) + 1;
}

function paginate<T>(items: T[], first = 20, after?: string): Paginated<T> {
  const start = indexFromCursor(after);
  const page = items.slice(start, start + first);
  const endIndex = start + page.length - 1;
  return {
    items: clone(page),
    pageInfo: {
      hasNextPage: start + first < items.length,
      hasPreviousPage: start > 0,
      startCursor: page.length > 0 ? cursorFor(start) : null,
      endCursor: page.length > 0 ? cursorFor(endIndex) : null,
    },
  };
}

function matchesQuery(product: Product, query: string | undefined): boolean {
  if (!query) return true;
  const haystack = `${product.title} ${product.handle} ${product.description} ${product.productType} ${product.tags.join(' ')}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function sortProducts(products: Product[], sortKey = 'CREATED_AT', reverse = true): Product[] {
  const sorted = [...products];
  switch (sortKey) {
    case 'TITLE':
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'PRICE':
      sorted.sort(
        (a, b) =>
          Number(a.priceRange.minVariantPrice.amount) - Number(b.priceRange.minVariantPrice.amount),
      );
      break;
    default:
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }
  return reverse && sortKey !== 'TITLE' ? sorted.reverse() : sorted;
}

function findVariant(merchandiseId: string): { product: Product; variant: ProductVariant } | null {
  for (const product of fixtureProducts) {
    const variant = product.variants.find((entry) => entry.id === merchandiseId);
    if (variant) return { product, variant };
  }
  return null;
}

function deliveryGroupFor(countryCode: string | null): CartDeliveryGroup {
  const isDomestic = !countryCode || countryCode === fixtureCartConfig.domesticCountry;
  const option = isDomestic
    ? fixtureCartConfig.deliveryOptions[0]!
    : fixtureCartConfig.deliveryOptions[1]!;
  const mapped = {
    handle: option.handle,
    title: option.title,
    code: option.code,
    deliveryMethodType: 'SHIPPING',
    estimatedCost: { amount: option.cost.toFixed(2), currencyCode: 'EUR' },
  };
  return {
    id: 'gid://shopify/CartDeliveryGroup/fixture-group',
    groupType: 'ONE_TIME_PURCHASE',
    deliveryOptions: [mapped],
    selectedDeliveryOption: mapped,
  };
}

interface InternalCart {
  id: string;
  lines: Array<{ variantId: string; quantity: number }>;
  buyerIdentity: CartBuyerIdentityInput;
  discountCodes: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export class FixtureCommerceClient implements CommerceClient {
  readonly mode = 'fixture' as const;
  readonly capabilities = {
    metafields: true,
    productTags: true,
    inventoryQuantity: true,
  };

  private readonly carts = new Map<string, InternalCart>();
  private cartCounter = 1;

  async getShop(): Promise<ShopInfo> {
    return clone(fixtureShop);
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number; detail?: string }> {
    return { ok: true, latencyMs: 0, detail: 'fixture mode (no Shopify call)' };
  }

  async listProducts(query: ProductListQuery): Promise<Paginated<Product>> {
    const filtered = sortProducts(
      fixtureProducts.filter((product) => matchesQuery(product, query.query)),
      query.sortKey,
      query.reverse,
    );
    return paginate(filtered, query.first ?? 20, query.after);
  }

  async getProductByHandle(handle: string): Promise<Product | null> {
    const product = fixtureProducts.find((entry) => entry.handle === handle);
    return product ? clone(product) : null;
  }

  async listCollections(query: CollectionListQuery): Promise<Paginated<CollectionSummary>> {
    const filtered = fixtureCollections
      .filter((collection) =>
        query.query ? collection.title.toLowerCase().includes(query.query.toLowerCase()) : true,
      )
      .map(({ productIds: _productIds, ...collection }) => collection);
    return paginate(filtered, query.first ?? 20, query.after);
  }

  async getCollectionByHandle(
    handle: string,
    query: CollectionProductsQuery = {},
  ): Promise<CollectionDetail | null> {
    const collection = fixtureCollections.find((entry) => entry.handle === handle);
    if (!collection) return null;
    const products = fixtureProducts.filter((product) =>
      collection.productIds.includes(product.id),
    );
    const { productIds: _productIds, ...summary } = collection;
    return {
      ...clone(summary),
      products: paginate(products, query.first ?? 20, query.after),
    };
  }

  async searchProducts(query: SearchQuery): Promise<Paginated<Product>> {
    const filtered = sortProducts(fixtureProducts.filter((product) => matchesQuery(product, query.query)));
    return paginate(filtered, query.first ?? 20, query.after);
  }

  async predictiveSearch(query: SearchQuery): Promise<PredictiveSearchResults> {
    const term = query.query.trim().toLowerCase();
    const limit = query.first ?? 8;
    return {
      products: fixtureProducts
        .filter((product) => matchesQuery(product, term))
        .slice(0, limit)
        .map((product) => ({
          id: product.id,
          handle: product.handle,
          title: product.title,
          url: product.url,
          featuredImage: product.featuredImage,
          priceRange: product.priceRange,
        })),
      collections: fixtureCollections
        .filter((collection) => collection.title.toLowerCase().includes(term))
        .slice(0, limit)
        .map(({ id, handle, title }) => ({ id, handle, title, url: `${SITE}/collections/${handle}` })),
      pages: fixturePages
        .filter((page) => page.title.toLowerCase().includes(term))
        .slice(0, limit)
        .map(({ id, handle, title }) => ({ id, handle, title, url: `${SITE}/pages/${handle}` })),
      queries: [`${query.query} coffee`, `${query.query} rwanda`, `${query.query} gift`],
    };
  }

  async getLocalization(ctx?: MarketContext): Promise<LocalizationInfo> {
    const base = clone(fixtureLocalization);
    const countryCode = ctx?.country?.toUpperCase() ?? base.country?.isoCode ?? 'DE';
    const languageCode = ctx?.language?.toUpperCase() ?? base.language?.isoCode ?? 'EN';
    const country =
      base.availableCountries.find((entry) => entry.isoCode === countryCode) ?? base.country;
    const language =
      base.availableLanguages.find((entry) => entry.isoCode === languageCode) ?? base.language;
    return { ...base, country, language, requested: { country: countryCode, language: languageCode, marketHandle: null } };
  }

  async getPolicies(): Promise<PolicyBundle> {
    return clone(fixturePolicies);
  }

  async getPages(query: string, first = 5): Promise<StorePage[]> {
    const handleMatch = /handle:([a-z0-9-]+)/i.exec(query);
    if (handleMatch?.[1]) {
      return clone(fixturePages.filter((page) => page.handle === handleMatch[1])).slice(0, first);
    }
    const term = query.toLowerCase();
    return clone(fixturePages.filter((page) => page.title.toLowerCase().includes(term))).slice(
      0,
      first,
    );
  }

  // ---------------------------------------------------------------- cart ---

  async createCart(input: CartCreateInput): Promise<Cart> {
    const id = `gid://shopify/Cart/fixture-${this.cartCounter++}`;
    const cart: InternalCart = {
      id,
      lines: [],
      buyerIdentity: input.buyerIdentity ?? {},
      discountCodes: input.discountCodes ?? [],
      note: input.note ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.carts.set(id, cart);
    if (input.lines?.length) this.applyAddLines(cart, input.lines);
    return this.serialize(cart);
  }

  async getCart(cartId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId);
    return cart ? this.serialize(cart) : null;
  }

  async addCartLines(cartId: string, lines: CartLineInput[]): Promise<Cart> {
    const cart = this.requireCart(cartId);
    this.applyAddLines(cart, lines);
    cart.updatedAt = new Date().toISOString();
    return this.serialize(cart);
  }

  async updateCartLines(
    cartId: string,
    lines: Array<{ id: string; quantity: number; merchandiseId?: string }>,
  ): Promise<Cart> {
    const cart = this.requireCart(cartId);
    for (const line of lines) {
      const index = cart.lines.findIndex((entry) => this.lineId(cart.id, entry.variantId) === line.id);
      if (index === -1) continue;
      if (line.quantity <= 0) {
        cart.lines.splice(index, 1);
      } else {
        cart.lines[index]!.quantity = line.quantity;
        if (line.merchandiseId) cart.lines[index]!.variantId = line.merchandiseId;
      }
    }
    cart.updatedAt = new Date().toISOString();
    return this.serialize(cart);
  }

  async removeCartLines(cartId: string, lineIds: string[]): Promise<Cart> {
    const cart = this.requireCart(cartId);
    cart.lines = cart.lines.filter(
      (entry) => !lineIds.includes(this.lineId(cart.id, entry.variantId)),
    );
    cart.updatedAt = new Date().toISOString();
    return this.serialize(cart);
  }

  async updateCartBuyerIdentity(
    cartId: string,
    identity: CartBuyerIdentityInput,
  ): Promise<Cart> {
    const cart = this.requireCart(cartId);
    cart.buyerIdentity = { ...cart.buyerIdentity, ...identity };
    cart.updatedAt = new Date().toISOString();
    return this.serialize(cart);
  }

  async updateCartDiscountCodes(cartId: string, codes: string[]): Promise<Cart> {
    const cart = this.requireCart(cartId);
    cart.discountCodes = codes;
    cart.updatedAt = new Date().toISOString();
    return this.serialize(cart);
  }

  private requireCart(cartId: string): InternalCart {
    const cart = this.carts.get(cartId);
    if (!cart) throw notFound('Cart', cartId);
    return cart;
  }

  private applyAddLines(cart: InternalCart, lines: CartLineInput[]): void {
    for (const line of lines) {
      if (!findVariant(line.merchandiseId)) {
        throw notFound('Product variant', line.merchandiseId);
      }
      const existing = cart.lines.find((entry) => entry.variantId === line.merchandiseId);
      if (existing) {
        existing.quantity += line.quantity;
      } else {
        cart.lines.push({ variantId: line.merchandiseId, quantity: line.quantity });
      }
    }
  }

  private lineId(cartId: string, variantId: string): string {
    return `gid://shopify/CartLine/${cartId.split('/').pop()}-${variantId.split('/').pop()}`;
  }

  private serialize(cart: InternalCart): Cart {
    const lines: CartLine[] = cart.lines
      .map((entry): CartLine | null => {
        const found = findVariant(entry.variantId);
        if (!found) return null;
        const { product, variant } = found;
        const subtotal = (Number(variant.price.amount) * entry.quantity).toFixed(2);
        return {
          id: this.lineId(cart.id, variant.id),
          quantity: entry.quantity,
          cost: {
            amountPerQuantity: variant.price,
            subtotalAmount: { amount: subtotal, currencyCode: variant.price.currencyCode },
            totalAmount: { amount: subtotal, currencyCode: variant.price.currencyCode },
          },
          merchandise: {
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            availableForSale: variant.availableForSale,
            price: variant.price,
            image: variant.image,
            product: { id: product.id, handle: product.handle, title: product.title, description: product.description, url: product.url },
            selectedOptions: variant.selectedOptions,
          },
        };
      })
      .filter((line): line is CartLine => Boolean(line));

    const subtotalAmount = lines
      .reduce((sum, line) => sum + Number(line.cost.subtotalAmount.amount), 0)
      .toFixed(2);
    const checkoutUrl = `${fixtureCartConfig.checkoutUrlBase}/${cart.id.split('/').pop()}`;

    return {
      id: cart.id,
      totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      checkoutUrl,
      checkout: { hostedBy: 'shopify', url: checkoutUrl },
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      cost: {
        subtotalAmount: { amount: subtotalAmount, currencyCode: 'EUR' },
        totalAmount: { amount: subtotalAmount, currencyCode: 'EUR' },
        totalTaxAmount: null,
        totalDutyAmount: null,
      },
      lines,
      discountCodes: cart.discountCodes.map((code) => ({
        code,
        applicable: VALID_DISCOUNT_CODES.has(code.toUpperCase()),
      })),
      buyerIdentity: {
        email: cart.buyerIdentity.email ?? null,
        phone: cart.buyerIdentity.phone ?? null,
        countryCode: cart.buyerIdentity.countryCode ?? null,
        customer: cart.buyerIdentity.customerAccessToken
          ? { id: 'gid://shopify/Customer/fixture', email: cart.buyerIdentity.email ?? null }
          : null,
      },
      deliveryGroups:
        lines.length > 0 ? [deliveryGroupFor(cart.buyerIdentity.countryCode ?? null)] : [],
      warnings: [],
    };
  }
}

