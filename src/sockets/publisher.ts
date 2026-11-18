/** Realtime event contract shared by webhook handlers and Socket.IO. */

export type RealtimeNamespace = '/admin' | '/storefront';

export interface RealtimeEvent {
  name: string;
  namespace: RealtimeNamespace;
  /** Socket.IO rooms. Omit to broadcast within the namespace. */
  rooms?: string[];
  payload: Record<string, unknown>;
}

export interface RealtimePublisher {
  publish(event: RealtimeEvent): void | Promise<void>;
}

export const noopPublisher: RealtimePublisher = {
  publish: () => undefined,
};

/**
 * Documented Socket.IO event registry (also rendered in docs/socket-events.md).
 * Public namespace events must never contain PII, exact inventory, prices,
 * payment or order data.
 */
export const SOCKET_EVENT_REGISTRY = [
  {
    name: 'order.created',
    namespace: '/admin',
    audience: 'store administrators (JWT required)',
    emitter: 'Shopify webhook orders/create',
    payload: '{ orderId, orderName, financialStatus, fulfillmentStatus, createdAt }',
  },
  {
    name: 'order.updated',
    namespace: '/admin',
    audience: 'store administrators (JWT required)',
    emitter: 'Shopify webhook orders/updated',
    payload: '{ orderId, orderName, financialStatus, fulfillmentStatus, updatedAt }',
  },
  {
    name: 'order.fulfilled',
    namespace: '/admin',
    audience: 'store administrators (JWT required)',
    emitter: 'Shopify webhook orders/fulfilled or fulfillments/create',
    payload: '{ orderId, orderName, fulfillmentStatus, updatedAt }',
  },
  {
    name: 'inventory.level_changed',
    namespace: '/admin',
    audience: 'store administrators (JWT required)',
    emitter: 'Shopify webhook inventory_levels/update',
    payload: '{ inventoryItemId, locationId, available, updatedAt }',
  },
  {
    name: 'product.updated',
    namespace: '/admin',
    audience: 'store administrators (JWT required)',
    emitter: 'Shopify webhook products/update',
    payload: '{ productId, handle, title, updatedAt }',
  },
  {
    name: 'app.uninstalled',
    namespace: '/admin',
    audience: 'store administrators (JWT required)',
    emitter: 'Shopify webhook app/uninstalled',
    payload: '{ shopDomain, occurredAt }',
  },
  {
    name: 'product.changed',
    namespace: '/storefront',
    audience: 'public storefront clients (no sensitive data)',
    emitter: 'Shopify webhook products/update',
    payload: '{ productId, handle, updatedAt } — clients must re-fetch authoritative data via REST',
  },
  {
    name: 'connection.ready',
    namespace: '/storefront',
    audience: 'public storefront clients',
    emitter: 'Socket.IO server on successful connection',
    payload: '{ socketId, serverTime }',
  },
] as const;
