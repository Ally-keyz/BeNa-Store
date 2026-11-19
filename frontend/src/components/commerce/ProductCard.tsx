import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/lib/cn';
import { formatMoney, formatUnitPrice, isOnSale } from '@/lib/money';
import {
  getAvailability,
  getDefaultVariant,
  getPrimaryImage,
  hasVariantChoice,
} from '@/lib/product';
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ProductImage } from '@/components/ui/ProductImage';
import { NewsletterForm } from '@/components/commerce/NewsletterForm';

export interface ProductCardProps {
  product: Product;
  /** First grid row images should load eagerly for a better LCP. */
  priority?: boolean;
  className?: string;
}

/**
 * Catalog card.
 *
 * - 4:5 imagery, 15px title, one pill action.
 * - "Coming soon" always wins over purchasable state (audit #9).
 * - Sale pricing is only shown when compare-at is strictly above price.
 * - Multi-variant products link to the product page instead of blind-adding.
 */
export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const { country, formatLocale } = useMarket();
  const [isAdding, setIsAdding] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const availability = getAvailability(product);
  const variant = getDefaultVariant(product);
  const image = getPrimaryImage(product);
  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = variant?.compareAtPrice ?? null;
  const onSale = availability === 'available' && isOnSale(price, compareAt);
  const unitPrice = formatUnitPrice(variant?.unitPrice, variant?.unitPriceMeasurement, {
    locale: formatLocale,
  });
  const sellable = availability === 'available' && Boolean(variant?.availableForSale);
  const multiVariant = hasVariantChoice(product);
  const productHref = `/products/${product.handle}`;
  const title = product.title;
  const alt = image?.altText?.trim() || t('productCard.imageAltFallback', { title });

  const handleAdd = async () => {
    if (!variant || !sellable) return;
    setIsAdding(true);
    try {
      await addItem({
        merchandiseId: variant.id,
        quantity: 1,
        countryCode: country,
        successMessage: t('productCard.added', { title }),
        errorMessage: t('productCard.addError'),
      });
    } catch {
      // The toast above already tells the shopper what happened.
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className={cn('group flex h-full flex-col', className)}>
      <div className="relative">
        <Link
          to={productHref}
          tabIndex={-1}
          aria-hidden="true"
          className="block overflow-hidden rounded-card bg-chocolate-50"
        >
          <div className="aspect-[4/5] w-full overflow-hidden">
            <ProductImage
              image={image}
              alt={alt}
              priority={priority}
              className="transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          </div>
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
          {availability === 'coming-soon' ? (
            <Badge tone="soon">{t('common.comingSoon')}</Badge>
          ) : availability === 'sold-out' ? (
            <Badge tone="soldout">{t('common.soldOut')}</Badge>
          ) : onSale ? (
            <Badge tone="sale">{t('common.sale')}</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        <h3 className="text-[15px] font-medium leading-snug text-ink">
          <Link to={productHref} className="rounded-sm hover:text-chocolate-700">
            {title}
          </Link>
        </h3>

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="tabular text-[15px] font-semibold text-ink">
            {formatMoney(price, { locale: formatLocale }) || t('productCard.priceUnavailable')}
          </span>
          {onSale && compareAt ? (
            <span className="tabular text-[13px] text-neutral-500 line-through">
              {formatMoney(compareAt, { locale: formatLocale })}
            </span>
          ) : null}
        </div>

        {unitPrice ? (
          <p className="tabular mt-0.5 text-[12px] text-neutral-600">
            <span className="sr-only">{t('productCard.unitPriceLabel')}: </span>
            {unitPrice}
          </p>
        ) : null}

        <div className="mt-3.5">
          {availability === 'coming-soon' ? (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              onClick={() => setNotifyOpen(true)}
            >
              {t('productCard.notifyMe')}
            </Button>
          ) : availability === 'sold-out' ? (
            <Button variant="secondary" size="sm" fullWidth disabled>
              {t('common.soldOut')}
            </Button>
          ) : multiVariant ? (
            <Link to={productHref} className={buttonVariants({ variant: 'secondary', size: 'sm', fullWidth: true })}>
              {t('productCard.chooseOptions')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              loading={isAdding}
              onClick={handleAdd}
            >
              {!isAdding ? <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {t('productCard.addToCart')}
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        title={t('productCard.notifyTitle')}
        description={t('productCard.notifyBody')}
        closeLabel={t('common.close')}
      >
        <NewsletterForm
          source={`product-notify:${product.handle}`}
          submitLabel={t('productCard.notifySubmit')}
          successMessage={t('productCard.notifySuccess')}
        />
      </Dialog>
    </article>
  );
}
