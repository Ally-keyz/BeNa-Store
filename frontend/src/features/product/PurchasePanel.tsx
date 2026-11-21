import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, RotateCcw, Truck } from 'lucide-react';
import type { Product, ProductVariant } from '@/types';
import { BRAND } from '@/config';
import { formatMoney, isOnSale, toAmount } from '@/lib/money';
import { getAvailability } from '@/lib/product';
import {
  formatWeightKg,
  getKilogramPackageWeightKg,
  getPricePerKg,
} from '@/lib/units';
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { Button, buttonVariants } from '@/components/ui/Button';
import { QuantityStepper } from '@/components/commerce/QuantityStepper';
import { VariantPicker } from './VariantPicker';

export interface PurchasePanelProps {
  product: Product;
  variant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAdd: () => void;
}

/** Price, options, quantity and purchase cues. No payment UI is rendered. */
export function PurchasePanel({
  product,
  variant,
  onVariantChange,
  quantity,
  onQuantityChange,
  onAdd,
}: PurchasePanelProps) {
  const { t } = useTranslation();
  const { formatLocale } = useMarket();
  const { isUpdating } = useCart();

  const availability = getAvailability(product);
  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const compareAt = variant?.compareAtPrice ?? null;
  const onSale = isOnSale(price, compareAt);
  const weightContext = {
    handle: product.handle,
    title: product.title,
    productType: product.productType,
    tags: product.tags,
    variantTitle: variant?.title,
    selectedOptions: variant?.selectedOptions,
    measurement: variant?.unitPriceMeasurement,
  };
  const pricePerKg = getPricePerKg({
    unitPrice: variant?.unitPrice,
    unitPriceMeasurement: variant?.unitPriceMeasurement,
  });
  const packageWeightKg = getKilogramPackageWeightKg(weightContext);
  const quantityUnit = packageWeightKg
    ? t('common.packageWeight', { weight: formatWeightKg(packageWeightKg, formatLocale) })
    : t('common.unit', { count: quantity });
  const totalAmount =
    price && quantity > 1
      ? { amount: (toAmount(price) * quantity).toFixed(2), currencyCode: price.currencyCode }
      : null;
  const canBuy = availability === 'available' && Boolean(variant?.availableForSale);

  const availabilityCopy =
    availability === 'coming-soon'
      ? t('productInfo.comingSoonBody')
      : t('productInfo.soldOutBody');
  const mailto = `mailto:${BRAND.ordersEmail}?subject=${encodeURIComponent(
    `${t('productInfo.askAvailability')}: ${product.title}`,
  )}&body=${encodeURIComponent(`${t('productInfo.askAvailability')}: ${product.title}\n${product.url}`)}`;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="tabular text-[26px] font-semibold text-ink">{formatMoney(price, { locale: formatLocale })}</p>
          {onSale ? (
            <span className="tabular text-[15px] text-neutral-500 line-through">
              {formatMoney(compareAt, { locale: formatLocale })}
            </span>
          ) : null}
        </div>
        {pricePerKg ? (
          <p className="mt-1 text-[13px] text-neutral-600">
            <span className="sr-only">{t('common.pricePerKgLabel')}: </span>
            {t('common.pricePerKg', {
              price: formatMoney(pricePerKg, {
                locale: formatLocale,
                alwaysDecimals: true,
              }),
            })}
          </p>
        ) : null}
        {totalAmount ? (
          <p className="mt-1 tabular text-[20px] font-bold text-terra-700">
            {t('productInfo.total')}: {formatMoney(totalAmount, { locale: formatLocale })}
          </p>
        ) : null}
        {!price ? <p className="mt-1 text-[13px] text-neutral-600">{t('productInfo.priceUnavailable')}</p> : null}
        {onSale ? (
          <details className="mt-3 rounded-xl border border-terra-100 bg-terra-50/60 px-3 py-2 text-[12px] leading-5 text-neutral-600">
            <summary className="min-h-9 cursor-pointer font-medium text-ink">
              {t('remediation.priceInfoTitle')}
            </summary>
            <p className="mt-1">{t('remediation.priceInfoBody')}</p>
          </details>
        ) : null}
      </div>

      <VariantPicker product={product} value={variant} onChange={onVariantChange} />

      {canBuy ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">{t('common.quantity')}</p>
              <QuantityStepper
                value={quantity}
                onChange={onQuantityChange}
                label={t('productInfo.quantityLabel', { title: product.title })}
                unit={quantityUnit}
                disabled={isUpdating}
              />
            </div>
            <Button
              size="lg"
              className="min-w-[180px] flex-1"
              onClick={onAdd}
              loading={isUpdating}
              data-testid="add-to-cart"
            >
              {t('product.addToCart')}
            </Button>
          </div>
          <p className="text-[12px] text-neutral-600">{t('product.shippingNote')}</p>
        </>
      ) : (
        <div className="rounded-card border border-terra-100 bg-terra-50 p-4 sm:p-5">
          <p className="font-medium text-ink">
            {availability === 'coming-soon' ? t('productInfo.comingSoonTitle') : t('productInfo.soldOutTitle')}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-neutral-600">{availabilityCopy}</p>
          <a href={mailto} className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} mt-4`}>
            {t('productInfo.askAvailability')}
          </a>
        </div>
      )}

      <ul className="space-y-2 border-t border-terra-100 pt-3 text-[12px] leading-5 text-neutral-600">
        <li className="flex gap-3">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-terra-700" aria-hidden="true" />
          <span>
            {t('productInfo.deliveryCue')}{' '}
            <Link to="/shipping" className="rounded-sm text-terra-800 underline underline-offset-2 hover:text-ink">
              {t('footer.shipping')}
            </Link>
          </span>
        </li>
        <li className="flex gap-3">
          <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-terra-700" aria-hidden="true" />
          <span>
            {t('productInfo.returnsCue')}{' '}
            <Link to="/legal/withdrawal" className="rounded-sm text-terra-800 underline underline-offset-2 hover:text-ink">
              {t('footer.withdrawal')}
            </Link>
          </span>
        </li>
        <li className="flex gap-3">
          <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-terra-700" aria-hidden="true" />
          <span>
            {t('productInfo.supportCue')}{' '}
            <Link to="/contact" className="rounded-sm text-terra-800 underline underline-offset-2 hover:text-ink">
              {t('footer.contact')}
            </Link>
          </span>
        </li>
      </ul>
    </div>
  );
}
