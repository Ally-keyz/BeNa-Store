import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { Accordion, type AccordionItem } from '@/components/ui/Accordion';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { pageContainer, sectionSpacing } from '@/lib/layout';

export function FaqPage() {
  const { t } = useTranslation();

  const items: AccordionItem[] = [
    { id: 'shipping', title: t('faq.shipQuestion'), content: t('faq.shipAnswer'), defaultOpen: true },
    { id: 'delivery', title: t('faq.deliveryQuestion'), content: t('faq.deliveryAnswer') },
    { id: 'cancel', title: t('faq.cancelQuestion'), content: t('faq.cancelAnswer') },
    { id: 'allergens', title: t('faq.allergenQuestion'), content: t('faq.allergenAnswer') },
    { id: 'returns', title: t('faq.returnsQuestion'), content: t('faq.returnsAnswer') },
    { id: 'payment', title: t('faq.paymentQuestion'), content: t('faq.paymentAnswer') },
    { id: 'account', title: t('faq.accountQuestion'), content: t('faq.accountAnswer') },
    { id: 'contact', title: t('faq.contactQuestion'), content: t('faq.contactAnswer') },
  ];

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('faq.title')} — BeNa Origins`,
          description: t('faq.body'),
          path: '/faq',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('footer.faq') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />
        <div className={`${sectionSpacing} pt-6 sm:pt-10`}>
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('faq.eyebrow')}
            </p>
            <h1 className="mt-2 text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
              {t('faq.title')}
            </h1>
            <p className="mt-4 break-words text-[15px] leading-7 text-neutral-600">{t('faq.body')}</p>
          </div>

          <div className="mt-8 max-w-[860px] sm:mt-10">
            <Accordion items={items} />
          </div>

          <p className="mt-8 max-w-[860px] break-words text-[13px] leading-6 text-neutral-600">
            {t('faq.contactAnswer')}{' '}
            <Link
              to="/contact"
              className="break-words rounded-sm font-medium text-terra-800 underline underline-offset-4 hover:text-ink"
            >
              {t('nav.contact')}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
