import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

describe('Layer 2 — admin auth fail-closed', () => {
  it('returns 503 when no admin credentials are configured', async () => {
    const { app } = buildTestContext({
      ADMIN_API_KEY_SHA256: '',
      ADMIN_API_KEY: '',
      ADMIN_API_TOKEN: '',
      ADMIN_JWT_SECRET: '',
      SOCKET_ADMIN_JWT_SECRET: '',
    });
    const response = await request(app).get('/api/v1/audit/products');
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('NOT_CONFIGURED');
  });

  it('rejects a malformed Authorization header with 401', async () => {
    const { app } = buildTestContext();
    const response = await request(app)
      .get('/api/v1/audit/products')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});
