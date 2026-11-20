import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { buttonVariants } from '@/components/ui/Button';
import { contentContainer } from '@/lib/layout';

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

      <div className={contentContainer}>
        <section className="pb-14 pt-14 text-center sm:pb-20 sm:pt-20">
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

        <section className="border-t border-neutral-200 py-14 text-center sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {t('about.storyTitle')}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-neutral-600">
            {t('about.storyBody')}
          </p>
        </section>

        <section className="border-t border-neutral-200 py-14 text-center sm:py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {t('about.pillarsTitle')}
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-10 md:grid-cols-3 md:gap-12">
            {PILLARS.map(({ titleKey, bodyKey }) => (
              <article key={titleKey} className="border-t border-ink pt-5 text-center">
                <h3 className="text-base font-semibold text-ink">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-7 text-neutral-600">{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-center justify-center gap-6 border-t border-neutral-200 py-14 text-center sm:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {t('about.ctaTitle')}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-[15px] leading-7 text-neutral-600">
              {t('about.ctaBody')}
            </p>
          </div>
          <Link to="/catalog" className={`${buttonVariants({ size: 'sm' })} !rounded-full`}>
            {t('home.featuredCta')}
          </Link>
        </section>
      </div>
    </>
  );
}