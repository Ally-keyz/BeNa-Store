import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
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
 *
 * The client library is imported lazily so socket.io-client is not part of the
 * initial storefront download.
 */
export function useStorefrontSocket(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let disposed = false;
    let socket: Socket | undefined;

    const invalidate = (event: ProductChangedEvent) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      if (event.handle) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(event.handle) });
      }
    };

    void import('socket.io-client').then(({ io }) => {
      if (disposed) return;
      socket = io(env.socketUrl || undefined, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 8_000,
      });
      socket.on('product.changed', invalidate);
      socket.on('connect_error', () => {
        // Offline/socket-unavailable is non-fatal; REST remains the source.
      });
    });

    return () => {
      disposed = true;
      if (socket) {
        socket.off('product.changed', invalidate);
        socket.disconnect();
      }
    };
  }, [queryClient]);
}
