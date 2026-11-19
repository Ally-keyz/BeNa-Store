import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { useInfiniteSearch } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { ProductGrid } from '@/components/commerce/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Button } from '@/components/ui/Button';
import { pageContainer, sectionSpacing } from '@/lib/layout';

export function SearchPage() {
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryText = searchParams.get('q')?.trim() ?? '';
  const [input, setInput] = useState(queryText);

  useEffect(() => {
    setInput(queryText);
  }, [queryText]);

  const query = useInfiniteSearch(queryText, marketParams);
  const pages = query.data?.pages ?? [];
  const products = pages.flatMap((page) => page.items);
  const hasNextPage = pages[pages.length - 1]?.hasNextPage ?? false;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next = input.trim();
    setSearchParams(next ? { q: next } : {});
  };

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('search.title')} — BeNa Origins`,
          description: t('search.promptBody'),
          path: '/search',
          robots: 'noindex,follow',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('search.title') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-8 sm:pt-10`}>
          <h1 className="text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
            {queryText ? t('search.resultsFor', { query: queryText }) : t('search.promptTitle')}
          </h1>
          <form onSubmit={onSubmit} className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label={t('search.inputLabel')}
              type="search"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('search.inputLabel')}
              autoComplete="off"
              containerClassName="flex-1"
            />
            <Button type="submit">{t('search.submit')}</Button>
          </form>

          <div className="mt-9">
            {!queryText ? (
              <p className="rounded-card bg-terra-50 p-6 text-[14px] leading-7 text-neutral-600">
                {t('search.promptBody')}
              </p>
            ) : query.isError ? (
              <ErrorState
                title={t('catalog.errorTitle')}
                body={t('catalog.errorBody')}
                retryLabel={t('common.retry')}
                onRetry={() => void query.refetch()}
              />
            ) : products.length === 0 && !query.isLoading ? (
              <div className="rounded-card bg-terra-50 p-8">
                <p className="font-medium text-ink">{t('search.emptyTitle')}</p>
                <p className="mt-1 text-[13px] text-neutral-600">{t('search.emptyBody')}</p>
              </div>
            ) : (
              <ProductGrid products={products} loading={query.isLoading} skeletonCount={8} />
            )}
          </div>

          <Pagination
            hasNextPage={hasNextPage}
            loading={query.isFetchingNextPage}
            onLoadMore={() => void query.fetchNextPage()}
            label={t('catalog.loadMore')}
            loadingLabel={t('common.loading')}
            className="mt-10 flex justify-center"
          />
        </div>
      </div>
    </>
  );
}
