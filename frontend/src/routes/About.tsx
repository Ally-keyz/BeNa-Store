import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { buttonVariants } from '@/components/ui/Button';
import { pageContainer } from '@/lib/layout';

const PILLARS = [
  { titleKey: 'about.sourcingTitle', bodyKey: 'about.sourcingBody' },
  { titleKey: 'about.clarityTitle', bodyKey: 'about.clarityBody' },
  { titleKey: 'about.fulfilmentTitle', bodyKey: 'about.fulfilmentBody' },
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
          className="pt-6 text-sm"
        />

        {/* Intro */}
        <section className="pb-14 pt-10 text-center sm:pb-20 sm:pt-16">
          <h1 className="mx-auto max-w-3xl text-[clamp(30px,4vw,52px)] font-semibold leading-[1.08] tracking-tight text-ink">
            {t('about.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-neutral-600">
            {t('about.lead')}
          </p>

          <img
            src="/logo.webp"
            alt={t('about.title')}
            className="mx-auto mt-10 aspect-[4/3] w-full max-w-sm rounded-2xl object-contain sm:max-w-md"
            loading="eager"
          />
        </section>

        {/* Story */}
        <section className="grid gap-6 border-t border-neutral-200 py-14 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {t('about.storyTitle')}
          </h2>
          <p className="max-w-xl text-base leading-8 text-neutral-600">{t('about.storyBody')}</p>
        </section>

        {/* Principles */}
        <section className="border-t border-neutral-200 py-14 sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {t('about.pillarsTitle')}
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-12">
            {PILLARS.map(({ titleKey, bodyKey }) => (
              <article key={titleKey} className="border-t border-ink pt-5">
                <h3 className="text-base font-semibold text-ink">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-7 text-neutral-600">{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="flex flex-wrap items-center justify-between gap-6 border-t border-neutral-200 py-14 sm:py-20">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {t('about.ctaTitle')}
            </h2>
            <p className="mt-2 text-[15px] leading-7 text-neutral-600">{t('about.ctaBody')}</p>
          </div>
          <Link to="/catalog" className={`${buttonVariants({ size: 'sm' })} !rounded-full`}>
            {t('home.featuredCta')}
          </Link>
        </section>
      </div>
    </>
  );
}