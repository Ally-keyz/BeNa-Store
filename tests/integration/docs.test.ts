import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

describe('OpenAPI docs', () => {
  it('serves Swagger UI and a JSON specification', async () => {
    const { app } = buildTestContext();
    const page = await request(app).get('/api/docs');
    expect(page.status).toBe(200);
    expect(page.text).toContain('SwaggerUIBundle');
    expect(page.text).toContain('/api/docs/openapi.json');

    const spec = await request(app).get('/api/docs/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.1.0');
    expect(spec.body.info.version).toBe('0.1.0');
  });

  it('documents every implemented endpoint and generates request bodies from Zod', async () => {
    const { app } = buildTestContext();
    const spec = (await request(app).get('/api/docs/openapi.json')).body;
    const requiredPaths = [
      '/api/v1/products',
      '/api/v1/products/{handle}',
      '/api/v1/collections',
      '/api/v1/collections/{handle}',
      '/api/v1/search',
      '/api/v1/search/suggestions',
      '/api/v1/cart',
      '/api/v1/cart/{cartId}',
      '/api/v1/cart/{cartId}/lines',
      '/api/v1/cart/{cartId}/buyer-identity',
      '/api/v1/cart/{cartId}/discount-codes',
      '/api/v1/localization',
      '/api/v1/shipping',
      '/api/v1/policies',
      '/api/v1/auth/login',
      '/api/v1/auth/callback',
      '/api/v1/auth/logout',
      '/api/v1/auth/session',
      '/api/v1/account/me',
      '/api/v1/account/orders',
      '/api/v1/account/addresses',
      '/api/v1/account/cart/associate',
      '/api/v1/newsletter/subscribe',
      '/api/v1/reviews/assessment',
      '/api/v1/audit/products',
      '/api/v1/audit/products/{handle}',
      '/api/v1/seo/product/{handle}',
      '/api/v1/seo/collection/{handle}',
      '/api/v1/seo/page/{handle}',
      '/api/v1/seo/sitemap',
      '/api/v1/seo/sitemap.xml',
      '/api/v1/seo/robots',
      '/api/v1/seo/robots.txt',
      '/health',
      '/health/ready',
      '/webhooks/shopify',
    ];
    for (const path of requiredPaths) {
      expect(spec.paths, `missing path ${path}`).toHaveProperty([path]);
    }
    expect(spec.components.schemas.CreateCartBody.properties.lines).toBeTruthy();
    expect(spec.components.schemas.NewsletterBody.properties.marketingConsent.type).toBe(
      'boolean',
    );
    expect(spec.components.schemas.ErrorEnvelope.required).toEqual(['success', 'error']);
  });
});
