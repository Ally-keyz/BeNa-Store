import { describe, expect, it } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import {
  buildTestContext,
  TEST_ADMIN_JWT_SECRET,
  TEST_ADMIN_KEY,
} from '../helpers/testContext';

describe('product information completeness', () => {
  it('produces a bulk catalog report with scores, duplicate detection and audit references', async () => {
    const { app } = buildTestContext({ ADMIN_API_TOKEN: TEST_ADMIN_KEY });
    const response = await request(app)
      .get('/api/v1/audit/products?limit=50')
      .set('x-admin-key', TEST_ADMIN_KEY);
    expect(response.status).toBe(200);
    const report = response.body.data;

    expect(report.dataSource).toBe('fixture');
    expect(report.summary.products).toBe(7);
    expect(report.scanLimitReached).toBe(false);
    expect(report.meta).toBeUndefined();

    const codes = report.products.flatMap((product: { issues: Array<{ code: string }> }) =>
      product.issues.map((issue) => issue.code),
    );
    expect(codes).toContain('COMING_SOON_CONTRADICTION');
    expect(codes).toContain('GENERIC_HANDLE');
    expect(codes).toContain('DUPLICATE_TITLE');
    expect(codes).toContain('PREPARATION_AMBIGUOUS');
    expect(codes).toContain('COMPARE_AT_INVALID');
    expect(codes).toContain('MISSING_UNIT_PRICE');
    expect(codes).toContain('ALLERGENS_NOT_EMPHASIZED');
    expect(codes).toContain('SALE_PRICE_VERIFICATION_REQUIRED');

    expect(report.catalogIssues.some((issue: { code: string }) => issue.code === 'DUPLICATE_TITLE_GROUP')).toBe(true);
    expect(report.summary.averageScore).toBeGreaterThan(0);
    expect(report.summary.averageScore).toBeLessThan(100);
    expect(response.body.meta.extra.readOnly).toBe(true);
    expect(response.body.meta.warnings.join(' ')).toMatch(/FIXTURE MODE/);

    const coffee = report.products.find(
      (product: { handle: string }) => product.handle === 'rwanda-coffee-250g',
    );
    const basket = report.products.find(
      (product: { handle: string }) => product.handle === 'coming-soon',
    );
    expect(coffee.score).toBeGreaterThan(basket.score);
    expect(coffee.grade).toBe('A');
  });

  it('reports a single product and caches the catalog report', async () => {
    const { app } = buildTestContext({ ADMIN_API_TOKEN: TEST_ADMIN_KEY });
    const single = await request(app)
      .get('/api/v1/audit/products/agashya-juice-syrup')
      .set('x-admin-key', TEST_ADMIN_KEY);
    expect(single.status).toBe(200);
    expect(single.body.data.handle).toBe('agashya-juice-syrup');
    expect(
      single.body.data.issues.some(
        (issue: { code: string }) => issue.code === 'PREPARATION_AMBIGUOUS',
      ),
    ).toBe(true);

    const first = await request(app)
      .get('/api/v1/audit/products?limit=50')
      .set('x-admin-key', TEST_ADMIN_KEY);
    const second = await request(app)
      .get('/api/v1/audit/products?limit=50')
      .set('x-admin-key', TEST_ADMIN_KEY);
    expect(first.body.data.cache.hit).toBe(false);
    expect(second.body.data.cache.hit).toBe(true);

    const refreshed = await request(app)
      .get('/api/v1/audit/products?limit=50&refresh=true')
      .set('x-admin-key', TEST_ADMIN_KEY);
    expect(refreshed.body.data.cache.hit).toBe(false);
  });

  it('protects internal endpoints with API key or role-bearing JWT', async () => {
    const { app } = buildTestContext();

    const missing = await request(app).get('/api/v1/audit/products');
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('UNAUTHORIZED');

    const wrong = await request(app)
      .get('/api/v1/audit/products')
      .set('x-admin-key', 'wrong');
    expect(wrong.status).toBe(401);

    const reviewsNoToken = await request(app).get('/api/v1/reviews/assessment');
    expect(reviewsNoToken.status).toBe(401);

    const reviewsWithToken = await request(app)
      .get('/api/v1/reviews/assessment')
      .set('x-admin-key', TEST_ADMIN_KEY);
    expect(reviewsWithToken.status).toBe(200);

    const adminJwt = jwt.sign(
      { sub: 'ops', role: 'admin' },
      TEST_ADMIN_JWT_SECRET,
      { algorithm: 'HS256', expiresIn: 60 },
    );
    const jwtAllowed = await request(app)
      .get('/api/v1/audit/products?limit=5')
      .set('Authorization', `Bearer ${adminJwt}`);
    expect(jwtAllowed.status).toBe(200);

    const viewerJwt = jwt.sign(
      { sub: 'viewer', roles: ['viewer'] },
      TEST_ADMIN_JWT_SECRET,
      { algorithm: 'HS256', expiresIn: 60 },
    );
    const jwtForbidden = await request(app)
      .get('/api/v1/audit/products?limit=5')
      .set('Authorization', `Bearer ${viewerJwt}`);
    expect(jwtForbidden.status).toBe(403);
    expect(jwtForbidden.body.error.code).toBe('FORBIDDEN');

    const expiredJwt = jwt.sign(
      { sub: 'ops', role: 'admin', exp: Math.floor(Date.now() / 1000) - 10 },
      TEST_ADMIN_JWT_SECRET,
      { algorithm: 'HS256' },
    );
    const expired = await request(app)
      .get('/api/v1/audit/products')
      .set('Authorization', `Bearer ${expiredJwt}`);
    expect(expired.status).toBe(401);
  });

  it('returns 404 for an unknown audit product', async () => {
    const { app } = buildTestContext();
    const response = await request(app)
      .get('/api/v1/audit/products/unknown-product')
      .set('x-admin-key', TEST_ADMIN_KEY);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});

