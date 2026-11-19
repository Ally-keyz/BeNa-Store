import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/lib/cn';
import { formatMoney, formatUnitPrice, isOnSale } from '@/lib/money';
import { getAvailability, getDefaultVariant, getPrimaryImage, hasVariantChoice } from '@/lib/product';
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ProductImage } from '@/components/ui/ProductImage';
import { NewsletterForm } from '@/components/commerce/NewsletterForm';

export interface ProductCardProps {
  product: Product;
  /** First grid row images load eagerly for a better LCP. */
  priority?: boolean;
  className?: string;
}

/**
 * Catalog card. Square image, title left / price right, no card chrome.
 * Audit rules: coming-soon never adds to cart (#9), compare-at only when
 * strictly above price (#15), unit price hidden when unknown (#2).
 */
export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const { t } = useTranslation();
  const { addItem, openCart } = useCart();
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
      openCart();
    } catch {
      // The toast already explains the failure.
    } finally {
      setIsAdding(false);
    }
  };

  // On small screens the action stays visible; on desktop it appears on hover/focus.
  const actionVisibility =
    'pointer-events-auto opacity-100 transition-opacity duration-200 lg:pointer-events-none lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:opacity-100';

  return (
    <article className={cn('group flex h-full w-full flex-col', className)}>
      <div className="relative">
        <Link
          to={productHref}
          tabIndex={-1}
          aria-hidden="true"
          className="block w-full overflow-hidden rounded-card bg-terra-50"
        >
          <div className="aspect-square w-full overflow-hidden">
            <ProductImage
              image={image}
              alt={alt}
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
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

        {sellable ? (
          <div className={cn('absolute inset-x-3 bottom-3 z-10', actionVisibility)}>
            {multiVariant ? (
              <Link
                to={productHref}
                className={buttonVariants({ variant: 'primary', size: 'sm', fullWidth: true })}
              >
                {t('productCard.chooseOptions')}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <Button
                size="sm"
                fullWidth
                loading={isAdding}
                onClick={handleAdd}
              >
                {!isAdding ? <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                {t('productCard.quickAdd')}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col pt-2.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-ink">
            <Link to={productHref} className="rounded-sm hover:text-terra-700">
              {title}
            </Link>
          </h3>
          <div className="shrink-0 text-right">
            <span className="tabular block text-[15px] font-semibold text-ink">
              {formatMoney(price, { locale: formatLocale }) || t('productCard.priceUnavailable')}
            </span>
            {onSale && compareAt ? (
              <span className="tabular mt-0.5 block text-[13px] text-neutral-500 line-through">
                {formatMoney(compareAt, { locale: formatLocale })}
              </span>
            ) : null}
          </div>
        </div>

        {unitPrice ? (
          <p className="tabular mt-1 text-[12px] text-neutral-600">
            <span className="sr-only">{t('productCard.unitPriceLabel')}: </span>
            {unitPrice}
          </p>
        ) : null}

        {availability === 'coming-soon' ? (
          <Button variant="secondary" size="sm" fullWidth className="mt-3.5" onClick={() => setNotifyOpen(true)}>
            {t('productCard.notifyMe')}
          </Button>
        ) : null}
        {availability === 'sold-out' ? (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            disabled
            className="mt-3.5 !border-neutral-200 !bg-neutral-100 !text-neutral-500 disabled:!opacity-100"
          >
            {t('common.soldOut')}
          </Button>
        ) : null}
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
