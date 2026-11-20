import { useTranslation } from 'react-i18next';
import { NewsletterForm } from '@/components/commerce/NewsletterForm';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { pageContainer, sectionSpacing } from '@/lib/layout';

export function NewsletterSection() {
  const { t } = useTranslation();

  return (
    <section className={sectionSpacing} aria-labelledby="home-newsletter">
      <div className={pageContainer}>
        <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-hero border border-terra-100 bg-gradient-to-br from-terra-50 via-surface to-surface p-6 sm:p-10">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-12">
            <SectionHeading
              eyebrow={t('home.newsletterEyebrow')}
              title={<span id="home-newsletter">{t('home.newsletterHeading')}</span>}
              body={t('home.newsletterBody')}
            />
            <NewsletterForm source="home" className="lg:justify-self-end lg:max-w-lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
