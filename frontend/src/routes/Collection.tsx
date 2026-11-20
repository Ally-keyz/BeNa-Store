import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/api/errors';
import { PageSeo } from '@/features/seo/PageSeo';
import { useInfiniteCollectionProducts } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { ProductGrid } from '@/components/commerce/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { pageContainer, sectionSpacing } from '@/lib/layout';
import { sanitizeHtml, stripHtml } from '@/lib/sanitize';
import { NotFoundPage } from './NotFoundPage';

export function CollectionPage() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const query = useInfiniteCollectionProducts(handle, { ...marketParams, first: 12 });
  const pages = query.data?.pages ?? [];
  const collection = pages[0]?.collection;
  const products = pages.flatMap((page) => page.items);
  const hasNextPage = pages[pages.length - 1]?.hasNextPage ?? false;
  const description = stripHtml(collection?.description);

  if (isApiError(query.error) && query.error.status === 404) return <NotFoundPage />;

  const title = collection?.title ?? t('collection.allTitle');

  return (
    <>
      <PageSeo
        resource="collection"
        handle={handle}
        market={marketParams}
        fallback={{
          title: `${title} — BeNa Origins`,
          description: description || t('collection.emptyBody'),
          path: `/collections/${handle}`,
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('collections.eyebrow'), href: '/collections' },
            { label: title },
          ]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-8 sm:pt-10`}>
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('collections.eyebrow')}
            </p>
            <h1 className="mt-2 break-words text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight [overflow-wrap:anywhere]">{title}</h1>
            {collection?.description ? (
              <div
                className="mt-3 max-w-full overflow-x-auto text-[15px] leading-7 text-neutral-600"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(collection.description) }}
              />
            ) : (
              <p className="mt-3 text-[15px] leading-7 text-neutral-600">{t('collections.fallbackBody')}</p>
            )}
            {products.length ? (
              <p className="mt-3 text-[13px] text-neutral-600">
                {t('collections.productsCount', { count: products.length })}
              </p>
            ) : null}
          </div>

          <div className="mt-8">
            {query.isError ? (
              <ErrorState
                title={t('collection.errorTitle')}
                body={t('collection.errorBody')}
                retryLabel={t('common.retry')}
                onRetry={() => void query.refetch()}
              />
            ) : products.length === 0 && !query.isLoading ? (
              <div className="rounded-card bg-terra-50 p-6 sm:p-8">
                <p className="font-medium text-ink">{t('collection.emptyTitle')}</p>
                <p className="mt-1 text-[13px] text-neutral-600">{t('collection.emptyBody')}</p>
              </div>
            ) : (
              <ProductGrid products={products} loading={query.isLoading} skeletonCount={8} />
            )}
          </div>

          <Pagination
            hasNextPage={hasNextPage}
            loading={query.isFetchingNextPage}
            onLoadMore={() => void query.fetchNextPage()}
            label={t('collection.loadMore')}
            loadingLabel={t('common.loading')}
            className="mt-10 flex justify-center"
          />
        </div>
      </div>
    </>
  );
}
