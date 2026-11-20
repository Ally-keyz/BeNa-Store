import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { AccountGate } from '@/features/account/AccountGate';
import { useInfiniteAccountOrders } from '@/hooks/useAccount';
import { useMarket } from '@/context/MarketContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/format';
import { pageContainer, sectionSpacing } from '@/lib/layout';

function OrdersPanel() {
  const { t } = useTranslation();
  const { formatLocale } = useMarket();
  const query = useInfiniteAccountOrders(true);
  const pages = query.data?.pages ?? [];
  const orders = pages.flatMap((page) => page.items);
  const hasNextPage = pages[pages.length - 1]?.hasNextPage ?? false;

  if (query.isLoading) return <Skeleton className="h-72 w-full rounded-card" />;
  if (query.isError) {
    return (
      <ErrorState
        title={t('account.sessionErrorTitle')}
        body={t('account.sessionErrorBody')}
        retryLabel={t('common.retry')}
        onRetry={() => void query.refetch()}
      />
    );
  }

  return (
    <section aria-label={t('account.ordersTitle')}>
      <h2 className="text-lg font-semibold text-ink">{t('account.ordersTitle')}</h2>
      <p className="mt-1 text-[13px] leading-6 text-neutral-600">{t('account.ordersBody')}</p>
      {orders.length === 0 ? (
        <p className="mt-5 break-words rounded-card border border-terra-100 bg-terra-50/70 p-4 text-[14px] text-neutral-600 sm:p-6">
          {t('account.ordersEmpty')}
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="min-w-0 rounded-card border border-terra-100 bg-surface p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium text-ink">
                    {t('account.orderNumber', { number: order.number })}
                  </p>
                  <p className="mt-1 break-words text-[13px] text-neutral-600">
                    {t('account.orderDate', { date: formatDate(order.processedAt, formatLocale) })}
                  </p>
                </div>
                <p className="tabular shrink-0 break-words text-[15px] font-semibold text-ink">
                  {formatMoney(order.totalPrice, { locale: formatLocale })}
                </p>
              </div>
              <p className="mt-3 break-words text-[13px] text-neutral-600">
                {t('account.orderStatus', { status: order.fulfillmentStatus })}
              </p>
              <ul className="mt-3 space-y-1 text-[13px] text-neutral-600">
                {order.lines.map((line, index) => (
                  <li key={`${order.id}-${index}`} className="break-words">
                    {line.quantity} × {line.title}
                  </li>
                ))}
              </ul>
              <a
                href={order.statusPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-11 items-center break-all rounded-sm text-[13px] font-medium text-terra-800 underline underline-offset-4 hover:text-ink sm:min-h-0"
              >
                {t('account.orderView')}
              </a>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        hasNextPage={hasNextPage}
        loading={query.isFetchingNextPage}
        onLoadMore={() => void query.fetchNextPage()}
        label={t('catalog.loadMore')}
        loadingLabel={t('common.loading')}
        className="mt-8 flex flex-wrap justify-center gap-2"
      />
    </section>
  );
}

export function OrdersPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('account.ordersTitle')} — BeNa Origins`,
          description: t('account.ordersBody'),
          path: '/account/orders',
          robots: 'noindex,follow',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('account.title'), href: '/account' },
            { label: t('account.ordersTitle') },
          ]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-6 sm:pt-10`}>
          <h1 className="break-words text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
            {t('account.ordersTitle')}
          </h1>
          <div className="mt-8 max-w-[860px]">
            <AccountGate returnTo="/account/orders">
              <OrdersPanel />
            </AccountGate>
          </div>
        </div>
      </div>
    </>
  );
}
