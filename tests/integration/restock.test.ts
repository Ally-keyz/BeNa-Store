import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestContext, TEST_WEBHOOK_SECRET } from '../helpers/testContext';
import { signShopifyHmac } from '../../src/webhooks/verify';

const SHOP = 'bena-test.myshopify.com';
const COFFEE_HANDLE = 'rwanda-coffee-250g';

function deliverProductUpdate(app: Express, id: string, handle: string) {
  const raw = JSON.stringify({
    id: 55,
    handle,
    title: handle,
    updated_at: '2026-11-21T00:00:00Z',
  });
  return request(app)
    .post('/webhooks/shopify')
    .set('Content-Type', 'application/json')
    .set('X-Shopify-Topic', 'products/update')
    .set('X-Shopify-Webhook-Id', id)
    .set('X-Shopify-Shop-Domain', SHOP)
    .set('X-Shopify-Hmac-Sha256', signShopifyHmac(raw, TEST_WEBHOOK_SECRET))
    .send(raw);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('restock subscriptions', () => {
  it('registers a product-specific signup and deduplicates repeats', async () => {
    const { app } = buildTestContext();

    const first = await request(app).post('/api/v1/restock/subscribe').send({
      email: 'restock@example.com',
      productHandle: COFFEE_HANDLE,
      country: 'DE',
      language: 'EN',
      consent: true,
    });
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe('registered');
    expect(first.body.data.productHandle).toBe(COFFEE_HANDLE);
    expect(first.body.data.provider).toBe('mock');
    expect(first.body.data.simulated).toBe(true);

    const duplicate = await request(app).post('/api/v1/restock/subscribe').send({
      email: 'RESTOCK@example.com',
      productHandle: COFFEE_HANDLE.toUpperCase(),
      consent: true,
    });
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.data.status).toBe('already_registered');
  });

  it('rejects missing consent and invalid input', async () => {
    const { app } = buildTestContext();

    const noConsent = await request(app).post('/api/v1/restock/subscribe').send({
      email: 'restock@example.com',
      productHandle: COFFEE_HANDLE,
      consent: false,
    });
    expect(noConsent.status).toBe(400);
    expect(noConsent.body.error.code).toBe('BAD_REQUEST');

    const badEmail = await request(app).post('/api/v1/restock/subscribe').send({
      email: 'not-an-email',
      productHandle: COFFEE_HANDLE,
      consent: true,
    });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('sends a real restock email when the product-update webhook confirms availability', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { app, container, events } = buildTestContext({
      RESTOCK_PROVIDER: 'resend',
      RESTOCK_RESEND_API_KEY: 're_test_key',
      RESTOCK_FROM_EMAIL: 'BeNa Origins <hello@example.com>',
    });

    const signup = await request(app).post('/api/v1/restock/subscribe').send({
      email: 'restock@example.com',
      productHandle: COFFEE_HANDLE,
      language: 'EN',
      consent: true,
    });
    expect(signup.status).toBe(201);
    expect(await container.services.restock.pendingCount(COFFEE_HANDLE)).toBe(1);

    const webhook = await deliverProductUpdate(app, 'wh-restock-1', COFFEE_HANDLE);
    expect(webhook.status).toBe(200);

    await vi.waitFor(() => expect(events.length).toBeGreaterThanOrEqual(2), { timeout: 2000 });
    await vi.waitFor(
      async () => expect(await container.services.restock.pendingCount(COFFEE_HANDLE)).toBe(0),
      { timeout: 2000 },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_test_key' });
    const payload = JSON.parse(String(init.body)) as {
      to: string[];
      subject: string;
      text: string;
    };
    expect(payload.to).toEqual(['restock@example.com']);
    expect(payload.subject).toContain('Rwanda Coffee 250g');
    expect(payload.text).toContain('/products/rwanda-coffee-250g');
    expect(events.map((event) => event.name)).toContain('product.changed');
  });

  it('keeps signups pending for coming-soon products', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { app, container, events } = buildTestContext({
      RESTOCK_PROVIDER: 'resend',
      RESTOCK_RESEND_API_KEY: 're_test_key',
      RESTOCK_FROM_EMAIL: 'hello@example.com',
    });

    await request(app).post('/api/v1/restock/subscribe').send({
      email: 'wait@example.com',
      productHandle: 'coming-soon',
      consent: true,
    });
    await deliverProductUpdate(app, 'wh-restock-coming-soon', 'coming-soon');
    await vi.waitFor(() => expect(events.length).toBeGreaterThanOrEqual(2), { timeout: 2000 });

    expect(await container.services.restock.pendingCount('coming-soon')).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
