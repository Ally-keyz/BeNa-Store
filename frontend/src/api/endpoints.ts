import type {
  CollectionSummary,
  CustomerAddress,
  CustomerOrder,
  CustomerProfile,
  LocalizationInfo,
  NewsletterSubscriptionResult,
  PageMetadata,
  PolicyBundle,
  PredictiveSearchResults,
  Product,
  AISuggestion,
  Cart,
  RobotsData,
  SitemapData,
  CatalogFacets,
  ProductReviewsResult,
  WithdrawalResult,
  WithdrawalSubmission,
} from '@/types';
import type { AuthSessionStatus } from '@/types/auth';
import type { ShippingInfo } from '@/types/audit';
import type { ApiResult, RequestOptions } from './client';
import { apiRequest } from './client';

export interface MarketParams {
  country?: string;
  language?: string;
}

export interface PageParams extends MarketParams {
  first?: number;
  after?: string;
}

export interface ListProductsParams extends PageParams {
  query?: string;
  sortKey?: string;
  reverse?: boolean;
}

export interface ListCollectionsParams extends PageParams {
  query?: string;
  sortKey?: string;
  reverse?: boolean;
}

export interface CollectionProductsParams extends PageParams {
  sortKey?: string;
  reverse?: boolean;
}

export type CollectionDetailData = CollectionSummary & { products: Product[] };

const enc = encodeURIComponent;

// ----------------------------------------------------------------- catalog ---

export function getProducts(
  params: ListProductsParams,
  options?: Pick<RequestOptions, 'signal'>,
): Promise<ApiResult<Product[]>> {
  return apiRequest<Product[]>('/products', {
    query: {
      first: params.first ?? 20,
      after: params.after,
      query: params.query,
      sortKey: params.sortKey,
      reverse: params.reverse,
      country: params.country,
      language: params.language,
    },
    signal: options?.signal,
  });
}

export function getProduct(
  handle: string,
  params: MarketParams = {},
  options?: Pick<RequestOptions, 'signal'>,
): Promise<ApiResult<Product>> {
  return apiRequest<Product>(`/products/${enc(handle)}`, {
    query: { country: params.country, language: params.language },
    signal: options?.signal,
  });
}

export function getCollections(
  params: ListCollectionsParams,
  options?: Pick<RequestOptions, 'signal'>,
): Promise<ApiResult<CollectionSummary[]>> {
  return apiRequest<CollectionSummary[]>('/collections', {
    query: {
      first: params.first ?? 20,
      after: params.after,
      query: params.query,
      sortKey: params.sortKey,
      reverse: params.reverse,
      country: params.country,
      language: params.language,
    },
    signal: options?.signal,
  });
}

export function getCollection(
  handle: string,
  params: CollectionProductsParams = {},
  options?: Pick<RequestOptions, 'signal'>,
): Promise<ApiResult<CollectionDetailData>> {
  return apiRequest<CollectionDetailData>(`/collections/${enc(handle)}`, {
    query: {
      first: params.first ?? 20,
      after: params.after,
      sortKey: params.sortKey,
      reverse: params.reverse,
      country: params.country,
      language: params.language,
    },
    signal: options?.signal,
  });
}

export function searchProducts(
  query: string,
  params: PageParams = {},
  options?: Pick<RequestOptions, 'signal'>,
): Promise<ApiResult<{ query: string; products: Product[] }>> {
  return apiRequest<{ query: string; products: Product[] }>('/search', {
    query: {
      q: query,
      first: params.first ?? 20,
      after: params.after,
      country: params.country,
      language: params.language,
    },
    signal: options?.signal,
  });
}

export function getSearchSuggestions(
  query: string,
  params: MarketParams & { limit?: number },
  options?: Pick<RequestOptions, 'signal'>,
): Promise<ApiResult<PredictiveSearchResults>> {
  return apiRequest<PredictiveSearchResults>('/search/suggestions', {
    query: {
      q: query,
      limit: params.limit,
      country: params.country,
      language: params.language,
    },
    signal: options?.signal,
  });
}

// -------------------------------------------------------------------- cart ---

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
}

export interface CreateCartInput {
  lines?: CartLineInput[];
  buyerIdentity?: {
    email?: string;
    phone?: string;
    countryCode?: string;
  };
  discountCodes?: string[];
  country?: string;
  language?: string;
}

export function createCart(input: CreateCartInput): Promise<ApiResult<Cart>> {
  return apiRequest<Cart>('/cart', { method: 'POST', body: input });
}

export function getCart(cartId: string): Promise<ApiResult<Cart>> {
  return apiRequest<Cart>(`/cart/${enc(cartId)}`);
}

export function addCartLines(cartId: string, lines: CartLineInput[]): Promise<ApiResult<Cart>> {
  return apiRequest<Cart>(`/cart/${enc(cartId)}/lines`, {
    method: 'POST',
    body: { lines },
  });
}

export function updateCartLines(
  cartId: string,
  lines: Array<{ id: string; quantity: number }>,
): Promise<ApiResult<Cart>> {
  return apiRequest<Cart>(`/cart/${enc(cartId)}/lines`, {
    method: 'PATCH',
    body: { lines },
  });
}

export function removeCartLines(cartId: string, lineIds: string[]): Promise<ApiResult<Cart>> {
  return apiRequest<Cart>(`/cart/${enc(cartId)}/lines`, {
    method: 'DELETE',
    body: { lineIds },
  });
}

export function updateBuyerIdentity(
  cartId: string,
  buyerIdentity: { email?: string; phone?: string; countryCode?: string },
): Promise<ApiResult<Cart>> {
  return apiRequest<Cart>(`/cart/${enc(cartId)}/buyer-identity`, {
    method: 'PATCH',
    body: { buyerIdentity },
  });
}

export function updateDiscountCodes(cartId: string, discountCodes: string[]): Promise<ApiResult<Cart>> {
  return apiRequest<Cart>(`/cart/${enc(cartId)}/discount-codes`, {
    method: 'PATCH',
    body: { discountCodes },
  });
}

// ------------------------------------------------- localization / content ---

export function getLocalization(params: MarketParams = {}): Promise<ApiResult<LocalizationInfo>> {
  return apiRequest<LocalizationInfo>('/localization', {
    query: { country: params.country, language: params.language },
  });
}

export function getShipping(
  params: MarketParams & { cartId?: string } = {},
): Promise<ApiResult<ShippingInfo>> {
  return apiRequest<ShippingInfo>('/shipping', {
    query: { country: params.country, language: params.language, cartId: params.cartId },
  });
}

export function getPolicies(): Promise<ApiResult<PolicyBundle>> {
  return apiRequest<PolicyBundle>('/policies');
}

export function getCatalogFacets(
  params: MarketParams & { refresh?: boolean } = {},
  options?: Pick<RequestOptions, 'signal'>,
): Promise<ApiResult<CatalogFacets>> {
  return apiRequest<CatalogFacets>('/catalog/facets', {
    query: { country: params.country, language: params.language, refresh: params.refresh },
    signal: options?.signal,
  });
}

export function getProductReviews(
  handle: string,
  params: MarketParams & { refresh?: boolean } = {},
  options?: Pick<RequestOptions, 'signal'>,
): Promise<ApiResult<ProductReviewsResult>> {
  return apiRequest<ProductReviewsResult>(`/reviews/product/${enc(handle)}`, {
    query: { country: params.country, language: params.language, refresh: params.refresh },
    signal: options?.signal,
  });
}

export function submitWithdrawal(
  input: WithdrawalSubmission,
): Promise<ApiResult<WithdrawalResult>> {
  return apiRequest<WithdrawalResult>('/withdrawals', { method: 'POST', body: input });
}

export function subscribeNewsletter(input: {
  email: string;
  marketingConsent: boolean;
  source?: string;
  language?: string;
}): Promise<ApiResult<NewsletterSubscriptionResult>> {
  return apiRequest<NewsletterSubscriptionResult>('/newsletter/subscribe', {
    method: 'POST',
    body: input,
  });
}

// --------------------------------------------------------------------- seo ---

export function getSeoProduct(handle: string, params: MarketParams = {}): Promise<ApiResult<PageMetadata>> {
  return apiRequest<PageMetadata>(`/seo/product/${enc(handle)}`, {
    query: { country: params.country, language: params.language },
  });
}

export function getSeoCollection(
  handle: string,
  params: MarketParams = {},
): Promise<ApiResult<PageMetadata>> {
  return apiRequest<PageMetadata>(`/seo/collection/${enc(handle)}`, {
    query: { country: params.country, language: params.language },
  });
}

export function getSeoPage(handle: string): Promise<ApiResult<PageMetadata>> {
  return apiRequest<PageMetadata>(`/seo/page/${enc(handle)}`);
}

export function getSitemap(limit = 250): Promise<ApiResult<SitemapData>> {
  return apiRequest<SitemapData>('/seo/sitemap', { query: { limit } });
}

export function getRobots(): Promise<ApiResult<RobotsData>> {
  return apiRequest<RobotsData>('/seo/robots');
}

// ---------------------------------------------------------------------- ai ----

export interface AISuggestionParams extends MarketParams {
  refresh?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export function getAiSuggestions(
  handle: string,
  params: AISuggestionParams = {},
): Promise<ApiResult<AISuggestion>> {
  return apiRequest<AISuggestion>(`/ai/suggestions/${enc(handle)}`, { query: params });
}

// -------------------------------------------------------------------- auth ---

export function getAuthSession(): Promise<ApiResult<AuthSessionStatus>> {
  return apiRequest<AuthSessionStatus>('/auth/session', { credentials: 'include' });
}

export function postLogout(csrfToken: string): Promise<ApiResult<{ loggedOut: boolean; redirectUrl: string }>> {
  return apiRequest<{ loggedOut: boolean; redirectUrl: string }>('/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'x-csrf-token': csrfToken, Accept: 'application/json' },
  });
}

export function getAccountMe(): Promise<ApiResult<CustomerProfile>> {
  return apiRequest<CustomerProfile>('/account/me', { credentials: 'include' });
}

export function getAccountOrders(params: { first?: number; after?: string } = {}): Promise<
  ApiResult<CustomerOrder[]>
> {
  return apiRequest<CustomerOrder[]>('/account/orders', {
    credentials: 'include',
    query: { first: params.first ?? 20, after: params.after },
  });
}

export function getAccountAddresses(params: { first?: number; after?: string } = {}): Promise<
  ApiResult<CustomerAddress[]>
> {
  return apiRequest<CustomerAddress[]>('/account/addresses', {
    credentials: 'include',
    query: { first: params.first ?? 20, after: params.after },
  });
}

export function associateCart(cartId: string, csrfToken: string): Promise<ApiResult<Cart>> {
  return apiRequest<Cart>('/account/cart/associate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'x-csrf-token': csrfToken },
    body: { cartId },
  });
}

/** Absolute URL for the browser navigation that starts the OAuth flow. */
export { endpointUrl as buildAuthLoginUrl } from './client';
