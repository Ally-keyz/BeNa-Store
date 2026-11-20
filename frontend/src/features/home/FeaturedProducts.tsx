import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pageContainer, sectionSpacing } from '@/lib/layout';
import { buttonVariants } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProductCard } from '@/components/commerce/ProductCard';
import { useInfiniteCollectionProducts, useInfiniteProducts } from '@/hooks/useCatalog';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useMarket } from '@/context/MarketContext';
import { matchesProductCategory } from '@/lib/product';
import { errorMessageKey, isApiError } from '@/api/errors';
import { ALL_CATEGORIES, CategoryFilter } from './CategoryFilter';

const GRID = 'grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:grid-cols-3 lg:gap-x-6';
const PANEL = 'rounded-3xl border border-terra-100 bg-terra-50/70 p-6';

function ProductSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[11/12] w-full rounded-3xl sm:aspect-square" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  );
}

export interface FeaturedProductsProps {
  /** White keeps the feed clean on landing pages; tinted matches the home story. */
  variant?: 'tinted' | 'white';
  eyebrow?: string;
  title?: string;
  titleId?: string;
  body?: string;
  align?: 'left' | 'center';
  headingAs?: 'h1' | 'h2';
  showFilters?: boolean;
  showCta?: boolean;
  first?: number;
  className?: string;
}

/**
 * Featured feed with automatic infinite scrolling. Products load as the
 * visitor scrolls — there is deliberately no "Load more" button. The same
 * component powers the home page and the Rwandan-products catalog feed so both
 * share the exact layout and scroll behaviour.
 */
export function FeaturedProducts({
  variant = 'tinted',
  eyebrow,
  title,
  titleId = 'home-featured',
  body,
  align = 'left',
  headingAs = 'h2',
  showFilters = true,
  showCta = true,
  first = 6,
  className,
}: FeaturedProductsProps) {
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const allQuery = useInfiniteProducts({ first, sortKey: 'CREATED_AT', ...marketParams });
  const isCollection = category !== ALL_CATEGORIES;
  const collectionQuery = useInfiniteCollectionProducts(
    isCollection ? category : '',
    { first, sortKey: 'CREATED', ...marketParams },
  );
  // Shopify collections are optional in some markets. If a collection handle is
  // missing, keep the filter useful by narrowing the live product feed instead
  // of showing a page-level error.
  const collectionProducts = (collectionQuery.data?.pages ?? []).flatMap((page) => page.items);
  const useFeedFallback =
    isCollection &&
    (collectionQuery.isError || (collectionQuery.isSuccess && collectionProducts.length === 0));
  const query = isCollection && !useFeedFallback ? collectionQuery : allQuery;
  const feedProducts = (query.data?.pages ?? []).flatMap((page) => page.items);
  const products =
    isCollection && useFeedFallback
      ? feedProducts.filter((product) => matchesProductCategory(product, category))
      : feedProducts;
  const hasNextPage = query.data?.pages.at(-1)?.hasNextPage ?? false;

  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasNextPage,
    loading: query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
  });

  return (
    <section
      className={cn(
        sectionSpacing,
        'pt-10 sm:pt-12 lg:pt-14',
        variant === 'white' ? 'bg-paper' : 'bg-transparent',
        className,
      )}
      aria-labelledby={titleId}
    >
      <div className={pageContainer}>
        <div className="mx-auto w-full max-w-5xl">
          <SectionHeading
            eyebrow={eyebrow ?? t('home.featuredEyebrow')}
            title={title ? <span id={titleId}>{title}</span> : <span id={titleId}>{t('home.featuredHeading')}</span>}
            body={body ?? t('home.featuredBody')}
            align={align}
            as={headingAs}
            action={
              showCta ? (
                <Link
                  to="/catalog"
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'gap-1.5 rounded-full bg-brand px-5 text-on-brand hover:bg-brand-dark',
                  )}
                >
                  {t('home.featuredCta')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : undefined
            }
          />

          {showFilters ? (
            <div className="mt-6 border-b border-terra-100 pb-5">
              <CategoryFilter value={category} onChange={setCategory} controls="home-featured-grid" />
            </div>
          ) : null}

          <div
            id="home-featured-grid"
            aria-live="polite"
            aria-busy={query.isFetching || query.isFetchingNextPage}
          >
            {query.isLoading ? (
              <div className={cn('mt-8', GRID)}>
                {[0, 1, 2].map((item) => (
                  <ProductSkeleton key={item} />
                ))}
              </div>
            ) : query.isError && !useFeedFallback ? (
              <div className={cn('mt-8', PANEL)} role="alert">
                <p className="font-medium text-ink">{t('common.errorTitle')}</p>
                <p className="mt-1 text-sm text-neutral-600">
                  {t(errorMessageKey(isApiError(query.error) ? query.error.code : undefined))}
                </p>
                <button
                  type="button"
                  onClick={() => void query.refetch()}
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'mt-4 rounded-full bg-brand px-5 text-on-brand hover:bg-brand-dark',
                  )}
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : products.length === 0 ? (
              useFeedFallback && hasNextPage ? (
                <div className={cn('mt-8', GRID)}>
                  {[0, 1, 2].map((item) => (
                    <ProductSkeleton key={item} />
                  ))}
                </div>
              ) : (
                <p className={cn('mt-8 text-sm text-neutral-600', PANEL)}>
                  {t('home.emptyFeatured')}
                </p>
              )
            ) : (
              <div
                key={category}
                className={cn(
                  'animate-fade-in mt-8 transition-opacity',
                  GRID,
                  query.isFetching && 'opacity-60',
                )}
              >
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 3} />
                ))}
              </div>
            )}

            <div ref={sentinelRef} className="h-px" aria-hidden="true" />
            {query.isFetchingNextPage ? (
              <p className="mt-6 flex items-center justify-center gap-2 text-[13px] font-medium text-neutral-600">
                <Loader2 className="h-4 w-4 animate-spin text-brand-dark" aria-hidden="true" />
                {t('home.loadingMore')}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
