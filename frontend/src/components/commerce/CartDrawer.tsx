import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Drawer } from '@/components/ui/Drawer';
import { buttonVariants } from '@/components/ui/Button';
import { CartLines } from './CartLines';
import { CartSummary } from './CartSummary';

/** Header cart drawer: review lines, then hand off to Shopify-hosted checkout. */
export function CartDrawer() {
  const { t } = useTranslation();
  const { cart, isOpen, closeCart, isLoading } = useCart();

  const footer = cart && cart.lines.length > 0 ? <CartSummary cart={cart} compact /> : null;

  return (
    <Drawer
      open={isOpen}
      onClose={closeCart}
      title={t('cart.title')}
      closeLabel={t('common.close')}
      side="right"
      footer={footer}
    >
      {isLoading ? (
        <p className="text-sm text-neutral-600" role="status">
          {t('cart.loading')}
        </p>
      ) : !cart || cart.lines.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
          <p className="text-base font-medium text-ink">{t('cart.emptyTitle')}</p>
          <p className="mt-1 text-sm text-neutral-600">{t('cart.emptyBody')}</p>
          <Link
            to="/catalog"
            onClick={closeCart}
            className={`${buttonVariants({ size: 'sm' })} mt-5`}
          >
            {t('cart.continueShopping')}
          </Link>
        </div>
      ) : (
        <>
          <CartLines lines={cart.lines} compact />
          <Link
            to="/cart"
            onClick={closeCart}
            className="mt-5 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-terra-800 underline underline-offset-4 hover:text-ink"
          >
            {t('cart.viewCart')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </>
      )}
    </Drawer>
  );
}
