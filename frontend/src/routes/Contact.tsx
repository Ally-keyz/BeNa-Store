import { useTranslation } from 'react-i18next';
import { BRAND } from '@/config';
import { PageSeo } from '@/features/seo/PageSeo';
import { ContactForm } from '@/features/contact/ContactForm';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { pageContainer, sectionSpacing } from '@/lib/layout';

export function ContactPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('contact.title')} — BeNa Origins`,
          description: t('contact.body'),
          path: '/contact',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.contact') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-8 sm:pt-10`}>
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('contact.eyebrow')}
            </p>
            <h1 className="mt-2 text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
              {t('contact.title')}
            </h1>
            <p className="mt-4 text-[15px] leading-7 text-neutral-600">{t('contact.body')}</p>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
            <ContactForm />
            <aside className="rounded-card border border-terra-100 bg-terra-50/70 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-ink">{t('contact.directTitle')}</h2>
              <a
                href={`mailto:${BRAND.ordersEmail}`}
                className="mt-4 inline-block rounded-sm text-[15px] font-medium text-terra-800 underline underline-offset-4 hover:text-ink"
              >
                {BRAND.ordersEmail}
              </a>
              <p className="mt-3 text-[13px] leading-6 text-neutral-600">
                {t('contact.responseBody')}
              </p>
              <p className="mt-8 text-[12px] leading-6 text-neutral-600">{t('contact.mailtoNote')}</p>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
