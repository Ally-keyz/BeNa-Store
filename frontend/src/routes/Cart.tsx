import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { BuyerIdentityForm } from '@/features/cart/BuyerIdentityForm';
import { CartLines } from '@/components/commerce/CartLines';
import { CartSummary } from '@/components/commerce/CartSummary';
import { useShipping } from '@/hooks/useContent';
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { buttonVariants } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/money';
import { pageContainer, sectionSpacing } from '@/lib/layout';

export function CartPage() {
  const { t } = useTranslation();
  const { cart, isLoading } = useCart();
  const { country, formatLocale } = useMarket();
  const shipping = useShipping({
    country: cart?.buyerIdentity.countryCode ?? country,
    cartId: cart?.id,
  });
  const deliveryGroups = shipping.data?.cartEstimate?.deliveryGroups ?? [];

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
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('cart.title') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-8 sm:pt-10`}>
          <h1 className="text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
            {t('cart.title')}
          </h1>

          {isLoading ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12" aria-busy="true">
              <Skeleton className="h-64 w-full rounded-card" />
              <Skeleton className="h-96 w-full rounded-card" />
            </div>
          ) : !cart || cart.lines.length === 0 ? (
            <div className="mx-auto mt-10 max-w-xl rounded-card border border-terra-100 bg-terra-50/70 p-8 text-center">
              <p className="text-lg font-medium text-ink">{t('cart.emptyTitle')}</p>
              <p className="mt-2 text-[14px] leading-7 text-neutral-600">{t('cart.emptyBody')}</p>
              <Link to="/catalog" className={`${buttonVariants({ size: 'sm' })} mt-6`}>
                {t('cart.continueShopping')}
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
              <section aria-label={t('cart.title')}>
                <p className="mb-4 text-[13px] font-medium text-neutral-600" aria-live="polite">
                  {t('cart.itemCount', { count: cart.totalQuantity })}
                </p>
                <CartLines lines={cart.lines} />
              </section>

              <aside className="space-y-6 lg:sticky lg:top-24">
                <div className="rounded-card border border-terra-100 bg-white p-6">
                  <CartSummary cart={cart} />
                </div>

                <section className="rounded-card border border-terra-100 bg-white p-6">
                  <h2 className="text-base font-semibold text-ink">{t('cart.detailsTitle')}</h2>
                  <p className="mt-1 text-[13px] leading-6 text-neutral-600">
                    {t('cart.detailsBody')}
                  </p>
                  <div className="mt-5">
                    <BuyerIdentityForm cart={cart} />
                  </div>
                </section>

                <section className="rounded-card border border-terra-100 bg-white p-6">
                  <h2 className="text-base font-semibold text-ink">{t('cart.deliveryTitle')}</h2>
                  {deliveryGroups.length ? (
                    <ul className="mt-4 space-y-4">
                      {deliveryGroups.map((group) => (
                        <li key={group.id}>
                          <p className="text-[13px] font-medium text-ink">
                            {t('shipping.cartTitle')}
                          </p>
                          <ul className="mt-2 space-y-2">
                            {group.options.map((option, index) => (
                              <li
                                key={`${group.id}-${index}`}
                                className="flex items-baseline justify-between gap-3 text-[13px] text-neutral-600"
                              >
                                <span>{option.title || option.method}</span>
                                <span className="tabular font-medium text-ink">
                                  {formatMoney(
                                    { amount: option.amount, currencyCode: option.currencyCode },
                                    { locale: formatLocale },
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-[13px] leading-6 text-neutral-600">
                      {t('cart.noDeliveryOptions')}
                    </p>
                  )}
                  <Link
                    to="/shipping"
                    className="mt-4 inline-block rounded-sm text-[13px] font-medium text-terra-800 underline underline-offset-4 hover:text-ink"
                  >
                    {t('footer.shipping')}
                  </Link>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
