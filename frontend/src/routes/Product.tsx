import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isApiError } from '@/api/errors';
import { PageSeo } from '@/features/seo/PageSeo';
import { ProductFacts } from '@/features/product/ProductFacts';
import { ProductGallery } from '@/features/product/ProductGallery';
import { PurchasePanel } from '@/features/product/PurchasePanel';
import { RelatedProducts } from '@/features/product/RelatedProducts';
import { useProduct } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { pageContainer, sectionSpacing } from '@/lib/layout';
import { getDefaultVariant, getPrimaryImage } from '@/lib/product';
import { stripHtml } from '@/lib/sanitize';
import { NotFoundPage } from './NotFoundPage';

export function ProductPage() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const query = useProduct(handle, marketParams);
  const product = query.data;
  const [variant, setVariant] = useState<ReturnType<typeof getDefaultVariant>>(null);

  useEffect(() => {
    if (product) setVariant(getDefaultVariant(product));
  }, [product]);

  if (isApiError(query.error) && query.error.status === 404) return <NotFoundPage />;

  const title = product?.title ?? t('product.notFoundTitle');
  const description = product ? stripHtml(product.description) : '';

  return (
    <>
      <PageSeo
        resource="product"
        handle={handle}
        market={marketParams}
        fallback={{
          title: `${title} — BeNa Origins`,
          description: description || t('home.featuredBody'),
          path: `/products/${handle}`,
          image: product ? getPrimaryImage(product)?.url ?? null : null,
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('nav.catalog'), href: '/catalog' },
            { label: title },
          ]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />

        <div className={`${sectionSpacing} pt-2`}>
          {query.isLoading ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
              <Skeleton className="h-[min(62vh,560px)] w-full rounded-2xl" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-12 w-full rounded-full" />
                <Skeleton className="h-40 w-full rounded-card" />
              </div>
            </div>
          ) : query.isError || !product ? (
            <ErrorState
              title={t('product.notFoundTitle')}
              body={t('product.notFoundBody')}
              retryLabel={t('common.retry')}
              onRetry={() => void query.refetch()}
            />
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
              <ProductGallery product={product} />

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
                    {product.vendor || product.productType || t('catalog.eyebrow')}
                  </p>
                  <h1 className="mt-1 text-[clamp(26px,3vw,40px)] font-semibold tracking-tight">
                    {product.title}
                  </h1>
                </div>
                <PurchasePanel product={product} variant={variant} onVariantChange={setVariant} />
                <div className="border-t border-terra-100 pt-4">
                  <ProductFacts product={product} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {product ? <RelatedProducts product={product} /> : null}
    </>
  );
}
