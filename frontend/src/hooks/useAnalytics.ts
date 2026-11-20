import { useCallback } from 'react';
import { useConsent } from '@/context/ConsentContext';
import { trackEvent } from '@/lib/analytics';

export type AnalyticsTrack = (
  name: string,
  properties?: Record<string, string | number | boolean | null>,
) => void;

/** Returns a no-op track function until the shopper accepts analytics. */
export function useAnalytics(): AnalyticsTrack {
  const { analytics } = useConsent();
  return useCallback(
    (name, properties = {}) => {
      if (analytics) trackEvent(name, properties);
    },
    [analytics],
  );
}
