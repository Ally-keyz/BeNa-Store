import { afterEach, describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { FixtureCommerceClient } from '../../src/integrations/shopify/fixtureClient';
import { ReviewsService } from '../../src/services/reviews.service';
import { testConfig } from '../helpers/testContext';

const logger = pino({ level: 'silent' });
const TEMPLATE = 'https://reviews.example.test/feed/{handle}.json?slug={HANDLE}';

const feedPayload = {
  source: 'Judge.me fixture feed',
  reviews: [
    {
      id: 'review-1',
      author: 'Alice',
      rating: 5,
      title: 'Excellent',
      text: 'Tastes wonderful.',
      date: '2026-10-01',
      verifiedPurchase: true,
    },
    {
      id: 2,
      author: 'Bob',
      rating: 4,
      comment: 'Good value.',
      createdAt: '2026-10-05',
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

function serviceWith(fetchMock: ReturnType<typeof vi.fn>, overrides: Record<string, string | undefined> = {}) {
  return new ReviewsService(
    new FixtureCommerceClient(),
    testConfig({
      REVIEWS_PROVIDER: 'judge_me',
      REVIEWS_API_URL_TEMPLATE: TEMPLATE,
      REVIEWS_CACHE_TTL_SECONDS: '0',
      ...overrides,
    }),
    logger,
    fetchMock as unknown as typeof fetch,
  );
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('ReviewsService.forProduct with a configured feed', () => {
  it('substitutes both handle placeholders and maps genuine reviews with a real average', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(feedPayload));

    const result = await serviceWith(fetchMock).forProduct('rwanda-coffee-250g');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]! as [URL, RequestInit];
    expect(String(url)).toBe(
      'https://reviews.example.test/feed/rwanda-coffee-250g.json?slug=rwanda-coffee-250g',
    );
    expect(init.headers).toMatchObject({ Accept: 'application/json' });

    expect(result.status).toBe('available');
    expect(result.source).toBe('Judge.me fixture feed');
    expect(result.simulated).toBe(false);
    expect(result.message).toBe('Genuine reviews from the configured provider feed.');
    expect(result.reviews).toHaveLength(2);
    expect(result.reviews[0]).toMatchObject({
      id: 'review-1',
      author: 'Alice',
      rating: 5,
      title: 'Excellent',
      body: 'Tastes wonderful.',
      createdAt: '2026-10-01',
      verifiedPurchase: true,
    });
    expect(result.reviews[1]).toMatchObject({
      id: '2',
      author: 'Bob',
      rating: 4,
      body: 'Good value.',
      createdAt: '2026-10-05',
    });
    expect(result.reviews.map((review) => review.rating)).toEqual([5, 4]);
    expect(result.summary).toEqual({ count: 2, averageRating: 4.5 });
  });

  it('returns an unavailable, empty result for non-HTTP(S) templates without fetching', async () => {
    const fetchMock = vi.fn();
    const service = serviceWith(fetchMock, {
      REVIEWS_API_URL_TEMPLATE: 'ftp://reviews.example.test/{handle}.json',
    });

    const result = await service.forProduct('rwanda-coffee-250g');

    expect(result.status).toBe('unavailable');
    expect(result.reviews).toEqual([]);
    expect(result.summary).toEqual({ count: 0, averageRating: null });
    expect(result.message).toMatch(/valid HTTP\(S\) URL/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns an unavailable, empty result for malformed templates without fetching', async () => {
    const fetchMock = vi.fn();
    const service = serviceWith(fetchMock, { REVIEWS_API_URL_TEMPLATE: 'not a url' });

    const result = await service.forProduct('rwanda-coffee-250g');

    expect(result.status).toBe('unavailable');
    expect(result.reviews).toEqual([]);
    expect(result.summary.averageRating).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not invent ratings when no feed template is configured', async () => {
    const fetchMock = vi.fn();
    const service = serviceWith(fetchMock, {
      REVIEWS_PROVIDER: 'none',
      REVIEWS_API_URL_TEMPLATE: '',
    });

    const result = await service.forProduct('rwanda-coffee-250g');

    expect(result.status).toBe('not_configured');
    expect(result.reviews).toEqual([]);
    expect(result.summary).toEqual({ count: 0, averageRating: null });
    expect(result.simulated).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
