import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

const validSubmission = {
  orderNumber: '#1001',
  email: 'customer@example.test',
  fullName: 'Ada Lovelace',
  countryCode: 'de',
  orderedOn: '2026-10-20',
  itemDescription: 'Rwanda Coffee 250g',
  reason: 'Changed my mind',
  declaration: true,
  language: 'de',
};

describe('withdrawal endpoint', () => {
  it('returns a simulated receipt without echoing PII in mock mode', async () => {
    const { app } = buildTestContext();
    const response = await request(app).post('/api/v1/withdrawals').send(validSubmission);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      status: 'simulated',
      simulated: true,
      provider: 'mock',
    });
    expect(response.body.data.reference).toMatch(/^WD-\d{8}-[A-F0-9]{6}$/);
    expect(response.body.data.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(response.body.data.message).toMatch(/Simulated withdrawal receipt/);

    // The intake payload must not be reflected back to the caller.
    const body = JSON.stringify(response.body);
    expect(body).not.toContain(validSubmission.email);
    expect(body).not.toContain(validSubmission.fullName);
    expect(body).not.toContain(validSubmission.orderNumber);
  });

  it('accepts the minimal declaration-only submission', async () => {
    const { app } = buildTestContext();
    const response = await request(app)
      .post('/api/v1/withdrawals')
      .send({ orderNumber: '1002', email: 'minimal@example.test', fullName: 'Grace Hopper', declaration: true });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('simulated');
    expect(response.body.data.simulated).toBe(true);
  });

  it('rejects a submission without the declaration', async () => {
    const { app } = buildTestContext();
    const response = await request(app)
      .post('/api/v1/withdrawals')
      .send({ ...validSubmission, declaration: false });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'declaration',
          message: expect.stringContaining('withdrawal declaration'),
        }),
      ]),
    );
  });

  it('rejects an invalid email address', async () => {
    const { app } = buildTestContext();
    const response = await request(app)
      .post('/api/v1/withdrawals')
      .send({ ...validSubmission, email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'email' })]),
    );
  });
});
