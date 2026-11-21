import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LockKeyhole } from 'lucide-react';
import type { Cart } from '@/types';
import { formatMoney } from '@/lib/money';
import { useMarket } from '@/context/MarketContext';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface CartSummaryProps {
  cart: Cart;
  compact?: boolean;
}

export function useCartSummary(cart: Cart) {
  const { formatLocale } = useMarket();
  const subtotal = formatMoney(cart.cost.subtotalAmount, { locale: formatLocale });
  const canCheckout =
    cart.lines.length > 0 &&
    cart.checkout.hostedBy === 'shopify' &&
    Boolean(cart.checkoutUrl);

  const onCheckout = () => {
    if (canCheckout) window.location.assign(cart.checkoutUrl);
  };

  return { subtotal, canCheckout, onCheckout };
}

/** Order review and Shopify-hosted checkout handoff. No payment form is rendered. */
export function CartSummary({ cart, compact = false }: CartSummaryProps) {
  const { t } = useTranslation();
  const { applyDiscount, isUpdating } = useCart();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const { subtotal, canCheckout, onCheckout } = useCartSummary(cart);

  const onDiscount = async (event: FormEvent) => {
    event.preventDefault();
    const value = code.trim();
    if (!value) return;
    try {
      await applyDiscount(value);
      setCode('');
      toast({ title: t('cart.discountApplied'), variant: 'success' });
    } catch {
      toast({ title: t('cart.discountError'), variant: 'error' });
    }
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {!compact ? (
        <form onSubmit={(event) => void onDiscount(event)} className="flex items-end gap-2">
          <Input
            label={t('cart.discountLabel')}
            hideLabel
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t('cart.discountPlaceholder')}
            autoComplete="off"
            containerClassName="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={isUpdating || !code.trim()}>
            {t('cart.applyDiscount')}
          </Button>
        </form>
      ) : null}

      {cart.discountCodes.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={t('cart.discountLabel')}>
          {cart.discountCodes.map((discount) => (
            <li
              key={discount.code}
              className="rounded-full bg-terra-50 px-3 py-1 text-[12px] text-terra-900"
            >
              {discount.code}
              {discount.applicable ? ` · ${t('cart.discountApplied')}` : ''}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex items-baseline justify-between border-t border-terra-100 pt-4">
        <span className="text-sm font-medium text-ink">{t('cart.subtotal')}</span>
        <span className="tabular text-lg font-semibold text-ink">{subtotal}</span>
      </div>

      <Button size="lg" fullWidth onClick={onCheckout} disabled={!canCheckout}>
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        {t('cart.checkout')}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-neutral-600">
        {t('cart.checkoutNote')}
      </p>
    </div>
  );
}
