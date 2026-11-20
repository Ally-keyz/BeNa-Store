import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';
import { useProducts } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { ProductGrid } from '@/components/commerce/ProductGrid';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { contentContainer } from '@/lib/layout';

export interface RelatedProductsProps {
  product: Product;
}

/** The only section below the product detail: hand-picked related products. */
export function RelatedProducts({ product }: RelatedProductsProps) {
  const { t } = useTranslation();
  const { marketParams } = useMarket();
  const query = useProducts({ first: 8, ...marketParams });

  const related = (query.data?.items ?? [])
    .filter((item) => item.handle !== product.handle)
    .slice(0, 4);

  if (!related.length) return null;

  return (
    <section className="border-t border-terra-100 py-12 pb-24 sm:py-16 sm:pb-24 lg:pb-16" aria-labelledby="related-products">
      <div className={contentContainer}>
        <SectionHeading
          eyebrow={t('product.relatedEyebrow')}
          title={<span id="related-products">{t('product.relatedTitle')}</span>}
        />
        <div className="mt-8">
          <ProductGrid products={related} />
        </div>
      </div>
    </section>
  );
}
