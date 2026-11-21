import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductReviews } from './ProductReviews';
import { getProductReviews, submitProductReview } from '@/api/endpoints';
import type { ProductReviewsResult, ReviewSubmissionResult } from '@/types';

vi.mock('@/api/endpoints', () => ({
  getProductReviews: vi.fn(),
  submitProductReview: vi.fn(),
}));

vi.mock('@/context/MarketContext', () => ({
  useMarket: () => ({
    country: 'DE',
    language: 'en',
    marketParams: { country: 'DE', language: 'EN' },
    formatLocale: 'en-IE',
  }),
}));

const getReviews = vi.mocked(getProductReviews);
const submitReview = vi.mocked(submitProductReview);

const feed: ProductReviewsResult = {
  handle: 'rwanda-coffee-250g',
  status: 'available',
  source: 'customer_reviews',
  reviews: [
    {
      id: 'existing-review',
      author: 'Amara',
      rating: 5,
      body: 'Rich flavour and fast delivery.',
      createdAt: '2026-11-20T10:00:00.000Z',
      verifiedPurchase: false,
    },
  ],
  summary: { count: 1, averageRating: 5 },
  simulated: false,
  message: 'Customer-submitted reviews for this product.',
  checkedAt: '2026-11-20T10:00:00.000Z',
};

const writeCta = 'No reviews yet. Be the first to write one.';

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductReviews handle="rwanda-coffee-250g" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getReviews.mockReset();
  submitReview.mockReset();
  getReviews.mockResolvedValue({ data: feed } as never);
});

describe('ProductReviews', () => {
  it('starts with the form closed and opens and closes it from the CTA', async () => {
    const user = userEvent.setup();
    renderView();

    expect(await screen.findByRole('heading', { name: 'Customer reviews' })).toBeVisible();
    expect(await screen.findByText('5.0')).toBeVisible();
    expect(screen.getByText('1 review')).toBeVisible();
    expect(screen.getByText('Amara')).toBeVisible();
    expect(screen.getByText('Rich flavour and fast delivery.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Write a review' })).toBeNull();

    const openButton = screen.getByRole('button', { name: writeCta });
    expect(openButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(openButton);

    expect(await screen.findByRole('heading', { name: 'Write a review' })).toBeVisible();
    expect(screen.queryByRole('button', { name: writeCta })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Hide reviews' }));
    expect(screen.queryByRole('heading', { name: 'Write a review' })).toBeNull();

    await user.click(screen.getByRole('button', { name: writeCta }));
    expect(screen.getByRole('heading', { name: 'Write a review' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Write a review' })).toBeNull();
    expect(screen.getByRole('button', { name: writeCta })).toBeVisible();
  });

  it('submits a review without login and shows confirmation after the form closes', async () => {
    const user = userEvent.setup();
    const submitted: ReviewSubmissionResult = {
      handle: 'rwanda-coffee-250g',
      reference: 'new-review',
      review: {
        id: 'new-review',
        author: 'Noah',
        rating: 4,
        body: 'A pleasant everyday coffee with a lovely aroma.',
        createdAt: '2026-11-21T10:00:00.000Z',
        verifiedPurchase: false,
      },
      status: 'received',
      provider: 'resend',
      receivedAt: '2026-11-21T10:00:00.000Z',
      notification: {
        provider: 'resend',
        delivered: true,
        simulated: false,
        message: 'Owner notified.',
      },
      message: 'Thank you.',
      simulated: false,
    };
    submitReview.mockResolvedValue({ data: submitted } as never);
    renderView();

    await user.click(await screen.findByRole('button', { name: writeCta }));
    await user.type(await screen.findByLabelText('Your name'), 'Noah');
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.type(
      screen.getByLabelText('Your message'),
      'A pleasant everyday coffee with a lovely aroma.',
    );
    await user.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() =>
      expect(submitReview).toHaveBeenCalledWith('rwanda-coffee-250g', {
        author: 'Noah',
        rating: 4,
        body: 'A pleasant everyday coffee with a lovely aroma.',
        language: 'EN',
      }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Thank you! Your review has been submitted.',
    );
    expect(screen.queryByRole('heading', { name: 'Write a review' })).toBeNull();
    expect(screen.getByRole('button', { name: writeCta })).toBeVisible();
  });

  it('shows the average, count and expands long review lists', async () => {
    const user = userEvent.setup();
    getReviews.mockResolvedValue({
      data: {
        ...feed,
        reviews: Array.from({ length: 5 }, (_, index) => ({
          id: `review-${index + 1}`,
          author: `Customer ${index + 1}`,
          rating: 5,
          body: `A reliable coffee from batch ${index + 1}.`,
          createdAt: '2026-11-20T10:00:00.000Z',
          verifiedPurchase: false,
        })),
        summary: { count: 5, averageRating: 5 },
      },
    } as never);
    renderView();

    expect(await screen.findByText('5.0')).toBeVisible();
    expect(screen.getByText('5 reviews')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'See all 5 reviews' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(5);

    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });
});
