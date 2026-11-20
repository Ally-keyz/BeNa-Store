import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { Cart } from '@/types';
import { PageSeo } from '@/features/seo/PageSeo';
import { CartLines } from '@/components/commerce/CartLines';
import { CartSummary, useCartSummary } from '@/components/commerce/CartSummary';
import { useShipping } from '@/hooks/useContent';
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { pageContainer, sectionSpacing } from '@/lib/layout';

/**
 * Shape language inside the cart: buttons are pills (rounded-full),
 * everything else (inputs, steppers, thumbnails) is rounded-2xl.
 * Applied to CartLines / CartSummary without editing them.
 * Remove once those components are styled at the source.
 */
const unify =
  '[&_button]:rounded-full [&_a]:rounded-full ' +
  '[&_input]:rounded-2xl [&_div.rounded-full]:rounded-2xl [&_img]:rounded-2xl';

function MobileCheckoutBar({ cart }: { cart: Cart }) {
  const { t } = useTranslation();
  const { subtotal, canCheckout, onCheckout } = useCartSummary(cart);

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[60] border-t border-terra-100 bg-surface/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
            {t('cart.subtotal')}
          </p>
          <p className="tabular truncate text-lg font-semibold text-ink">{subtotal}</p>
        </div>
        <Button
          size="md"
          onClick={onCheckout}
          disabled={!canCheckout}
          data-testid="mobile-checkout"
          className="shrink-0"
        >
          {t('cart.checkout')}
        </Button>
      </div>
    </div>
  );
}

export function CartPage() {
  const { t } = useTranslation();
  const { cart, isLoading } = useCart();
  const { country } = useMarket();

  useShipping({
    country: cart?.buyerIdentity.countryCode ?? country,
    cartId: cart?.id,
  });

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('cart.title')} — BeNa Origins`,
          description: t('cart.checkoutNote'),
          path: '/cart',
          robots: 'noindex,follow',
        }}
      />

      <div className={`${pageContainer} pb-40 lg:pb-0`}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('cart.title') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6 text-sm"
        />

        <div className={`${sectionSpacing} pt-8 sm:pt-10`}>
          {isLoading ? (
            <div
              className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16"
              aria-busy="true"
            >
              <div className="space-y-4">
                <Skeleton className="h-7 w-40 rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
              <Skeleton className="h-72 w-full rounded-2xl" />
            </div>
          ) : !cart || cart.lines.length === 0 ? (
            <div className="max-w-sm py-8">
              <h1 className="text-xl font-semibold tracking-tight text-ink">
                {t('cart.emptyTitle')}
              </h1>
              <p className="mt-2 text-sm leading-6 text-neutral-500">{t('cart.emptyBody')}</p>
              <Link
                to="/catalog"
                className={`${buttonVariants({ size: 'sm' })} mt-6 !rounded-full`}
              >
                {t('cart.continueShopping')}
              </Link>
            </div>
          ) : (
            <div className={unify}>
              <header className="mb-6 flex items-baseline justify-between gap-4">
                <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
                  {t('cart.title')}
                </h1>
                <p className="text-sm tabular-nums text-neutral-500" aria-live="polite">
                  {t('cart.itemCount', { count: cart.totalQuantity })}
                </p>
              </header>

              <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
                <div className="min-w-0 border-t border-neutral-200 pt-6">
                  <CartLines lines={cart.lines} />
                </div>

                <aside className="space-y-6 lg:sticky lg:top-24">
                  <div className="rounded-2xl border border-neutral-200 bg-surface p-4 sm:p-5">
                    <CartSummary cart={cart} />
                  </div>

                  <section className="px-1">
                    <h2 className="text-sm font-medium text-ink">{t('cart.detailsTitle')}</h2>
                    <p className="mt-1.5 text-[13px] leading-6 text-neutral-500">
                      {t('cart.detailsBody')}
                    </p>
                  </section>
                </aside>
              </div>
            </div>
          )}
        </div>
      </div>

      {cart && cart.lines.length > 0 ? <MobileCheckoutBar cart={cart} /> : null}
    </>
  );
}