import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

describe('product reviews endpoint', () => {
  it('reports an honest not_configured state when no review feed is configured', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/reviews/product/rwanda-coffee-250g');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      handle: 'rwanda-coffee-250g',
      status: 'not_configured',
      source: null,
      reviews: [],
      summary: { count: 0, averageRating: null },
      simulated: true,
    });
    expect(response.body.data.message).toMatch(/No review feed is configured/);
    expect(response.body.data.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('keeps the honest empty state for another handle and accepts context/refresh query params', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get(
      '/api/v1/reviews/product/akabanga-chill-oil?country=de&language=en&refresh=true',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.handle).toBe('akabanga-chill-oil');
    expect(response.body.data.status).toBe('not_configured');
    expect(response.body.data.reviews).toEqual([]);
    expect(response.body.data.summary.averageRating).toBeNull();
  });

  it('rejects an invalid product handle', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/reviews/product/not%20a%20handle');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0].path).toBe('handle');
  });
});
