import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { cn } from '@/lib/cn';
import { formatMoney, formatUnitPrice, isOnSale } from '@/lib/money';
import { getAvailability, getDefaultVariant, getPrimaryImage, hasVariantChoice } from '@/lib/product';
import { stripHtml } from '@/lib/sanitize';
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ProductImage } from '@/components/ui/ProductImage';
import { RestockForm } from '@/components/commerce/RestockForm';

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
  const description = stripHtml(product.descriptionHtml) || product.description;
  const alt = image?.altText?.trim() || t('productCard.imageAltFallback', { title });

  const handleAdd = async () => {
    if (!variant || !sellable) return;
    setIsAdding(true);
    try {
      await addItem({
        merchandiseId: variant.id,
        quantity: 1,
        countryCode: country,
        itemTitle: title,
        errorMessage: t('productCard.addError'),
      });
    } catch {
      // The toast already explains the failure.
    } finally {
      setIsAdding(false);
    }
  };

  const action = sellable ? (
    multiVariant ? (
      <Link
        to={productHref}
        className={cn(
          buttonVariants({ variant: 'primary', size: 'sm', fullWidth: true }),
          'min-h-11 lg:min-h-9',
        )}
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
        className="min-h-11 lg:min-h-9"
      >
        {!isAdding ? <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {t('productCard.quickAdd')}
      </Button>
    )
  ) : null;

  return (
    <motion.article
      className={cn('group flex h-full w-full flex-col', className)}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative">
        <Link
          to={productHref}
          tabIndex={-1}
          aria-hidden="true"
          className="block w-full overflow-hidden rounded-card bg-terra-50"
        >
          <div className="aspect-[11/12] w-full overflow-hidden sm:aspect-square">
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
            <Badge tone="sale">{t('productCard.onDiscount')}</Badge>
          ) : null}
        </div>

        {action ? (
          <div className="absolute inset-x-3 bottom-3 z-10 hidden transition-opacity duration-200 lg:block lg:pointer-events-none lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:opacity-100">
            {action}
          </div>
        ) : null}
      </div>

      {action ? <div className="mt-3 lg:hidden">{action}</div> : null}

      <div className="flex min-h-0 flex-1 flex-col pt-2.5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 break-words text-base font-medium leading-snug text-ink sm:text-[15px]">
              <Link to={productHref} className="rounded-sm hover:text-terra-700">
                {title}
              </Link>
            </h3>
            {description ? (
              <p className="line-clamp-1 mt-1 break-words text-[13px] leading-4 text-neutral-600 sm:text-[12px]">
                {description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 sm:block sm:shrink-0 sm:text-right">
            <span className="tabular block break-words text-[18px] font-bold text-terra-700">
              {formatMoney(price, { locale: formatLocale }) || t('productCard.priceUnavailable')}
            </span>
            {onSale && compareAt ? (
              <span className="tabular mt-0.5 block text-[14px] font-medium text-terra-600 line-through">
                {formatMoney(compareAt, { locale: formatLocale })}
              </span>
            ) : null}
          </div>
        </div>

        {unitPrice ? (
          <p className="tabular mt-1 break-words text-[12px] text-neutral-600">
            <span className="sr-only">{t('productCard.unitPriceLabel')}: </span>
            {unitPrice}
          </p>
        ) : null}

        {availability !== 'available' ? (
          <Button
            variant="restock"
            size="sm"
            fullWidth
            onClick={() => setNotifyOpen(true)}
            className="mt-3.5 min-h-11 lg:min-h-9"
          >
            {t('productCard.notifyMe')}
          </Button>
        ) : null}
      </div>

      <Dialog
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        title={t('productCard.notifyTitle')}
        description={t('productCard.notifyBody')}
        closeLabel={t('common.close')}
        className="max-w-md"
      >
        <RestockForm
          productHandle={product.handle}
          submitLabel={t('productCard.notifySubmit')}
          successMessage={t('productCard.notifySuccess')}
        />
      </Dialog>
    </motion.article>
  );
}
