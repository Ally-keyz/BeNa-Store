import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageSeo } from '@/features/seo/PageSeo';
import { usePolicies, useShipping } from '@/hooks/useContent';
import { useCart } from '@/context/CartContext';
import { useMarket } from '@/context/MarketContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/money';
import { sanitizeHtml } from '@/lib/sanitize';
import { pageContainer, sectionSpacing } from '@/lib/layout';

export function ShippingPage() {
  const { t } = useTranslation();
  const { country, formatLocale } = useMarket();
  const { cart } = useCart();
  const shipping = useShipping({ country, cartId: cart?.id });
  const policies = usePolicies();

  const countries = shipping.data?.markets.availableCountries ?? [];
  const rateExamples = shipping.data?.guidance.rateExamples ?? [];
  const euroAmounts = shipping.data?.policy?.euroAmounts ?? [];
  const deliveryGroups = shipping.data?.cartEstimate?.deliveryGroups ?? [];
  const policyBody = sanitizeHtml(policies.data?.policies.shipping?.body);

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('shipping.title')} — BeNa Origins`,
          description: t('shipping.body'),
          path: '/shipping',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('footer.shipping') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-8 sm:pt-10`}>
          <div className="max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('shipping.eyebrow')}
            </p>
            <h1 className="mt-2 text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
              {t('shipping.title')}
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-neutral-600">{t('shipping.body')}</p>
          </div>

          {shipping.isError ? (
            <ErrorState
              className="mt-10"
              title={t('shipping.errorTitle')}
              body={t('shipping.errorBody')}
              retryLabel={t('common.retry')}
              onRetry={() => void shipping.refetch()}
            />
          ) : shipping.isLoading ? (
            <div className="mt-10 space-y-4" aria-busy="true">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-32 w-full rounded-card" />
            </div>
          ) : (
            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
              <section className="rounded-card border border-terra-100 bg-white p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-ink">{t('shipping.marketsTitle')}</h2>
                <p className="mt-1 text-[13px] leading-6 text-neutral-600">
                  {t('shipping.marketsBody')}
                </p>
                {countries.length ? (
                  <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                    {countries.map((item) => (
                      <li
                        key={item.isoCode}
                        className="rounded-lg bg-terra-50 px-3 py-2 text-[13px] text-ink"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-neutral-500">({item.currency})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-[13px] leading-6 text-neutral-600">
                    {t('shipping.marketEmpty')}
                  </p>
                )}
                <p className="mt-5 text-[12px] leading-6 text-neutral-600">
                  {t('shipping.checkoutNote')}
                </p>
              </section>

              <section className="rounded-card border border-terra-100 bg-white p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-ink">{t('shipping.rateTitle')}</h2>
                <p className="mt-1 text-[13px] leading-6 text-neutral-600">{t('shipping.rateBody')}</p>
                {rateExamples.length || euroAmounts.length ? (
                  <ul className="mt-5 space-y-2 text-[13px] text-neutral-600">
                    {[...new Set([...rateExamples, ...euroAmounts])].map((example) => (
                      <li key={example} className="rounded-lg bg-terra-50 px-3 py-2">
                        {example}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-[13px] text-neutral-600">{t('shipping.noRates')}</p>
                )}
                <p className="mt-4 text-[12px] text-neutral-600">{t('shipping.rateNote')}</p>
              </section>
            </div>
          )}

          {cart && deliveryGroups.length ? (
            <section className="mt-10 rounded-card border border-terra-100 bg-white p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-ink">{t('shipping.cartTitle')}</h2>
              <p className="mt-1 text-[13px] leading-6 text-neutral-600">{t('shipping.cartBody')}</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                {deliveryGroups.map((group) => (
                  <div key={group.id}>
                    <ul className="space-y-2">
                      {group.options.map((option, index) => (
                        <li
                          key={`${group.id}-${index}`}
                          className="flex items-baseline justify-between gap-3 border-b border-terra-100 pb-2 text-[13px] text-neutral-600 last:border-0"
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
                  </div>
                ))}
              </div>
              <Link
                to="/cart"
                className="mt-5 inline-block rounded-sm text-[13px] font-medium text-terra-800 underline underline-offset-4 hover:text-ink"
              >
                {t('cart.viewCart')}
              </Link>
            </section>
          ) : null}

          <section className="mt-12 border-t border-terra-100 pt-10">
            <h2 className="text-lg font-semibold text-ink">{t('shipping.policyTitle')}</h2>
            {policyBody ? (
              <div
                className="mt-5 max-w-[760px] space-y-4 text-[15px] leading-7 text-neutral-700"
                dangerouslySetInnerHTML={{ __html: policyBody }}
              />
            ) : (
              <p className="mt-5 rounded-card border border-terra-100 bg-terra-50/70 p-5 text-[14px] leading-7 text-neutral-600">
                {t('shipping.policyFallback')}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
