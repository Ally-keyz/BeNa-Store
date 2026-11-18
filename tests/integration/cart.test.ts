import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext, COFFEE_VARIANT } from '../helpers/testContext';
import type { Cart } from '../../src/types/domain';

async function createCart(
  app: import('express').Express,
  overrides: Record<string, unknown> = {},
): Promise<Cart> {
  const response = await request(app)
    .post('/api/v1/cart')
    .send({ lines: [{ merchandiseId: COFFEE_VARIANT, quantity: 2 }], ...overrides });
  expect(response.status).toBe(201);
  return response.body.data as Cart;
}

describe('cart & checkoutUrl flow', () => {
  it('creates a cart that exposes the Shopify-hosted checkout URL', async () => {
    const { app } = buildTestContext();
    const cart = await createCart(app);
    expect(cart.id).toMatch(/^gid:\/\/shopify\/Cart\//);
    expect(cart.totalQuantity).toBe(2);
    expect(cart.checkoutUrl).toMatch(/\/checkout\//);
    expect(cart.checkout.hostedBy).toBe('shopify');
    expect(cart.checkout.url).toBe(cart.checkoutUrl);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]!.merchandise?.product.handle).toBe('rwanda-coffee-250g');
    expect(cart.cost.subtotalAmount?.amount).toBe('30.00');
  });

  it('supports the full line + buyer identity + discount lifecycle', async () => {
    const { app } = buildTestContext();
    const cart = await createCart(app, {
      buyerIdentity: { email: 'buyer@example.com', countryCode: 'de' },
    });
    expect(cart.buyerIdentity.email).toBe('buyer@example.com');
    expect(cart.buyerIdentity.countryCode).toBe('DE');

    const add = await request(app)
      .post(`/api/v1/cart/${encodeURIComponent(cart.id)}/lines`)
      .send({ lines: [{ merchandiseId: 'gid://shopify/ProductVariant/akarabo-biscuits-default', quantity: 1 }] });
    expect(add.status).toBe(200);
    expect(add.body.data.totalQuantity).toBe(3);
    expect(add.body.data.lines).toHaveLength(2);

    const lineId = add.body.data.lines[0].id as string;
    const update = await request(app)
      .patch(`/api/v1/cart/${encodeURIComponent(cart.id)}/lines`)
      .send({ lines: [{ id: lineId, quantity: 1 }] });
    expect(update.status).toBe(200);
    expect(update.body.data.totalQuantity).toBe(2);

    const discounts = await request(app)
      .patch(`/api/v1/cart/${encodeURIComponent(cart.id)}/discount-codes`)
      .send({ discountCodes: ['BENA10', 'NOPE'] });
    expect(discounts.status).toBe(200);
    expect(discounts.body.data.discountCodes).toEqual([
      { code: 'BENA10', applicable: true },
      { code: 'NOPE', applicable: false },
    ]);

    const identity = await request(app)
      .patch(`/api/v1/cart/${encodeURIComponent(cart.id)}/buyer-identity`)
      .send({ buyerIdentity: { countryCode: 'AT' } });
    expect(identity.status).toBe(200);
    expect(identity.body.data.buyerIdentity.countryCode).toBe('AT');
    expect(identity.body.data.buyerIdentity.email).toBe('buyer@example.com');

    const remove = await request(app)
      .delete(`/api/v1/cart/${encodeURIComponent(cart.id)}/lines`)
      .send({ lineIds: [lineId] });
    expect(remove.status).toBe(200);
    expect(remove.body.data.lines).toHaveLength(1);
  });

  it('returns an existing cart and 404 for an unknown cart', async () => {
    const { app } = buildTestContext();
    const cart = await createCart(app);
    const fetched = await request(app).get(`/api/v1/cart/${encodeURIComponent(cart.id)}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.id).toBe(cart.id);

    const missing = await request(app).get(
      '/api/v1/cart/gid%3A%2F%2Fshopify%2FCart%2Fdoes-not-exist',
    );
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects malformed cart ids and bodies with validation errors', async () => {
    const { app } = buildTestContext();
    const badId = await request(app).get('/api/v1/cart/not-a-gid');
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe('VALIDATION_ERROR');

    const badJson = await request(app)
      .post('/api/v1/cart')
      .set('Content-Type', 'application/json')
      .send('{"lines": [}');
    expect(badJson.status).toBe(400);
    expect(badJson.body.error.code).toBe('BAD_REQUEST');

    const badBody = await request(app)
      .post('/api/v1/cart')
      .send({ lines: [{ merchandiseId: 'not-a-variant', quantity: 0 }] });
    expect(badBody.status).toBe(400);
    expect(badBody.body.error.details.length).toBeGreaterThan(0);

    const unknownVariant = await request(app)
      .post('/api/v1/cart')
      .send({
        lines: [{ merchandiseId: 'gid://shopify/ProductVariant/missing-default', quantity: 1 }],
      });
    expect(unknownVariant.status).toBe(404);
  });
});
