import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pageContainer, sectionSpacing } from '@/lib/layout';
import { buttonVariants } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProductCard } from '@/components/commerce/ProductCard';
import { useProducts } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { errorMessageKey, isApiError } from '@/api/errors';

function ProductSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5] w-full rounded-card" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <Skeleton className="mt-3 h-9 w-full rounded-full" />
    </div>
  );
}

export function FeaturedProducts() {
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const query = useProducts({ first: 8, ...marketParams });
  const products = query.data?.items ?? [];

  return (
    <section className={sectionSpacing} aria-labelledby="home-featured">
      <div className={pageContainer}>
        <SectionHeading
          eyebrow={t('home.featuredEyebrow')}
          title={<span id="home-featured">{t('home.featuredHeading')}</span>}
          body={t('home.featuredBody')}
          action={
            <Link
              to="/shop"
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'gap-1.5')}
            >
              {t('home.featuredCta')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          }
        />

        {query.isLoading ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {[0, 1, 2, 3].map((item) => (
              <ProductSkeleton key={item} />
            ))}
          </div>
        ) : query.isError ? (
          <div className="mt-8 rounded-card border border-chocolate-100 bg-chocolate-50/60 p-6" role="alert">
            <p className="font-medium text-ink">{t('common.errorTitle')}</p>
            <p className="mt-1 text-sm text-neutral-600">
              {t(errorMessageKey(isApiError(query.error) ? query.error.code : undefined))}
            </p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="mt-4 text-sm font-medium text-chocolate-800 underline underline-offset-4 hover:text-ink"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : products.length === 0 ? (
          <p className="mt-8 rounded-card border border-chocolate-100 bg-chocolate-50/60 p-6 text-sm text-neutral-600">
            {t('home.emptyFeatured')}
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 4} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
