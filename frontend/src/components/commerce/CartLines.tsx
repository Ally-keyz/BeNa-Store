import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import type { CartLine } from '@/types';
import { formatMoney } from '@/lib/money';
import { stripHtml } from '@/lib/sanitize';
import { useMarket } from '@/context/MarketContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { ProductImage } from '@/components/ui/ProductImage';
import { QuantityStepper } from './QuantityStepper';

export interface CartLinesProps {
  lines: CartLine[];
  compact?: boolean;
}

/** Shared cart line list for the full cart page and the header drawer. */
export function CartLines({ lines, compact = false }: CartLinesProps) {
  const { t } = useTranslation();
  const { formatLocale } = useMarket();
  const { updateLine, removeLine, isUpdating } = useCart();
  const { toast } = useToast();

  const run = async (task: () => Promise<void>) => {
    try {
      await task();
    } catch {
      toast({ title: t('errors.generic'), variant: 'error' });
    }
  };

  if (lines.length === 0) {
    return <p className="text-sm text-neutral-600">{t('cart.emptyBody')}</p>;
  }

  return (
    <ul className="divide-y divide-terra-100">
      {lines.map((line) => {
        const merchandise = line.merchandise;
        const productTitle = merchandise?.product.title ?? t('cart.lineUnavailable');
        const variantTitle = merchandise?.title;
        const isDefaultVariant = !variantTitle || /^default\s*title$/i.test(variantTitle.trim());
        const title = variantTitle && !isDefaultVariant && variantTitle !== productTitle
          ? `${productTitle} — ${variantTitle}`
          : productTitle;
        const options = (merchandise?.selectedOptions ?? [])
          .filter((option) => !/^default\s*title$/i.test(option.value.trim()))
          .map((option) => option.value.trim())
          .filter(Boolean)
          .join(' · ');
        const description = merchandise
          ? stripHtml(merchandise.product.descriptionHtml) || merchandise.product.description
          : '';
        return (
          <li key={line.id} className="flex gap-3 py-5 first:pt-0 sm:gap-4">
            <Link
              to={merchandise ? `/products/${merchandise.product.handle}` : '/catalog'}
              className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-terra-50 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
              aria-label={title}
            >
              <ProductImage
                image={merchandise?.image ?? null}
                alt={title}
                sizes="(min-width: 1024px) 96px, 64px"
                className="aspect-square"
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 break-words text-[15px] font-medium text-ink">{title}</p>
                  {options ? <p className="mt-0.5 text-[13px] text-neutral-600">{options}</p> : null}
                  {description ? (
                    <p className="line-clamp-1 mt-1 text-[12px] leading-4 text-neutral-600">
                      {description}
                    </p>
                  ) : null}
                  {merchandise && !merchandise.availableForSale ? (
                    <Badge tone="soldout" className="mt-2">
                      {t('cart.lineUnavailable')}
                    </Badge>
                  ) : null}
                </div>
                <p className="tabular shrink-0 text-[15px] font-semibold text-ink sm:text-right">
                  {formatMoney(line.cost.subtotalAmount, { locale: formatLocale })}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <QuantityStepper
                  value={line.quantity}
                  onChange={(quantity) => void run(() => updateLine(line.id, quantity))}
                  label={t('cart.quantityFor', { title })}
                  disabled={isUpdating || !merchandise?.availableForSale}
                />
                <button
                  type="button"
                  onClick={() => void run(() => removeLine(line.id))}
                  disabled={isUpdating}
                  aria-label={t('cart.removeItem', { title })}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] text-neutral-600 transition-colors hover:bg-terra-50 hover:text-terra-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {!compact ? <span className="hidden sm:inline">{t('cart.remove')}</span> : null}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
