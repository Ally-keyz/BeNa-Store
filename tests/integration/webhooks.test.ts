import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestContext, TEST_WEBHOOK_SECRET } from '../helpers/testContext';
import { signShopifyHmac } from '../../src/webhooks/verify';

const SHOP = 'bena-test.myshopify.com';

function deliver(
  app: Express,
  options: {
    topic: string;
    id: string;
    payload: unknown;
    secret?: string;
    rawBody?: string;
  },
) {
  const raw = options.rawBody ?? JSON.stringify(options.payload);
  return request(app)
    .post('/webhooks/shopify')
    .set('Content-Type', 'application/json')
    .set('X-Shopify-Topic', options.topic)
    .set('X-Shopify-Webhook-Id', options.id)
    .set('X-Shopify-Shop-Domain', SHOP)
    .set('X-Shopify-Hmac-Sha256', signShopifyHmac(raw, options.secret ?? TEST_WEBHOOK_SECRET))
    .send(raw);
}

describe('Shopify webhooks', () => {
  it('accepts a valid signed order webhook and emits an admin event asynchronously', async () => {
    const { app, events } = buildTestContext();
    const response = await deliver(app, {
      topic: 'orders/create',
      id: 'wh-order-1',
      payload: {
        id: 1001,
        name: '#1001',
        financial_status: 'paid',
        fulfillment_status: null,
        created_at: '2026-10-20T10:00:00Z',
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.received).toBe(true);
    expect(response.body.data.duplicate).toBe(false);

    await vi.waitFor(
      () => {
        const event = events.find((entry) => entry.name === 'order.created');
        expect(event).toBeTruthy();
        expect(event?.namespace).toBe('/admin');
        expect(event?.payload.orderId).toBe('1001');
      },
      { timeout: 2000 },
    );
  });

  it('rejects invalid signatures with 401', async () => {
    const { app, events } = buildTestContext();
    const response = await deliver(app, {
      topic: 'orders/create',
      id: 'wh-bad-signature',
      payload: { id: 1 },
      secret: 'wrong-secret',
    });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(events).toHaveLength(0);
  });

  it('deduplicates by X-Shopify-Webhook-Id', async () => {
    const { app, events } = buildTestContext();
    const payload = { id: 2002, name: '#2002' };
    const first = await deliver(app, { topic: 'orders/updated', id: 'wh-duplicate-1', payload });
    expect(first.status).toBe(200);
    expect(first.body.data.duplicate).toBe(false);

    await vi.waitFor(() => expect(events.length).toBe(1), { timeout: 2000 });

    const second = await deliver(app, { topic: 'orders/updated', id: 'wh-duplicate-1', payload });
    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);
    expect(second.body.data.handled).toBe(false);
    expect(events.length).toBe(1);
  });

  it('handles product events for both admin and public audiences', async () => {
    const { app, events } = buildTestContext();
    const response = await deliver(app, {
      topic: 'products/update',
      id: 'wh-product-1',
      payload: { id: 55, handle: 'rwanda-coffee-250g', title: 'Rwanda Coffee 250g' },
    });
    expect(response.status).toBe(200);

    await vi.waitFor(
      () => {
        expect(events.map((event) => event.name)).toEqual(
          expect.arrayContaining(['product.updated', 'product.changed']),
        );
      },
      { timeout: 2000 },
    );
    const publicEvent = events.find((event) => event.name === 'product.changed');
    expect(publicEvent?.namespace).toBe('/storefront');
    expect(publicEvent?.payload).toEqual({
      productId: '55',
      handle: 'rwanda-coffee-250g',
      updatedAt: null,
    });
  });

  it('handles fulfillments/create and inventory_levels/update', async () => {
    const { app, events } = buildTestContext();
    await deliver(app, {
      topic: 'fulfillments/create',
      id: 'wh-fulfillment-1',
      payload: { id: 9, order_id: 3003, status: 'success' },
    });
    await deliver(app, {
      topic: 'inventory_levels/update',
      id: 'wh-inventory-1',
      payload: { inventory_item_id: 77, location_id: 88, available: 4 },
    });

    await vi.waitFor(
      () => {
        expect(events.find((event) => event.name === 'order.fulfilled')?.payload.orderId).toBe(
          '3003',
        );
        const inventory = events.find((event) => event.name === 'inventory.level_changed');
        expect(inventory?.payload.available).toBe(4);
        expect(inventory?.payload.inventoryItemId).toBe('77');
      },
      { timeout: 2000 },
    );
  });

  it('acknowledges unsupported topics without processing', async () => {
    const { app, events } = buildTestContext();
    const response = await deliver(app, {
      topic: 'customers/create',
      id: 'wh-unsupported-1',
      payload: { id: 1 },
    });
    expect(response.status).toBe(200);
    expect(response.body.data.handled).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('rejects invalid JSON with a clear error', async () => {
    const { app } = buildTestContext();
    const response = await deliver(app, {
      topic: 'orders/create',
      id: 'wh-invalid-json',
      payload: null,
      rawBody: '{not-json',
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 503 when the webhook secret is not configured', async () => {
    const { app } = buildTestContext({ SHOPIFY_WEBHOOK_SECRET: '' });
    const response = await deliver(app, {
      topic: 'orders/create',
      id: 'wh-no-secret',
      payload: { id: 1 },
    });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('NOT_CONFIGURED');
  });
});
