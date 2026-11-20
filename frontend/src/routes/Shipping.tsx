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
  const hasPolicyTable = /<table\b/i.test(policyBody);
  const policyHtmlClasses =
    'mt-5 max-w-full space-y-4 overflow-x-auto text-[15px] leading-7 text-neutral-700 [&_a]:break-all [&_code]:break-all [&_li]:break-words [&_p]:break-words [&_p]:hyphens-auto [&_h1]:break-words [&_h2]:break-words [&_h3]:break-words [&_blockquote]:break-words [&_table]:w-full [&_table]:min-w-[30rem] [&_table]:border-collapse [&_table]:text-left [&_th]:border [&_th]:border-terra-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:break-words [&_td]:border [&_td]:border-terra-100 [&_td]:px-2 [&_td]:py-1.5 [&_td]:align-top [&_td]:break-words';

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
        <div className={`${sectionSpacing} pt-6 sm:pt-10`}>
          <div className="min-w-0 max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('shipping.eyebrow')}
            </p>
            <h1 className="mt-2 text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
              {t('shipping.title')}
            </h1>
            <p className="mt-4 break-words text-[15px] leading-7 text-neutral-600">{t('shipping.body')}</p>
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
              <section className="min-w-0 rounded-card border border-terra-100 bg-surface p-4 sm:p-8">
                <h2 className="break-words text-lg font-semibold text-ink">{t('shipping.marketsTitle')}</h2>
                <p className="mt-1 break-words text-[13px] leading-6 text-neutral-600">
                  {t('shipping.marketsBody')}
                </p>
                {countries.length ? (
                  <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                    {countries.map((item) => (
                      <li
                        key={item.isoCode}
                        className="min-w-0 break-words rounded-lg bg-terra-50 px-3 py-2 text-[13px] text-ink"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-1.5 text-neutral-500 sm:ml-2">({item.currency})</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 break-words text-[13px] leading-6 text-neutral-600">
                    {t('shipping.marketEmpty')}
                  </p>
                )}
                <p className="mt-5 break-words text-[12px] leading-6 text-neutral-600">
                  {t('shipping.checkoutNote')}
                </p>
              </section>

              <section className="min-w-0 rounded-card border border-terra-100 bg-surface p-4 sm:p-8">
                <h2 className="break-words text-lg font-semibold text-ink">{t('shipping.rateTitle')}</h2>
                <p className="mt-1 break-words text-[13px] leading-6 text-neutral-600">{t('shipping.rateBody')}</p>
                {rateExamples.length || euroAmounts.length ? (
                  <ul className="mt-5 space-y-2 text-[13px] text-neutral-600">
                    {[...new Set([...rateExamples, ...euroAmounts])].map((example) => (
                      <li key={example} className="break-words rounded-lg bg-terra-50 px-3 py-2">
                        {example}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 break-words text-[13px] text-neutral-600">{t('shipping.noRates')}</p>
                )}
                <p className="mt-4 break-words text-[12px] text-neutral-600">{t('shipping.rateNote')}</p>
              </section>
            </div>
          )}

          {cart && deliveryGroups.length ? (
            <section className="mt-10 min-w-0 rounded-card border border-terra-100 bg-surface p-4 sm:p-8">
              <h2 className="break-words text-lg font-semibold text-ink">{t('shipping.cartTitle')}</h2>
              <p className="mt-1 break-words text-[13px] leading-6 text-neutral-600">{t('shipping.cartBody')}</p>
              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                {deliveryGroups.map((group) => (
                  <div key={group.id} className="min-w-0">
                    <ul className="space-y-2">
                      {group.options.map((option, index) => (
                        <li
                          key={`${group.id}-${index}`}
                          className="flex flex-col items-start gap-1 border-b border-terra-100 pb-2 text-[13px] text-neutral-600 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                        >
                          <span className="min-w-0 break-words">{option.title || option.method}</span>
                          <span className="tabular shrink-0 break-words font-medium text-ink">
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
                className="mt-4 inline-flex min-h-11 items-center rounded-sm text-[13px] font-medium text-terra-800 underline underline-offset-4 hover:text-ink sm:min-h-0"
              >
                {t('cart.viewCart')}
              </Link>
            </section>
          ) : null}

          <section className="mt-10 min-w-0 border-t border-terra-100 pt-8 sm:mt-12 sm:pt-10">
            <h2 className="break-words text-lg font-semibold text-ink">{t('shipping.policyTitle')}</h2>
            {policyBody ? (
              <div
                role={hasPolicyTable ? 'region' : undefined}
                tabIndex={hasPolicyTable ? 0 : undefined}
                aria-label={hasPolicyTable ? t('shipping.policyTitle') : undefined}
                className={policyHtmlClasses}
                dangerouslySetInnerHTML={{ __html: policyBody }}
              />
            ) : (
              <p className="mt-5 break-words rounded-card border border-terra-100 bg-terra-50/70 p-4 text-[14px] leading-7 text-neutral-600 sm:p-5">
                {t('shipping.policyFallback')}
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
