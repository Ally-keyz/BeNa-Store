import type { Logger } from 'pino';
import type { RealtimePublisher } from '../sockets/publisher';
import type { RestockNotificationResult } from '../types/domain';
import {
  appUninstalledWebhookSchema,
  fulfillmentsWebhookSchema,
  inventoryLevelWebhookSchema,
  ordersWebhookSchema,
  productsWebhookSchema,
} from '../schemas/webhooks';

export interface WebhookProcessContext {
  topic: string;
  shopDomain: string;
  webhookId: string;
  publisher: RealtimePublisher;
  logger: Logger;
  restockService?: {
    notifyIfRestocked(productHandle: string): Promise<RestockNotificationResult | null>;
  };
}

export interface WebhookProcessResult {
  handled: boolean;
  events: string[];
}

/**
 * Payloads are validated with Zod before anything is emitted. Handlers never
 * mutate Shopify data; they only notify connected clients to re-fetch.
 */
export async function processWebhook(
  payload: unknown,
  ctx: WebhookProcessContext,
): Promise<WebhookProcessResult> {
  const topic = ctx.topic.toLowerCase();

  switch (topic) {
    case 'orders/create': {
      const order = ordersWebhookSchema.parse(payload);
      await ctx.publisher.publish({
        name: 'order.created',
        namespace: '/admin',
        payload: {
          orderId: String(order.id),
          orderName: order.name ?? null,
          financialStatus: order.financial_status ?? null,
          fulfillmentStatus: order.fulfillment_status ?? null,
          createdAt: order.created_at ?? null,
        },
      });
      return { handled: true, events: ['order.created'] };
    }

    case 'orders/updated': {
      const order = ordersWebhookSchema.parse(payload);
      await ctx.publisher.publish({
        name: 'order.updated',
        namespace: '/admin',
        payload: {
          orderId: String(order.id),
          orderName: order.name ?? null,
          financialStatus: order.financial_status ?? null,
          fulfillmentStatus: order.fulfillment_status ?? null,
          updatedAt: order.updated_at ?? null,
        },
      });
      return { handled: true, events: ['order.updated'] };
    }

    case 'orders/fulfilled': {
      const order = ordersWebhookSchema.parse(payload);
      await ctx.publisher.publish({
        name: 'order.fulfilled',
        namespace: '/admin',
        payload: {
          orderId: String(order.id),
          orderName: order.name ?? null,
          fulfillmentStatus: order.fulfillment_status ?? 'fulfilled',
          updatedAt: order.updated_at ?? null,
        },
      });
      return { handled: true, events: ['order.fulfilled'] };
    }

    case 'fulfillments/create': {
      const fulfillment = fulfillmentsWebhookSchema.parse(payload);
      await ctx.publisher.publish({
        name: 'order.fulfilled',
        namespace: '/admin',
        payload: {
          orderId: String(fulfillment.order_id),
          orderName: null,
          fulfillmentStatus: fulfillment.status ?? 'success',
          updatedAt: fulfillment.updated_at ?? fulfillment.created_at ?? null,
        },
      });
      return { handled: true, events: ['order.fulfilled'] };
    }

    case 'products/update': {
      const product = productsWebhookSchema.parse(payload);
      await ctx.publisher.publish({
        name: 'product.updated',
        namespace: '/admin',
        payload: {
          productId: String(product.id),
          handle: product.handle,
          title: product.title ?? null,
          updatedAt: product.updated_at ?? null,
        },
      });
      // Public event carries no price/inventory data — clients re-fetch REST.
      await ctx.publisher.publish({
        name: 'product.changed',
        namespace: '/storefront',
        payload: {
          productId: String(product.id),
          handle: product.handle,
          updatedAt: product.updated_at ?? null,
        },
      });

      const events = ['product.updated', 'product.changed'];
      if (ctx.restockService) {
        try {
          const restock = await ctx.restockService.notifyIfRestocked(product.handle);
          if (restock && restock.notified > 0) events.push('restock.notified');
        } catch (error) {
          ctx.logger.error(
            { handle: product.handle, err: error instanceof Error ? { message: error.message } : error },
            'restock notification check failed',
          );
        }
      }
      return { handled: true, events };
    }

    case 'inventory_levels/update': {
      const level = inventoryLevelWebhookSchema.parse(payload);
      await ctx.publisher.publish({
        name: 'inventory.level_changed',
        namespace: '/admin',
        payload: {
          inventoryItemId: String(level.inventory_item_id),
          locationId: String(level.location_id),
          available: level.available,
          updatedAt: level.updated_at ?? null,
        },
      });
      return { handled: true, events: ['inventory.level_changed'] };
    }

    case 'app/uninstalled': {
      const app = appUninstalledWebhookSchema.parse(payload);
      await ctx.publisher.publish({
        name: 'app.uninstalled',
        namespace: '/admin',
        payload: {
          shopDomain: app.domain ?? ctx.shopDomain,
          occurredAt: new Date().toISOString(),
        },
      });
      return { handled: true, events: ['app.uninstalled'] };
    }

    default:
      ctx.logger.info({ topic }, 'webhook topic not handled; acknowledged');
      return { handled: false, events: [] };
  }
}
