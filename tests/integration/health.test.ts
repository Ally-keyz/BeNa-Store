import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

describe('health & error envelope', () => {
  it('returns liveness with request id and data source', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.meta.dataSource).toBe('fixture');
    expect(response.body.meta.requestId).toBe(response.headers['x-request-id']);
    expect(response.body.meta.warnings.join(' ')).toMatch(/FIXTURE MODE/);
  });

  it('reports readiness checks including Shopify (fixture) reachability', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/health/ready');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.checks.shopify.ok).toBe(true);
    expect(response.body.data.checks.shopify.dataSource).toBe('fixture');
    expect(response.body.data.checks.webhooks.configured).toBe(true);
    expect(response.body.data.checks.socket.adminEnabled).toBe(true);
  });

  it('uses a predictable 404 error format', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('exposes a small root descriptor', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.data.docs).toBe('/api/docs');
    expect(response.body.data.dataSource).toBe('fixture');
  });
});
