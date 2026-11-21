import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { buildTestContext } from '../helpers/testContext';

afterEach(() => {
  vi.unstubAllGlobals();
});

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
    const response = await request(app)
      .get('/api/v1/reviews/product/coffee-beans-1kg')
      .query({ country: 'DE', language: 'DE', refresh: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      handle: 'coffee-beans-1kg',
      status: 'not_configured',
      reviews: [],
      summary: { count: 0, averageRating: null },
    });
  });

  it('rejects an invalid handle', async () => {
    const { app } = buildTestContext();
    const response = await request(app).get('/api/v1/reviews/product/not%20a%20handle');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0].path).toBe('handle');
  });

  it('accepts a public review without login, emails the owner, and shows it in the feed', async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL, _init?: RequestInit) => new Response(null, { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { app } = buildTestContext({
      RESTOCK_PROVIDER: 'resend',
      RESTOCK_RESEND_API_KEY: 're_review_key',
      RESTOCK_FROM_EMAIL: 'BeNa Origins <hello@example.com>',
      REVIEWS_NOTIFICATION_EMAIL: 'owner@benaorigins.test',
    });

    const submitted = await request(app).post('/api/v1/reviews/product/rwanda-coffee-250g').send({
      author: 'Amara',
      rating: 5,
      body: 'Rich flavour and fast delivery. I will order again.',
      language: 'EN',
    });

    expect(submitted.status).toBe(201);
    expect(submitted.body.data).toMatchObject({
      handle: 'rwanda-coffee-250g',
      status: 'received',
      simulated: false,
      review: {
        author: 'Amara',
        rating: 5,
        verifiedPurchase: false,
      },
      notification: {
        provider: 'resend',
        delivered: true,
        simulated: false,
      },
    });

    const emailCall = fetchMock.mock.calls.find(
      ([url]) => url === 'https://api.resend.com/emails',
    ) as unknown as [string, RequestInit] | undefined;
    expect(emailCall).toBeDefined();
    expect(emailCall?.[1].headers).toMatchObject({ Authorization: 'Bearer re_review_key' });
    const email = JSON.parse(String(emailCall?.[1].body)) as {
      to: string[];
      subject: string;
      text: string;
      html: string;
    };
    expect(email.to).toEqual(['owner@benaorigins.test']);
    expect(email.subject).toContain('rwanda-coffee-250g');
    expect(email.text).toContain('Amara');
    expect(email.text).toContain('Rich flavour');
    expect(email.html).toContain('Amara');
    expect(email.html).not.toContain('<script>');

    const feed = await request(app).get('/api/v1/reviews/product/rwanda-coffee-250g');
    expect(feed.status).toBe(200);
    expect(feed.body.data.status).toBe('available');
    expect(feed.body.data.reviews).toHaveLength(1);
    expect(feed.body.data.reviews[0]).toMatchObject({ author: 'Amara', rating: 5 });
    expect(feed.body.data.summary).toEqual({ count: 1, averageRating: 5 });
  });

  it('validates public review submissions', async () => {
    const { app } = buildTestContext();
    const response = await request(app).post('/api/v1/reviews/product/rwanda-coffee-250g').send({
      author: 'A',
      rating: 6,
      body: 'Too short',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const paths = response.body.error.details.map((detail: { path: string }) => detail.path);
    expect(paths).toContain('author');
    expect(paths).toContain('rating');
    expect(paths).toContain('body');
  });

  it('still accepts a review when owner email is not configured', async () => {
    const { app } = buildTestContext();
    const response = await request(app).post('/api/v1/reviews/product/rwanda-coffee-250g').send({
      author: 'Noah',
      rating: 4,
      body: 'A solid everyday coffee with a pleasant aroma.',
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: 'simulated',
      simulated: true,
      notification: {
        provider: 'mock',
        delivered: false,
        simulated: true,
      },
    });
  });
});
