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
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/money';
import { pageContainer, sectionSpacing } from '@/lib/layout';
import { getAvailability, getDefaultVariant, getPrimaryImage } from '@/lib/product';
import { stripHtml } from '@/lib/sanitize';
import { NotFoundPage } from './NotFoundPage';

export function ProductPage() {
  const { handle = '' } = useParams();
  const { t } = useTranslation();
  const { marketParams, country, formatLocale } = useMarket();
  const { addItem, isUpdating } = useCart();
  const query = useProduct(handle, marketParams);
  const product = query.data;
  const [variant, setVariant] = useState<ReturnType<typeof getDefaultVariant>>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (product) setVariant(getDefaultVariant(product));
  }, [product]);

  const canBuy = product
    ? getAvailability(product) === 'available' && Boolean(variant?.availableForSale)
    : false;

  const onAdd = () => {
    if (!variant || !product || !canBuy) return;
    void addItem({
      merchandiseId: variant.id,
      quantity,
      countryCode: country,
      itemTitle: product.title,
      errorMessage: t('productInfo.addError'),
    }).catch(() => undefined);
  };

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
      <div className={`${pageContainer} pb-40 lg:pb-0`}>
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
              <Skeleton className="h-[min(44dvh,420px)] w-full rounded-2xl sm:h-[min(62vh,560px)]" />
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
                  <h1 className="mt-1 break-words text-[clamp(26px,3vw,40px)] font-semibold tracking-tight [overflow-wrap:anywhere]">
                    {product.title}
                  </h1>
                </div>
                <PurchasePanel
                  product={product}
                  variant={variant}
                  onVariantChange={setVariant}
                  quantity={quantity}
                  onQuantityChange={setQuantity}
                  onAdd={onAdd}
                />
                <div className="border-t border-terra-100 pt-4">
                  <ProductFacts product={product} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {product && variant && canBuy ? (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] border-t border-terra-100 bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
          <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3">
            <p className="tabular min-w-0 truncate text-lg font-semibold text-ink">
              <span className="sr-only">{t('productInfo.total')}: </span>
              {formatMoney(variant.price, { locale: formatLocale })}
            </p>
            <Button
              size="md"
              onClick={onAdd}
              loading={isUpdating}
              data-testid="mobile-add-to-cart"
              className="shrink-0 px-5"
            >
              {t('product.addToCart')}
            </Button>
          </div>
        </div>
      ) : null}

      {product ? <RelatedProducts product={product} /> : null}
    </>
  );
}
