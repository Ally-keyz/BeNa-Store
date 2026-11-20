import { useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { isApiError } from '@/api/errors';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/context/ThemeContext';
import { ConsentProvider } from '@/context/ConsentContext';
import { MarketProvider } from '@/context/MarketContext';
import { CartProvider } from '@/context/CartContext';

/**
 * Shared providers. Order matters: contexts that use toasts/queries sit inside
 * those providers. No Shopify token or session token is ever stored here.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isApiError(error)) {
            if (error.code === 'NOT_FOUND') return false;
            if (error.status >= 400 && error.status < 500 && error.code !== 'RATE_LIMITED') {
              return false;
            }
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ConsentProvider>
                <MarketProvider>
                  <CartProvider>{children}</CartProvider>
                </MarketProvider>
              </ConsentProvider>
            </ToastProvider>
          </QueryClientProvider>
        </HelmetProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
