import { useQuery } from '@tanstack/react-query';
import { getPolicies, getShipping, type MarketParams } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';

/** Shop policies and legal-notice page maintained in the shop backend. */
export function usePolicies() {
  return useQuery({
    queryKey: queryKeys.policies,
    queryFn: async () => (await getPolicies()).data,
    staleTime: 5 * 60_000,
  });
}

/**
 * Backend shipping report. Pass `cartId` when a cart exists so real delivery
 * options can be shown; exact totals always stay with Shopify checkout.
 */
export function useShipping(params: MarketParams & { cartId?: string }) {
  return useQuery({
    queryKey: queryKeys.shipping(params),
    queryFn: async () => (await getShipping(params)).data,
    staleTime: 5 * 60_000,
  });
}
