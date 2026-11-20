import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { AccountGate } from '@/features/account/AccountGate';
import { useAccountMe } from '@/hooks/useAccount';
import { useMarket } from '@/context/MarketContext';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { pageContainer, sectionSpacing } from '@/lib/layout';

function ProfilePanel() {
  const { t } = useTranslation();
  const { formatLocale } = useMarket();
  const query = useAccountMe(true);

  if (query.isLoading) return <Skeleton className="h-64 w-full rounded-card" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState
        title={t('account.sessionErrorTitle')}
        body={t('account.sessionErrorBody')}
        retryLabel={t('common.retry')}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const profile = query.data;
  const defaultAddress = profile.defaultAddress?.formatted.filter(Boolean).join(', ') || '';

  return (
    <section
      aria-label={t('account.profileTitle')}
      className="min-w-0 rounded-card border border-terra-100 bg-surface p-4 sm:p-8"
    >
      <h2 className="break-words text-lg font-semibold text-ink">{t('account.profileTitle')}</h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="break-words text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            {t('account.nameLabel')}
          </dt>
          <dd className="mt-1 break-words text-[14px] text-ink">{profile.displayName}</dd>
        </div>
        <div className="min-w-0">
          <dt className="break-words text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            {t('account.emailLabel')}
          </dt>
          <dd className="mt-1 break-all text-[14px] text-ink">{profile.email ?? '—'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="break-words text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            {t('account.phoneLabel')}
          </dt>
          <dd className="mt-1 break-words text-[14px] text-ink">{profile.phone ?? '—'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="break-words text-[12px] font-medium uppercase tracking-[0.12em] text-neutral-500">
            {t('account.defaultAddressTitle')}
          </dt>
          <dd className="mt-1 break-words text-[14px] leading-6 text-ink">
            {defaultAddress || t('account.noDefaultAddress')}
          </dd>
        </div>
      </dl>
      <p className="mt-6 break-words text-[12px] text-neutral-500">
        {new Intl.DateTimeFormat(formatLocale).format(new Date())}
      </p>
    </section>
  );
}

export function AccountPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('account.title')} — BeNa Origins`,
          description: t('account.body'),
          path: '/account',
          robots: 'noindex,follow',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('account.title') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-6 sm:pt-10`}>
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('account.eyebrow')}
            </p>
            <h1 className="mt-2 text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
              {t('account.title')}
            </h1>
            <p className="mt-3 text-[14px] leading-7 text-neutral-600">{t('account.body')}</p>
          </div>
          <div className="mt-8 max-w-[860px]">
            <AccountGate>
              <ProfilePanel />
            </AccountGate>
          </div>
        </div>
      </div>
    </>
  );
}
