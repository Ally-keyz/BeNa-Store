import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

describe('catalog facets endpoint', () => {
  it('derives facets from the fixture catalog with at least one brand and category', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/catalog/facets');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const facets = response.body.data;
    expect(facets.brands.length).toBeGreaterThan(0);
    expect(facets.brands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'bena-origins', label: 'Bena Origins', count: expect.any(Number) }),
      ]),
    );
    expect(facets.categories.length).toBeGreaterThan(0);
    expect(facets.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'food', label: 'Food', count: expect.any(Number) }),
      ]),
    );
    expect(facets.scannedProducts).toBeGreaterThan(0);
    expect(typeof facets.truncated).toBe('boolean');
    expect(facets.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts country/language context and a refresh flag', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get(
      '/api/v1/catalog/facets?country=de&language=en&refresh=true',
    );

    expect(response.status).toBe(200);
    expect(response.body.data.brands.length).toBeGreaterThan(0);
    expect(response.body.data.categories.length).toBeGreaterThan(0);
  });

  it('rejects an invalid country code', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/catalog/facets?country=deu');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0].path).toBe('country');
  });
});
