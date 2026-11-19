/**
 * Central TanStack Query key factory. Keys are hierarchical so related
 * queries can be invalidated together (e.g. all product detail queries after
 * a `product.changed` socket hint).
 */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (params: Record<string, unknown>) => ['products', 'list', params] as const,
    detail: (handle: string, market: Record<string, unknown> = {}) =>
      ['products', 'detail', handle, market] as const,
  },
  collections: {
    all: ['collections'] as const,
    list: (params: Record<string, unknown>) => ['collections', 'list', params] as const,
    detail: (handle: string, params: Record<string, unknown> = {}) =>
      ['collections', 'detail', handle, params] as const,
  },
  search: {
    all: ['search'] as const,
    results: (query: string, params: Record<string, unknown> = {}) =>
      ['search', 'results', query, params] as const,
    suggestions: (query: string, params: Record<string, unknown> = {}) =>
      ['search', 'suggestions', query, params] as const,
  },
  cart: {
    all: ['cart'] as const,
    detail: (cartId: string | null) => ['cart', cartId] as const,
  },
  localization: (params: Record<string, unknown> = {}) => ['localization', params] as const,
  policies: ['policies'] as const,
  shipping: (params: Record<string, unknown> = {}) => ['shipping', params] as const,
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
    orders: (params: Record<string, unknown> = {}) => ['account', 'orders', params] as const,
    addresses: (params: Record<string, unknown> = {}) => ['account', 'addresses', params] as const,
  },
} as const;
