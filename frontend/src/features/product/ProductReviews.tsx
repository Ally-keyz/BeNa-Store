import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { getProductReviews } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { useMarket } from '@/context/MarketContext';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ProductReviewsProps {
  handle: string;
  className?: string;
}

/** Genuine provider reviews only. No rating is synthesized when no feed exists. */
export function ProductReviews({ handle, className }: ProductReviewsProps) {
  const { t } = useTranslation();
  const { marketParams, formatLocale } = useMarket();
  const query = useQuery({
    queryKey: queryKeys.reviews.product(handle, marketParams),
    queryFn: async ({ signal }) =>
      (await getProductReviews(handle, { ...marketParams }, { signal })).data,
    staleTime: 10 * 60_000,
    enabled: Boolean(handle),
  });

  const result = query.data;
  const reviews = result?.status === 'available' ? result.reviews : [];

  return (
    <section
      aria-labelledby="product-reviews-title"
      className={cn('border-t border-terra-100 pt-8', className)}
    >
      <h2 id="product-reviews-title" className="text-lg font-semibold text-ink">
        {t('remediation.reviewsTitle')}
      </h2>

      {query.isLoading ? (
        <div className="mt-5 space-y-3" aria-busy="true">
          <Skeleton className="h-16 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card" />
        </div>
      ) : result?.status === 'available' && reviews.length > 0 ? (
        <>
          {result.summary.averageRating !== null ? (
            <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-neutral-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span className="tabular">
                {result.summary.averageRating.toFixed(1)} / 5 · {result.summary.count}
              </span>
              <span className="sr-only">{t('remediation.reviewsTitle')}</span>
            </p>
          ) : null}
          <ul className="mt-5 grid gap-4 lg:grid-cols-2">
            {reviews.map((review) => (
              <li key={review.id} className="min-w-0 rounded-card border border-terra-100 bg-surface p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{review.author}</p>
                  <time
                    dateTime={review.createdAt}
                    className="text-[12px] text-neutral-500"
                  >
                    {formatDate(review.createdAt, formatLocale)}
                  </time>
                </div>
                <p
                  className="mt-2 text-[13px] font-medium text-terra-700"
                  aria-label={`${review.rating} / 5`}
                >
                  {'★'.repeat(Math.round(review.rating))}
                  <span className="sr-only"> {review.rating} / 5</span>
                </p>
                {review.title ? (
                  <h3 className="mt-2 break-words text-[14px] font-semibold text-ink">{review.title}</h3>
                ) : null}
                {review.body ? (
                  <p className="mt-1 break-words whitespace-pre-line text-[13px] leading-6 text-neutral-600">
                    {review.body}
                  </p>
                ) : null}
                {review.verifiedPurchase ? (
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-terra-700">
                    {t('remediation.reviewsVerified')}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 rounded-card border border-terra-100 bg-terra-50/60 p-4 text-[13px] leading-6 text-neutral-600">
          {result?.status === 'unavailable'
            ? t('remediation.reviewsUnavailable')
            : t('remediation.reviewsEmpty')}
        </p>
      )}
    </section>
  );
}
