import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { AccountGate } from '@/features/account/AccountGate';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { buttonVariants } from '@/components/ui/Button';
import { pageContainer, sectionSpacing } from '@/lib/layout';

export function AccountLoginPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('account.signInTitle')} — BeNa Origins`,
          description: t('account.signInBody'),
          path: '/account/login',
          robots: 'noindex,follow',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('account.title'), href: '/account' },
            { label: t('account.signInAction') },
          ]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-6 sm:pt-10`}>
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('account.eyebrow')}
            </p>
            <h1 className="mt-2 text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
              {t('account.signInTitle')}
            </h1>
          </div>
          <div className="mt-8 max-w-[860px]">
            <AccountGate returnTo="/account">
              <div className="min-w-0 rounded-card border border-terra-100 bg-terra-50/70 p-4 sm:p-6">
                <p className="break-words text-[14px] leading-7 text-neutral-600">{t('account.body')}</p>
                <Link
                  to="/account"
                  className={`${buttonVariants({ size: 'sm' })} mt-5 min-h-11 sm:min-h-9`}
                >
                  {t('account.title')}
                </Link>
              </div>
            </AccountGate>
          </div>
        </div>
      </div>
    </>
  );
}
