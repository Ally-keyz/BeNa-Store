import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getAccountAddresses, getAccountMe, getAccountOrders } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';

/** Read-only customer account queries. All are gated by a valid session. */
export function useAccountMe(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.account.me,
    queryFn: async () => (await getAccountMe()).data,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

/** Cursor-paginated order history. */
export function useInfiniteAccountOrders(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.account.orders({ infinite: true }),
    queryFn: async ({ pageParam }) => {
      const result = await getAccountOrders({ first: 20, after: pageParam });
      return {
        items: result.data,
        hasNextPage: result.meta.pagination?.hasNextPage ?? false,
        endCursor: result.meta.pagination?.endCursor ?? null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.endCursor ?? undefined : undefined,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

/** Cursor-paginated saved addresses. */
export function useInfiniteAccountAddresses(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: queryKeys.account.addresses({ infinite: true }),
    queryFn: async ({ pageParam }) => {
      const result = await getAccountAddresses({ first: 20, after: pageParam });
      return {
        items: result.data,
        hasNextPage: result.meta.pagination?.hasNextPage ?? false,
        endCursor: result.meta.pagination?.endCursor ?? null,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage ? lastPage.endCursor ?? undefined : undefined,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}
