/**
 * Central TanStack Query key factory. Keys are hierarchical so related
 * queries can be invalidated together (e.g. all product detail queries after
 * a `product.changed` socket hint).
 */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (params: object) => ['products', 'list', params] as const,
    infinite: (params: object) => ['products', 'infinite', params] as const,
    detail: (handle: string, market: object = {}) =>
      ['products', 'detail', handle, market] as const,
  },
  collections: {
    all: ['collections'] as const,
    list: (params: object) => ['collections', 'list', params] as const,
    detail: (handle: string, params: object = {}) =>
      ['collections', 'detail', handle, params] as const,
    infiniteProducts: (handle: string, params: object = {}) =>
      ['collections', 'detail', handle, 'infinite', params] as const,
  },
  search: {
    all: ['search'] as const,
    results: (query: string, params: object = {}) =>
      ['search', 'results', query, params] as const,
    infinite: (query: string, params: object = {}) =>
      ['search', 'infinite', query, params] as const,
    suggestions: (query: string, params: object = {}) =>
      ['search', 'suggestions', query, params] as const,
  },
  cart: {
    all: ['cart'] as const,
    detail: (cartId: string | null) => ['cart', cartId] as const,
  },
  localization: (params: object = {}) => ['localization', params] as const,
  facets: (params: object = {}) => ['catalog', 'facets', params] as const,
  reviews: {
    product: (handle: string, params: object = {}) =>
      ['reviews', 'product', handle, params] as const,
  },
  policies: ['policies'] as const,
  shipping: (params: object = {}) => ['shipping', params] as const,
  seo: {
    product: (handle: string) => ['seo', 'product', handle] as const,
    collection: (handle: string) => ['seo', 'collection', handle] as const,
    page: (handle: string) => ['seo', 'page', handle] as const,
    sitemap: ['seo', 'sitemap'] as const,
    robots: ['seo', 'robots'] as const,
  },
  auth: {
    session: ['auth', 'session'] as const,
  },
  account: {
    me: ['account', 'me'] as const,
    orders: (params: object = {}) => ['account', 'orders', params] as const,
    addresses: (params: object = {}) => ['account', 'addresses', params] as const,
  },
} as const;
