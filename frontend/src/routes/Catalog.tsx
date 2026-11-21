import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2, SlidersHorizontal } from 'lucide-react';
import { PageSeo } from '@/features/seo/PageSeo';
import { useCatalogFacets, useInfiniteProducts } from '@/hooks/useCatalog';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useMarket } from '@/context/MarketContext';
import { ProductGrid } from '@/components/commerce/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { ALL_CATEGORIES, CategoryFilter } from '@/features/home/CategoryFilter';
import { CatalogFacets } from '@/features/catalog/CatalogFacets';
import { EMPTY_FACETS, type SelectedFacets } from '@/features/catalog/facets';
import { cn } from '@/lib/cn';
import { pageContainer } from '@/lib/layout';
import { getDefaultVariant, matchesFacet, matchesProductCategory } from '@/lib/product';

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
  const [selectedFacets, setSelectedFacets] = useState<SelectedFacets>(EMPTY_FACETS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = useInfiniteProducts({ ...marketParams, first: 12, sortKey: 'CREATED_AT' });
  const facetsQuery = useCatalogFacets(marketParams);
  const allProducts = query.data?.pages.flatMap((page) => page.items) ?? [];
  const products = allProducts.filter(
    (product) =>
      matchesProductCategory(product, category) &&
      matchesPrice(product, priceFilter) &&
      (['brands', 'dietary', 'origins'] as const).every((group) =>
        selectedFacets[group].every((value) => matchesFacet(product, group, value)),
      ),
  );
  const pages = query.data?.pages ?? [];
  const hasNextPage = pages.at(-1)?.hasNextPage ?? false;
  const activeFilterCount =
    (category === ALL_CATEGORIES ? 0 : 1) +
    (priceFilter === 'all' ? 0 : 1) +
    (['brands', 'dietary', 'origins'] as const).reduce(
      (total, group) => total + selectedFacets[group].length,
      0,
    );

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
      <div className={`${pageContainer} min-h-[70vh] bg-paper pb-16`}>
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
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="catalog-filters"
            className="inline-flex min-h-11 w-full items-center justify-between rounded-xl border border-terra-200 bg-surface px-4 text-sm font-medium text-ink lg:hidden"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {t('catalog.filtersToggle')}
              {activeFilterCount > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold leading-none text-on-brand">
                  {activeFilterCount}
                </span>
              ) : null}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn('h-4 w-4 transition-transform duration-200', filtersOpen && 'rotate-180')}
            />
          </button>

          <div id="catalog-filters" className={cn(filtersOpen ? 'block' : 'hidden', 'lg:block')}>
            <div className="mt-4 flex flex-col gap-4 lg:mt-0 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <CategoryFilter value={category} onChange={setCategory} controls="catalog-grid" />
              </div>
  
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500 sm:inline">
                  {t('catalog.priceLabel')}
                </span>
                <div
                  role="group"
                  aria-label={t('catalog.priceLabel')}
                  className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto bg-surface px-4 py-1.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:snap-none sm:overflow-visible sm:rounded-full sm:border sm:border-terra-200 sm:px-1.5 sm:py-1.5 [&::-webkit-scrollbar]:hidden"
                >
                  {PRICE_OPTIONS.map((option) => {
                    const active = priceFilter === option.value;
                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => setPriceFilter(option.value)}
                        aria-pressed={active}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                        className={cn(
                          'min-h-11 shrink-0 snap-start whitespace-nowrap rounded-full border-0 px-4 py-2 text-[13px] font-medium transition-colors sm:min-h-0',
                          active
                            ? 'bg-brand text-on-brand shadow-sm'
                            : 'text-neutral-600 hover:bg-terra-50 hover:text-ink',
                        )}
                      >
                        {t(option.labelKey)}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            <CatalogFacets
              facets={facetsQuery.data}
              selected={selectedFacets}
              onChange={setSelectedFacets}
              loading={facetsQuery.isLoading}
            />
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
