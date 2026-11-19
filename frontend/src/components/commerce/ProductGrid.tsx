import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProductCard } from './ProductCard';

export interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  className?: string;
  /** Number of skeletons to show while loading. */
  skeletonCount?: number;
}

/** Shared 4/3/2-column product grid with matching square skeletons. */
export function ProductGrid({
  products,
  loading = false,
  className,
  skeletonCount = 8,
}: ProductGridProps) {
  const { t } = useTranslation();
  const classes = cn('grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6', className);

  if (loading) {
    return (
      <div className={classes} aria-label={t('a11y.loading')} aria-busy="true">
        {Array.from({ length: skeletonCount }, (_, index) => (
          <div key={index}>
            <Skeleton className="aspect-square w-full rounded-card" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={classes}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < 4} />
      ))}
    </div>
  );
}
