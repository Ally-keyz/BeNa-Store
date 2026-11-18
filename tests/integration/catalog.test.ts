import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

describe('catalog endpoints', () => {
  it('lists products with cursor pagination metadata', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/products?first=3');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(3);
    expect(response.body.data[0]).toHaveProperty('handle');
    expect(response.body.data[0]).toHaveProperty('metafields');
    expect(response.body.meta.pagination).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(response.body.meta.pagination.endCursor).toBeTruthy();
  });

  it('returns product details by handle with variants, images and metafields', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/products/rwanda-coffee-250g');
    expect(response.status).toBe(200);
    const product = response.body.data;
    expect(product.handle).toBe('rwanda-coffee-250g');
    expect(product.variants[0].unitPrice.amount).toBe('60.00');
    expect(product.variants[0].unitPriceMeasurement.referenceUnit).toBe('KG');
    expect(product.metafields.nutrition.value).toContain('Energy');
    expect(product.images).toHaveLength(4);
    expect(product.url).toBe('https://benaorigins.de/products/rwanda-coffee-250g');
  });

  it('returns 404 for an unknown product handle', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/products/not-a-real-product');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('lists collections and returns collection detail with paginated products', async () => {
    const { app } = buildTestContext();
    const list = await request(app).get('/api/v1/collections');
    expect(list.status).toBe(200);
    expect(list.body.data.map((entry: { handle: string }) => entry.handle)).toEqual(
      expect.arrayContaining(['coffee', 'food', 'crafts']),
    );

    const detail = await request(app).get('/api/v1/collections/crafts?first=10');
    expect(detail.status).toBe(200);
    expect(detail.body.data.handle).toBe('crafts');
    expect(detail.body.data.products).toHaveLength(2);
    expect(detail.body.meta.pagination.hasNextPage).toBe(false);
  });

  it('searches products and returns predictive suggestions', async () => {
    const { app } = buildTestContext();
    const search = await request(app).get('/api/v1/search?q=coffee');
    expect(search.status).toBe(200);
    expect(search.body.data.query).toBe('coffee');
    expect(search.body.data.products).toHaveLength(1);
    expect(search.body.data.products[0].handle).toBe('rwanda-coffee-250g');

    const suggestions = await request(app).get('/api/v1/search/suggestions?q=cof&limit=5');
    expect(suggestions.status).toBe(200);
    expect(suggestions.body.data.products.length).toBeGreaterThan(0);
    expect(suggestions.body.data.queries.length).toBeGreaterThan(0);
  });

  it('validates query params through Zod', async () => {
    const { app } = buildTestContext();
    const tooLarge = await request(app).get('/api/v1/products?first=999');
    expect(tooLarge.status).toBe(400);
    expect(tooLarge.body.error.code).toBe('VALIDATION_ERROR');
    expect(tooLarge.body.error.details[0].path).toBe('first');

    const missingQuery = await request(app).get('/api/v1/search');
    expect(missingQuery.status).toBe(400);
    expect(missingQuery.body.error.details[0].path).toBe('q');
  });

  it('accepts lowercase country/language context', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get(
      '/api/v1/products/rwanda-coffee-250g?country=de&language=de',
    );
    expect(response.status).toBe(200);
    expect(response.body.data.handle).toBe('rwanda-coffee-250g');
  });

  it('enforces the strict CORS allow-list', async () => {
    const { app } = buildTestContext();
    const allowed = await request(app)
      .get('/api/v1/products?first=1')
      .set('Origin', 'http://localhost:5173');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const blocked = await request(app)
      .get('/api/v1/products?first=1')
      .set('Origin', 'https://evil.example');
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('FORBIDDEN');
  });
});
