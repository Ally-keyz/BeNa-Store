import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { PageSeo } from '@/features/seo/PageSeo';
import { useInfiniteProducts } from '@/hooks/useCatalog';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useMarket } from '@/context/MarketContext';
import { ProductGrid } from '@/components/commerce/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { ALL_CATEGORIES, CategoryFilter } from '@/features/home/CategoryFilter';
import { cn } from '@/lib/cn';
import { pageContainer } from '@/lib/layout';
import { getDefaultVariant, matchesProductCategory } from '@/lib/product';

type PriceFilter = 'all' | 'cheap' | 'expensive' | 'other';

const CHEAP_LIMIT = 20;

const PRICE_OPTIONS: Array<{ value: PriceFilter; labelKey: string }> = [
  { value: 'all', labelKey: 'catalog.priceAll' },
  { value: 'cheap', labelKey: 'catalog.priceCheap' },
  { value: 'expensive', labelKey: 'catalog.priceExpensive' },
  { value: 'other', labelKey: 'catalog.priceOther' },
];

function matchesPrice(product: Parameters<typeof getDefaultVariant>[0], filter: PriceFilter): boolean {
  if (filter === 'all') return true;
  const amount = Number(
    getDefaultVariant(product)?.price.amount ?? product.priceRange.minVariantPrice.amount,
  );
  if (!Number.isFinite(amount) || amount <= 0) return filter === 'other';
  if (filter === 'cheap') return amount < CHEAP_LIMIT;
  if (filter === 'expensive') return amount >= CHEAP_LIMIT;
  return false;
}

export function CatalogPage() {
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

  const query = useInfiniteProducts({ ...marketParams, first: 12, sortKey: 'CREATED_AT' });
  const allProducts = query.data?.pages.flatMap((page) => page.items) ?? [];
  const products = allProducts.filter(
    (product) =>
      matchesProductCategory(product, category) && matchesPrice(product, priceFilter),
  );
  const pages = query.data?.pages ?? [];
  const hasNextPage = pages.at(-1)?.hasNextPage ?? false;

  const sentinelRef = useInfiniteScroll<HTMLDivElement>({
    hasNextPage,
    loading: query.isFetchingNextPage,
    onLoadMore: () => void query.fetchNextPage(),
  });

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('catalog.title')} — BeNa Origins`,
          description: t('catalog.body'),
          path: '/catalog',
        }}
      />
      <div className={`${pageContainer} min-h-[70vh] bg-white pb-16`}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.catalog') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />

        <div className="mt-6 text-center">
          <h1 className="font-display text-[clamp(28px,3vw,40px)] font-semibold leading-tight tracking-tight text-ink">
            {t('catalog.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
            {t('catalog.body')}
          </p>
        </div>

        <div className="mt-8 border-t border-terra-100 pt-6" aria-busy={query.isFetching}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <CategoryFilter value={category} onChange={setCategory} controls="catalog-grid" />
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
                {t('catalog.priceLabel')}
              </span>
              <div
                role="group"
                aria-label={t('catalog.priceLabel')}
                className="inline-flex flex-wrap items-center rounded-xl border border-terra-200 bg-white p-1"
              >
                {PRICE_OPTIONS.map((option) => {
                  const active = priceFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPriceFilter(option.value)}
                      aria-pressed={active}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                        active
                          ? 'bg-brand text-ink'
                          : 'text-neutral-600 hover:bg-terra-50 hover:text-ink',
                      )}
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div id="catalog-grid" className="mt-7">
            {query.isError ? (
              <ErrorState
                title={t('catalog.errorTitle')}
                body={t('catalog.errorBody')}
                retryLabel={t('common.retry')}
                onRetry={() => void query.refetch()}
              />
            ) : query.isLoading || (products.length === 0 && hasNextPage) ? (
              <ProductGrid products={[]} loading skeletonCount={12} />
            ) : products.length === 0 ? (
              <div className="rounded-card bg-terra-50 p-8">
                <p className="font-medium text-ink">{t('catalog.emptyTitle')}</p>
                <p className="mt-1 text-[13px] text-neutral-600">{t('catalog.emptyBody')}</p>
              </div>
            ) : (
              <ProductGrid products={products} skeletonCount={12} />
            )}
          </div>

          <div ref={sentinelRef} className="h-px" aria-hidden="true" />
          {query.isFetchingNextPage ? (
            <p className="mt-8 flex items-center justify-center gap-2 text-[13px] font-medium text-neutral-600">
              <Loader2 className="h-4 w-4 animate-spin text-brand-dark" aria-hidden="true" />
              {t('home.loadingMore')}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
