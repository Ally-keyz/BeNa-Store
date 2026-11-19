import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Leaf, PackageCheck, ShieldCheck } from 'lucide-react';
import { PageSeo } from '@/features/seo/PageSeo';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { buttonVariants } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { pageContainer, sectionSpacing } from '@/lib/layout';

const PILLARS = [
  { titleKey: 'about.sourcingTitle', bodyKey: 'about.sourcingBody', Icon: Leaf },
  { titleKey: 'about.clarityTitle', bodyKey: 'about.clarityBody', Icon: ShieldCheck },
  { titleKey: 'about.fulfilmentTitle', bodyKey: 'about.fulfilmentBody', Icon: PackageCheck },
] as const;

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('about.title')} — BeNa Origins`,
          description: t('about.lead'),
          path: '/about',
        }}
      />
      <div className={pageContainer}>
        <Breadcrumbs
          items={[{ label: t('nav.home'), href: '/' }, { label: t('nav.about') }]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />

        <section className={`${sectionSpacing} pt-8 sm:pt-10`}>
          <div className="max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('about.eyebrow')}
            </p>
            <h1 className="mt-2 text-[clamp(28px,3.2vw,44px)] font-semibold tracking-tight">
              {t('about.title')}
            </h1>
            <p className="mt-5 text-[17px] leading-8 text-neutral-700">{t('about.lead')}</p>
          </div>
          <div className="mt-6 rounded-hero bg-terra-50 p-8 sm:p-12" role="img" aria-label={t('hero.placeholderLabel')}>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-terra-700">
              {t('hero.placeholderLabel')}
            </p>
            <p className="mt-3 max-w-lg text-[13px] leading-6 text-neutral-600">
              {t('about.placeholderBody')}
            </p>
          </div>
        </section>

        <section className="grid gap-8 border-t border-terra-100 py-12 sm:py-16 lg:grid-cols-[1fr_1.2fr] lg:py-[72px]">
          <h2 className="text-[clamp(24px,2.4vw,32px)] font-semibold tracking-tight">
            {t('about.storyTitle')}
          </h2>
          <p className="max-w-2xl text-[15px] leading-7 text-neutral-600">{t('about.storyBody')}</p>
        </section>

        <section className="pb-12 sm:pb-16 lg:pb-[72px]">
          <SectionHeading title={t('about.pillarsTitle')} />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PILLARS.map(({ titleKey, bodyKey, Icon }) => (
              <article key={titleKey} className="rounded-card border border-terra-100 bg-white p-6">
                <Icon className="h-5 w-5 text-terra-700" aria-hidden="true" />
                <h3 className="mt-4 text-[16px] font-semibold text-ink">{t(titleKey)}</h3>
                <p className="mt-2 text-[13px] leading-6 text-neutral-600">{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-hero bg-terra-50 p-8 sm:p-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-[clamp(24px,2.4vw,32px)] font-semibold tracking-tight">
                {t('about.ctaTitle')}
              </h2>
              <p className="mt-2 text-[14px] leading-7 text-neutral-600">{t('about.ctaBody')}</p>
            </div>
            <Link to="/catalog" className={buttonVariants({ size: 'sm' })}>
              {t('home.featuredCta')}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
