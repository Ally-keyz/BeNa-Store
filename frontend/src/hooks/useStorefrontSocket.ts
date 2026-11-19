import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { queryKeys } from '@/api/queryKeys';
import { env } from '@/config';

interface ProductChangedEvent {
  handle?: string;
  productId?: string;
}

/**
 * Public `/storefront` socket listener. Socket events are hints only: they
 * invalidate REST queries, which then refetch from the backend. No admin
 * namespace is joined and no socket payload is rendered as product data.
 */
export function useStorefrontSocket(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(env.socketUrl || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 8_000,
    });

    const invalidate = (event: ProductChangedEvent) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      if (event.handle) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(event.handle) });
      }
    };

    socket.on('product.changed', invalidate);
    socket.on('connect_error', () => {
      // Offline/socket-unavailable is non-fatal; REST remains the source.
    });

    return () => {
      socket.off('product.changed', invalidate);
      socket.disconnect();
    };
  }, [queryClient]);
}
