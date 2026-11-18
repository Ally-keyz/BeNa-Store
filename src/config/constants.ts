/** Constants that encode audit policy. Keep business thresholds here. */
export const APP_VERSION = '0.1.0';

export const AUDIT_ISSUE_WEIGHTS = {
  critical: 30,
  high: 15,
  medium: 7,
  low: 2,
  info: 0,
} as const;

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_CART_LINES = 100;
export const MAX_LINE_QUANTITY = 100;

/** Shopify Storefront API fields that require a token (private/public). */
export const METAFIELD_NAMESPACE_FALLBACKS = ['custom', 'food', 'bena', 'specs'] as const;

export const STOREFRONT_SCOPES = [
  'unauthenticated_read_product_listings',
  'unauthenticated_read_product_inventory',
  'unauthenticated_read_product_tags',
  'unauthenticated_read_content',
  'unauthenticated_read_checkouts',
  'unauthenticated_write_checkouts',
] as const;

export const WEBHOOK_TOPICS_SUPPORTED = [
  'orders/create',
  'orders/updated',
  'orders/fulfilled',
  'fulfillments/create',
  'products/update',
  'inventory_levels/update',
  'app/uninstalled',
] as const;

export type WebhookTopic = (typeof WEBHOOK_TOPICS_SUPPORTED)[number];
