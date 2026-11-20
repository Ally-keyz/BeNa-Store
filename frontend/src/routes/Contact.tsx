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
      <div className={`${pageContainer} bg-white`}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.contact') }]}
          label={t('a11y.breadcrumb')}
          className="pt-4"
        />

        <div className={`${sectionSpacing} grid gap-8 pt-6 lg:grid-cols-12 lg:gap-16 lg:pt-8`}>
          {/* Left: form (compact, borderless) */}
          <div
            className="lg:col-span-7
              [&_form]:gap-3 [&_form]:space-y-3
              [&_form]:border-0 [&_form]:p-0 [&_form]:shadow-none [&_form]:bg-transparent
              [&_fieldset]:border-0 [&_fieldset]:p-0
              [&_textarea]:min-h-[96px] [&_textarea]:resize-none"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {t('contact.title')}
            </h1>
            <p className="mb-5 mt-2 max-w-lg text-sm leading-6 text-neutral-600">
              {t('contact.body')}
            </p>
            <ContactForm />
          </div>

          {/* Right: contact details */}
          <div className="lg:col-span-5 lg:pt-1">
            <div className="border-t border-neutral-200 pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <h2 className="text-sm font-semibold text-ink">{t('contact.directTitle')}</h2>
              <a
                href={`mailto:${BRAND.ordersEmail}`}
                className="mt-2 inline-block break-all rounded-sm text-[15px] text-terra-700 underline underline-offset-4 hover:text-terra-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra-600"
              >
                {BRAND.ordersEmail}
              </a>
              <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-600">
                {t('contact.responseBody')}
              </p>
              <p className="mt-5 max-w-sm text-[13px] leading-6 text-neutral-500">
                {t('contact.mailtoNote')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}