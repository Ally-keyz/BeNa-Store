import { useQuery } from '@tanstack/react-query';
import {
  getCollection,
  getCollections,
  getProduct,
  getProducts,
  getSearchSuggestions,
  searchProducts,
  type CollectionProductsParams,
  type CollectionDetailData,
  type ListCollectionsParams,
  type ListProductsParams,
  type MarketParams,
  type PageParams,
} from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import type { CollectionSummary, Product } from '@/types';

export interface PagedResult<T> {
  items: T[];
  hasNextPage: boolean;
  endCursor: string | null;
}

export function useProducts(params: ListProductsParams) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async ({ signal }): Promise<PagedResult<Product>> => {
      const result = await getProducts(params, { signal });
      return {
        items: result.data,
        hasNextPage: result.meta.pagination?.hasNextPage ?? false,
        endCursor: result.meta.pagination?.endCursor ?? null,
      };
    },
    staleTime: 60_000,
  });
}

export function useProduct(handle: string, market: MarketParams) {
  return useQuery({
    queryKey: queryKeys.products.detail(handle, market),
    queryFn: async ({ signal }): Promise<Product> => {
      const result = await getProduct(handle, market, { signal });
      return result.data;
    },
    staleTime: 60_000,
    enabled: Boolean(handle),
  });
}

export function useCollections(params: ListCollectionsParams) {
  return useQuery({
    queryKey: queryKeys.collections.list(params),
    queryFn: async ({ signal }): Promise<PagedResult<CollectionSummary>> => {
      const result = await getCollections(params, { signal });
      return {
        items: result.data,
        hasNextPage: result.meta.pagination?.hasNextPage ?? false,
        endCursor: result.meta.pagination?.endCursor ?? null,
      };
    },
    staleTime: 5 * 60_000,
  });
}

export function useCollection(handle: string, params: CollectionProductsParams) {
  return useQuery({
    queryKey: queryKeys.collections.detail(handle, params),
    queryFn: async ({ signal }): Promise<{ collection: CollectionDetailData; endCursor: string | null; hasNextPage: boolean }> => {
      const result = await getCollection(handle, params, { signal });
      return {
        collection: result.data,
        endCursor: result.meta.pagination?.endCursor ?? null,
        hasNextPage: result.meta.pagination?.hasNextPage ?? false,
      };
    },
    staleTime: 60_000,
    enabled: Boolean(handle),
  });
}

export function useSearch(query: string, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.search.results(query, params),
    queryFn: async ({ signal }): Promise<PagedResult<Product>> => {
      const result = await searchProducts(query, params, { signal });
      return {
        items: result.data.products,
        hasNextPage: result.meta.pagination?.hasNextPage ?? false,
        endCursor: result.meta.pagination?.endCursor ?? null,
      };
    },
    staleTime: 30_000,
    enabled: query.trim().length > 0,
  });
}

export function useSearchSuggestions(query: string, market: MarketParams) {
  return useQuery({
    queryKey: queryKeys.search.suggestions(query, market),
    queryFn: async ({ signal }) => {
      const result = await getSearchSuggestions(query, { ...market, limit: 6 }, { signal });
      return result.data;
    },
    staleTime: 60_000,
    enabled: query.trim().length >= 2,
  });
}
