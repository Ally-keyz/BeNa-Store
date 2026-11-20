import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageSeo } from '@/features/seo/PageSeo';
import { CollectionCard } from '@/features/catalog/CollectionCard';
import { useCollections } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { pageContainer, sectionSpacing } from '@/lib/layout';

export function CollectionsPage() {
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const query = useCollections({ ...marketParams, first: 50 });
  const collections = query.data?.items ?? [];

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('collections.title')} — BeNa Origins`,
          description: t('collections.body'),
          path: '/collections',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('collections.eyebrow') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-8 sm:pt-10`}>
          <SectionHeading
            as="h1"
            eyebrow={t('collections.eyebrow')}
            title={t('collections.title')}
            body={t('collections.body')}
          />

          {query.isError ? (
            <ErrorState
              className="mt-8"
              title={t('collections.errorTitle')}
              body={t('collections.errorBody')}
              retryLabel={t('common.retry')}
              onRetry={() => void query.refetch()}
            />
          ) : query.isLoading ? (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6" aria-busy="true">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index}>
                  <Skeleton className="aspect-square w-full rounded-card" />
                  <Skeleton className="mt-3 h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="mt-8 rounded-card bg-terra-50 p-8">
              <p className="font-medium text-ink">{t('collections.emptyTitle')}</p>
              <p className="mt-1 text-[13px] text-neutral-600">{t('collections.emptyBody')}</p>
              <Link to="/catalog" className="mt-4 inline-block rounded-sm text-sm font-medium text-terra-800 underline underline-offset-4">
                {t('home.featuredCta')}
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
              {collections.map((collection, index) => (
                <CollectionCard key={collection.id} collection={collection} priority={index < 4} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
