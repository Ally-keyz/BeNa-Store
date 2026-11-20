import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BRAND } from '@/config';
import type { PolicyBundle } from '@/types';
import { PageSeo } from '@/features/seo/PageSeo';
import { PolicyDocument } from '@/features/policies/PolicyDocument';
import { WithdrawalForm } from '@/features/policies/WithdrawalForm';
import { usePolicies } from '@/hooks/useContent';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { pageContainer, sectionSpacing } from '@/lib/layout';
import { NotFoundPage } from './NotFoundPage';

interface LegalPageConfig {
  titleKey: string;
  policyKey?: keyof PolicyBundle['policies'];
  placeholder?: boolean;
}

const LEGAL_PAGES: Record<string, LegalPageConfig> = {
  impressum: { titleKey: 'legal.titleImpressum', policyKey: 'legalNotice', placeholder: true },
  privacy: { titleKey: 'legal.titlePrivacy', policyKey: 'privacy' },
  withdrawal: { titleKey: 'legal.titleWithdrawal' },
  terms: { titleKey: 'legal.titleTerms', policyKey: 'termsOfService' },
  refund: { titleKey: 'legal.titleRefund', policyKey: 'refund' },
  shipping: { titleKey: 'legal.titleShipping', policyKey: 'shipping' },
};

export function LegalPage() {
  const { page = '' } = useParams();
  const { t } = useTranslation();
  const policies = usePolicies();
  const config = LEGAL_PAGES[page];

  if (!config) return <NotFoundPage />;

  const title = t(config.titleKey);
  const policy = config.policyKey ? policies.data?.policies[config.policyKey] : null;
  const isWithdrawal = page === 'withdrawal';
  const placeholder = Boolean(config.placeholder);
  const robots = placeholder || (!isWithdrawal && !policy) ? 'noindex,follow' : 'index,follow';
  const description = isWithdrawal ? t('remediation.withdrawalIntro') : t('legal.placeholderBody');

  return (
    <>
      <PageSeo
        fallback={{
          title: `${title} — ${BRAND.name}`,
          description,
          path: `/legal/${page}`,
          robots,
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('legal.eyebrow') }, { label: title }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-6 sm:pt-10`}>
          {page === 'impressum' ? (
            <div className="mx-auto mb-8 min-w-0 max-w-[760px] rounded-card border border-terra-100 bg-surface p-4 sm:p-8">
              <h2 className="break-words text-[13px] font-semibold uppercase tracking-[0.14em] text-terra-700">
                {t('legal.companyTitle')}
              </h2>
              <dl className="mt-4 space-y-3 text-[14px] leading-6 text-neutral-600">
                <div className="min-w-0">
                  <dt className="break-words font-medium text-ink">{t('legal.companyTitle')}</dt>
                  <dd className="break-words">{BRAND.legalName}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="break-words font-medium text-ink">{t('legal.addressTitle')}</dt>
                  <dd className="break-words">
                    {BRAND.address.street}
                    <br />
                    {BRAND.address.city}
                    <br />
                    {BRAND.address.country}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="break-words font-medium text-ink">{t('legal.contactTitle')}</dt>
                  <dd className="break-all">
                    <a
                      href={`mailto:${BRAND.contactEmail}`}
                      className="rounded-sm text-terra-800 underline underline-offset-4 hover:text-ink"
                    >
                      {BRAND.contactEmail}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          {isWithdrawal ? (
            <article className="mx-auto min-w-0 max-w-[760px]">
              <h1 className="break-words text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
                {title}
              </h1>
              <p className="mt-6 break-words text-[15px] leading-7 text-neutral-600">
                {t('remediation.withdrawalIntro')}
              </p>
              <div className="mt-8 rounded-card border border-terra-100 bg-surface p-4 sm:p-8">
                <h2 className="text-lg font-semibold text-ink">
                  {t('remediation.withdrawalFormTitle')}
                </h2>
                <div className="mt-5">
                  <WithdrawalForm />
                </div>
              </div>
            </article>
          ) : (
            <PolicyDocument
              policy={policy}
              title={title}
              fallback={t('legal.contentUnavailable')}
              placeholder={placeholder}
            />
          )}
        </div>
      </div>
    </>
  );
}
