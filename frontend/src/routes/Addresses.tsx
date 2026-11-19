import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { AccountGate } from '@/features/account/AccountGate';
import { useAccountMe, useInfiniteAccountAddresses } from '@/hooks/useAccount';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { Pagination } from '@/components/ui/Pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { pageContainer, sectionSpacing } from '@/lib/layout';

function AddressesPanel() {
  const { t } = useTranslation();
  const query = useInfiniteAccountAddresses(true);
  const profile = useAccountMe(true);
  const defaultAddressId = profile.data?.defaultAddress?.id;
  const pages = query.data?.pages ?? [];
  const addresses = pages.flatMap((page) => page.items);
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
    <section aria-label={t('account.addressesTitle')}>
      <h2 className="text-lg font-semibold text-ink">{t('account.addressesTitle')}</h2>
      <p className="mt-1 text-[13px] leading-6 text-neutral-600">{t('account.addressesBody')}</p>
      {addresses.length === 0 ? (
        <p className="mt-5 rounded-card border border-terra-100 bg-terra-50/70 p-6 text-[14px] text-neutral-600">
          {t('account.addressesEmpty')}
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-card border border-terra-100 bg-white p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-ink">{address.name || t('account.addressesTitle')}</p>
                {address.id === defaultAddressId ? (
                  <Badge tone="neutral">{t('account.defaultBadge')}</Badge>
                ) : null}
              </div>
              <address className="mt-3 space-y-0.5 text-[13px] not-italic leading-6 text-neutral-600">
                {address.formatted.filter(Boolean).map((line, index) => (
                  <p key={`${address.id}-${index}`}>{line}</p>
                ))}
              </address>
              {address.phoneNumber ? (
                <p className="mt-3 text-[13px] text-neutral-600">{address.phoneNumber}</p>
              ) : null}
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
        className="mt-8 flex justify-center"
      />
    </section>
  );
}

export function AddressesPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('account.addressesTitle')} — BeNa Origins`,
          description: t('account.addressesBody'),
          path: '/account/addresses',
          robots: 'noindex,follow',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('account.title'), href: '/account' },
            { label: t('account.addressesTitle') },
          ]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-8 sm:pt-10`}>
          <h1 className="text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
            {t('account.addressesTitle')}
          </h1>
          <div className="mt-8 max-w-[860px]">
            <AccountGate returnTo="/account/addresses">
              <AddressesPanel />
            </AccountGate>
          </div>
        </div>
      </div>
    </>
  );
}
