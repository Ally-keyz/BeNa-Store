import { useQuery } from '@tanstack/react-query';
import { getAuthSession } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import type { AuthSessionStatus } from '@/types/auth';

/**
 * Customer session status. The backend feature flag is OFF by default, in
 * which case it returns `{ enabled: false, authenticated: false }` and the UI
 * simply shows guest checkout. No token is ever exposed to the browser.
 */
export function useSession() {
  const query = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async (): Promise<AuthSessionStatus> => (await getAuthSession()).data,
    retry: false,
    staleTime: 60_000,
  });

  return {
    session: query.data,
    isLoading: query.isLoading,
    enabled: query.data?.enabled ?? false,
    authenticated: query.data?.authenticated ?? false,
    customer: query.data?.customer ?? null,
    csrfToken: query.data?.csrfToken ?? null,
  };
}
