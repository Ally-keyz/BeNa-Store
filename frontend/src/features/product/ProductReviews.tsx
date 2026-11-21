import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, CheckCircle2, PenLine, Star, X } from 'lucide-react';
import { getProductReviews, submitProductReview } from '@/api/endpoints';
import { errorMessageKey, isApiError } from '@/api/errors';
import { queryKeys } from '@/api/queryKeys';
import { useMarket } from '@/context/MarketContext';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ProductReviewsProps {
  handle: string;
  className?: string;
}

interface FormValues {
  author: string;
  rating: number;
  body: string;
}

const INITIAL_VISIBLE = 4;

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

/** Read-only star row. Accessible label is provided by the parent. */
function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5',
            n <= rounded ? 'fill-amber-400 text-amber-400' : 'fill-neutral-200 text-neutral-200',
          )}
        />
      ))}
    </span>
  );
}

/** Initials avatar, like the circular profile picture on Play Store reviews. */
function Avatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra-50 text-sm font-semibold text-terra-700"
    >
      {initials || '?'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/** Public review feed plus a no-login submission form, modelled on the Play Store ratings section. */
export function ProductReviews({ handle, className }: ProductReviewsProps) {
  const { t } = useTranslation();
  const { marketParams, formatLocale } = useMarket();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const query = useQuery({
    queryKey: queryKeys.reviews.product(handle, marketParams),
    queryFn: async ({ signal }) =>
      (await getProductReviews(handle, { ...marketParams }, { signal })).data,
    staleTime: 10 * 60_000,
    enabled: Boolean(handle),
  });

  const schema = useMemo(
    () =>
      z.object({
        author: z.string().trim().min(2, t('remediation.reviewsNameRequired')).max(80),
        rating: z.number().int().min(1, t('remediation.reviewsRatingRequired')).max(5),
        body: z
          .string()
          .trim()
          .min(1, t('remediation.reviewsBodyRequired'))
          .min(10, t('remediation.reviewsBodyMin'))
          .max(2000, t('remediation.reviewsBodyMax')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { author: '', rating: 0, body: '' },
  });
  const selectedRating = watch('rating');
  const previewRating = hoverRating || selectedRating;

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      submitProductReview(handle, {
        author: values.author,
        rating: values.rating,
        body: values.body,
        language: marketParams.language,
      }),
    onSuccess: async () => {
      reset();
      setIsFormOpen(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.reviews.product(handle, marketParams),
      });
    },
  });

  const result = query.data;
  const reviews = result?.status === 'available' ? result.reviews : [];
  const average = result?.summary.averageRating ?? 0;
  const total = result?.summary.count ?? reviews.length;
  const hasReviews = reviews.length > 0;

  // Rating distribution (5 -> 1), derived from the loaded reviews.
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    for (const review of reviews) {
      const index = Math.min(5, Math.max(1, Math.round(review.rating))) - 1;
      counts[index] = (counts[index] ?? 0) + 1;
    }
    const max = Math.max(...counts, 1);
    return [5, 4, 3, 2, 1].map((star) => {
      const count = counts[star - 1] ?? 0;
      return {
        star,
        count,
        percent: (count / max) * 100,
      };
    });
  }, [reviews]);

  const visibleReviews = showAll ? reviews : reviews.slice(0, INITIAL_VISIBLE);
  const hiddenCount = reviews.length - visibleReviews.length;

  const closeForm = () => {
    setIsFormOpen(false);
    setHoverRating(0);
  };

  return (
    <section
      aria-labelledby="product-reviews-title"
      className={cn('border-t border-terra-100 pt-8', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 id="product-reviews-title" className="text-xl font-semibold tracking-tight text-ink">
          {t('remediation.reviewsTitle')}
        </h2>
        {!isFormOpen ? (
          <button
            type="button"
            aria-expanded={isFormOpen}
            aria-controls="product-review-form"
            onClick={() => {
              mutation.reset();
              setIsFormOpen(true);
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-terra-100 px-4 text-sm font-medium text-terra-700 transition-colors hover:bg-terra-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            {t('remediation.reviewsWriteCta')}
          </button>
        ) : null}
      </div>

      {/* Success confirmation */}
      {mutation.isSuccess && !isFormOpen ? (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-card bg-terra-50 p-3 text-[13px] font-medium text-terra-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('remediation.reviewsSuccess')}
        </p>
      ) : null}

      {/* Review form */}
      {isFormOpen ? (
        <form
          id="product-review-form"
          onSubmit={handleSubmit((values) => mutation.mutateAsync(values))}
          noValidate
          className="mt-5 rounded-2xl border border-terra-100 bg-surface p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ink">
                {t('remediation.reviewsWriteTitle')}
              </h3>
              <p className="mt-1 text-[13px] leading-5 text-neutral-600">
                {t('remediation.reviewsWriteBody')}
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              aria-label={t('remediation.reviewsHide')}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Star picker */}
          <div className="mt-5">
            <p className="mb-1 text-sm font-medium text-ink">{t('remediation.reviewsRating')}</p>
            <div
              role="radiogroup"
              aria-label={t('remediation.reviewsRating')}
              className="flex items-center gap-1"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selectedRating === value}
                  aria-label={t('remediation.reviewsStar', { count: value })}
                  onMouseEnter={() => setHoverRating(value)}
                  onFocus={() => setHoverRating(value)}
                  onBlur={() => setHoverRating(0)}
                  onClick={() =>
                    setValue('rating', value, { shouldValidate: true, shouldDirty: true })
                  }
                  className="rounded-full p-1.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                >
                  <Star
                    className={cn(
                      'h-9 w-9 transition-colors',
                      value <= previewRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-neutral-300',
                    )}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
            {errors.rating?.message ? (
              <p className="mt-1 text-[12px] text-red-700" role="alert">
                {errors.rating.message}
              </p>
            ) : null}
          </div>

          <Input
            label={t('remediation.reviewsName')}
            autoComplete="name"
            error={errors.author?.message}
            containerClassName="mt-5 sm:max-w-sm"
            {...register('author')}
          />

          <Textarea
            label={t('remediation.reviewsBodyLabel')}
            error={errors.body?.message}
            rows={4}
            containerClassName="mt-4"
            {...register('body')}
          />

          {mutation.isError ? (
            <p role="alert" className="mt-3 text-[13px] font-medium text-red-700">
              {t(errorMessageKey(isApiError(mutation.error) ? mutation.error.code : undefined))}{' '}
              {t('remediation.reviewsError')}
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-5 text-neutral-500 sm:max-w-sm">
              {t('remediation.reviewsNotice')}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                {t('remediation.reviewsCancel')}
              </button>
              <Button type="submit" disabled={mutation.isPending} className="sm:min-w-36">
                {mutation.isPending
                  ? t('remediation.reviewsSubmitting')
                  : t('remediation.reviewsSubmit')}
              </Button>
            </div>
          </div>
        </form>
      ) : null}

      {/* Summary + list */}
      <div className="mt-6">
        {query.isLoading ? (
          <div className="space-y-6" aria-busy="true">
            <div className="flex items-center gap-8">
              <Skeleton className="h-20 w-24 rounded-card" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2 w-full rounded-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
            <Skeleton className="h-24 w-full rounded-card" />
            <Skeleton className="h-24 w-full rounded-card" />
          </div>
        ) : hasReviews ? (
          <>
            {/* Rating summary */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
              <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:items-start sm:gap-2">
                <p
                  className="text-5xl font-semibold leading-none tracking-tight text-ink tabular"
                  aria-label={`${average.toFixed(1)} / 5`}
                >
                  {average.toFixed(1)}
                </p>
                <div className="flex flex-col gap-1">
                  <Stars value={average} size="md" />
                  <p className="text-[12px] text-neutral-600">
                    {t('remediation.reviewsCount', { count: total })}
                  </p>
                </div>
              </div>

              <ul className="flex w-full max-w-md flex-1 flex-col gap-1.5" aria-hidden="true">
                {distribution.map(({ star, percent }) => (
                  <li key={star} className="flex items-center gap-3">
                    <span className="w-2 text-[12px] font-medium text-neutral-600 tabular">
                      {star}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                      <span
                        className="block h-full rounded-full bg-brand-dark"
                        style={{ width: `${percent}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reviews */}
            <ul className="mt-8 grid gap-x-12 lg:grid-cols-2">
              {visibleReviews.map((review) => (
                <li
                  key={review.id}
                  className="min-w-0 border-b border-terra-100 py-5 last:border-b-0 lg:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={review.author} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{review.author}</p>
                      {review.verifiedPurchase ? (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-terra-700">
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('remediation.reviewsVerified')}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span role="img" aria-label={`${review.rating} / 5`}>
                      <Stars value={review.rating} />
                    </span>
                    <time
                      dateTime={review.createdAt}
                      className="text-[12px] text-neutral-500"
                    >
                      {formatDate(review.createdAt, formatLocale)}
                    </time>
                  </div>

                  {review.body ? (
                    <p className="mt-2 break-words whitespace-pre-line text-[14px] leading-6 text-neutral-700">
                      {review.body}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>

            {hiddenCount > 0 || showAll ? (
              <button
                type="button"
                aria-expanded={showAll}
                onClick={() => setShowAll((value) => !value)}
                className="mt-3 inline-flex min-h-11 items-center rounded-full px-1 text-sm font-medium text-terra-700 transition-colors hover:text-terra-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                {showAll
                  ? t('remediation.reviewsShowLess')
                  : t('remediation.reviewsSeeAll', { count: reviews.length })}
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-terra-100 bg-terra-50/40 px-6 py-10 text-center">
            <Stars value={0} size="md" />
            <p className="mt-3 max-w-sm text-[14px] leading-6 text-neutral-600">
              {result?.status === 'unavailable'
                ? t('remediation.reviewsUnavailable')
                : t('remediation.reviewsEmpty')}
            </p>
            {result?.status !== 'unavailable' && !isFormOpen ? (
              <Button
                type="button"
                onClick={() => {
                  mutation.reset();
                  setIsFormOpen(true);
                }}
                className="mt-4"
              >
                {t('remediation.reviewsWriteCta')}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}