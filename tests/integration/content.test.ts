import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestContext, COFFEE_VARIANT } from '../helpers/testContext';

describe('localization, shipping, policies', () => {
  it('returns countries, languages and derived market groups with an explicit caveat', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/localization?country=DE&language=EN');
    expect(response.status).toBe(200);
    expect(response.body.data.country.isoCode).toBe('DE');
    expect(response.body.data.availableCountries.length).toBe(10);
    expect(response.body.data.markets.length).toBeGreaterThan(0);
    expect(response.body.data.markets[0].handle).toMatch(/^derived-/);
    expect(response.body.meta.warnings.join(' ')).toMatch(/Market handles are not exposed/);

    const withoutContext = await request(app).get('/api/v1/localization');
    expect(withoutContext.status).toBe(200);
    expect(withoutContext.body.data.country).not.toBeNull();
  });

  it('flags worldwide-claim mismatch (#7) and missing rate guidance (#8)', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/shipping');
    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.claims.worldwide).toBe(true);
    expect(data.claims.mismatch).toBe(true);
    expect(data.guidance.hasUsableRateTable).toBe(false);
    expect(data.guidance.rateExamples).toContain('€7.50');
    const codes = data.findings.map((finding: { code: string }) => finding.code);
    expect(codes).toContain('WORLDWIDE_CLAIM_MISMATCH');
    expect(codes).toContain('MISSING_RATE_GUIDANCE');
    expect(data.limitations.join(' ')).toMatch(/no standalone shipping-rate table/i);
  });

  it('derives cart delivery estimates when a cartId is provided', async () => {
    const { app } = buildTestContext();
    const cart = await request(app)
      .post('/api/v1/cart')
      .send({
        lines: [{ merchandiseId: COFFEE_VARIANT, quantity: 1 }],
        buyerIdentity: { countryCode: 'DE' },
      });
    expect(cart.status).toBe(201);
    const response = await request(app).get(
      `/api/v1/shipping?cartId=${encodeURIComponent(cart.body.data.id)}`,
    );
    expect(response.status).toBe(200);
    expect(response.body.data.cartEstimate.deliveryGroups).toHaveLength(1);
    expect(response.body.data.cartEstimate.deliveryGroups[0].options).toHaveLength(1);
    expect(response.body.data.cartEstimate.deliveryGroups[0].options[0].amount).toBe('7.50');
  });

  it('surfaces policy identity inconsistencies (#6) and the legal-notice gap', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/policies');
    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.identity.inconsistentEmails).toBe(true);
    expect(data.identity.emails).toEqual(
      expect.arrayContaining(['store@benaorigins.de', 'hello@benaorigins.de', 'shop@benashop.de']),
    );
    expect(data.identity.inconsistentBusinessNames).toBe(true);
    expect(data.identity.findings.join(' ')).toMatch(/#6/);
    expect(data.identity.findings.join(' ')).toMatch(/#1/);
    expect(data.policies.legalNotice.handle).toBe('impressum');
    expect(data.policies.shipping).not.toBeNull();
  });
});

describe('newsletter', () => {
  it('subscribes with explicit consent and reports simulation in mock mode', async () => {
    const { app } = buildTestContext();
    const response = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'news@example.com', marketingConsent: true, source: 'tests' });
    expect(response.status).toBe(201);
    expect(response.body.data.provider).toBe('mock');
    expect(response.body.data.simulated).toBe(true);
    expect(response.body.data.status).toBe('subscribed');

    const duplicate = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'news@example.com', marketingConsent: true });
    expect(duplicate.status).toBe(201);
    expect(duplicate.body.data.status).toBe('already_subscribed');
  });

  it('rejects missing consent and invalid email addresses', async () => {
    const { app } = buildTestContext();
    const noConsent = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'news@example.com', marketingConsent: false });
    expect(noConsent.status).toBe(400);
    expect(noConsent.body.error.code).toBe('BAD_REQUEST');

    const badEmail = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'not-an-email', marketingConsent: true });
    expect(badEmail.status).toBe(400);
    expect(badEmail.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns NOT_CONFIGURED when the selected provider has no credentials', async () => {
    const { app } = buildTestContext({ NEWSLETTER_PROVIDER: 'webhook' });
    const response = await request(app)
      .post('/api/v1/newsletter/subscribe')
      .send({ email: 'news@example.com', marketingConsent: true });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('NOT_CONFIGURED');
  });
});

describe('reviews assessment', () => {
  it('reports the configured provider and remains explicitly unverified', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/reviews/assessment').set('x-admin-key', 'test-admin-key');
    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.detectedProvider).toBe('None');
    expect(data.detection).toBe('config_override');
    expect(data.status).toMatch(/UNVERIFIED/);
    expect(data.alternatives.length).toBeGreaterThan(2);
    expect(data.dataSource).toBe('fixture');
  });
});

