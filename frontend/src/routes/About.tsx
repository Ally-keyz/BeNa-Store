import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { PageSeo } from '@/features/seo/PageSeo';
import { ProductStoryIcon } from '@/features/about/ProductStoryIcon';
import { buttonVariants } from '@/components/ui/Button';
import { PRODUCT_STORIES, localizedText } from '@/content/productStories';
import { useMarket } from '@/context/MarketContext';
import { contentContainer } from '@/lib/layout';

const PILLARS = [
  { titleKey: 'about.sourcingTitle', bodyKey: 'about.sourcingBody' },
  { titleKey: 'about.clarityTitle', bodyKey: 'about.clarityBody' },
  { titleKey: 'about.fulfilmentTitle', bodyKey: 'about.fulfilmentBody' },
] as const;

export function AboutPage() {
  const { t } = useTranslation();
  const { language } = useMarket();

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
        <section className="pb-10 pt-10 text-center sm:pb-20 sm:pt-20">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
            {t('about.eyebrow')}
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl break-words text-[clamp(30px,4vw,52px)] font-semibold leading-[1.08] tracking-tight text-ink">
            {t('about.title')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl break-words text-[17px] leading-8 text-neutral-600 sm:mt-6">
            {t('about.lead')}
          </p>

          <img
            src="/logo_new.png"
            alt={t('about.title')}
            className="mx-auto mt-10 aspect-[4/3] w-full max-w-[220px] rounded-2xl object-contain sm:max-w-[280px]"
            loading="eager"
          />
        </section>

        <section className="border-t border-neutral-200 py-10 text-center sm:py-20">
          <h2 className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {t('about.storyTitle')}
          </h2>
          <p className="mx-auto mt-5 max-w-2xl break-words text-base leading-8 text-neutral-600">
            {t('about.storyBody')}
          </p>
        </section>

        <section className="border-t border-neutral-200 py-10 sm:py-20" aria-labelledby="about-products">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="about-products"
              className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]"
            >
              {t('about.storiesTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl break-words text-sm leading-7 text-neutral-600">
              {t('about.storiesBody')}
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-4 text-left sm:grid-cols-2 sm:gap-5">
            {PRODUCT_STORIES.map((story) => (
              <Link
                key={story.slug}
                to={`/about/products/${story.slug}`}
                className="group flex min-w-0 flex-col rounded-2xl border border-terra-100 bg-surface p-5 transition-colors hover:border-terra-300 hover:bg-terra-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-terra-50 text-terra-700">
                  <ProductStoryIcon icon={story.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 break-words text-base font-semibold text-ink">
                  {localizedText(story.title, language)}
                </h3>
                <p className="mt-2 flex-1 break-words text-sm leading-6 text-neutral-600">
                  {localizedText(story.summary, language)}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-terra-800 group-hover:text-ink">
                  {t('productStories.readStory')}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-neutral-200 py-10 sm:py-20">
          <div className="mx-auto grid max-w-4xl gap-8 text-left md:grid-cols-2 md:gap-12">
            <article className="min-w-0 border-t border-ink pt-4 sm:pt-5">
              <h2 className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
                {t('about.missionTitle')}
              </h2>
              <p className="mt-3 break-words text-sm leading-7 text-neutral-600">
                {t('about.missionBody')}
              </p>
            </article>
            <article className="min-w-0 border-t border-ink pt-4 sm:pt-5">
              <h2 className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
                {t('about.visionTitle')}
              </h2>
              <p className="mt-3 break-words text-sm leading-7 text-neutral-600">
                {t('about.visionBody')}
              </p>
            </article>
          </div>
        </section>

        <section className="border-t border-neutral-200 py-10 text-center sm:py-20">
          <h2 className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            {t('about.pillarsTitle')}
          </h2>
          <div className="mx-auto mt-8 grid max-w-4xl gap-8 sm:gap-10 md:grid-cols-3 md:gap-12">
            {PILLARS.map(({ titleKey, bodyKey }) => (
              <article key={titleKey} className="min-w-0 border-t border-ink pt-4 text-center sm:pt-5">
                <h3 className="break-words text-base font-semibold text-ink">{t(titleKey)}</h3>
                <p className="mt-2 break-words text-sm leading-7 text-neutral-600">{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col items-center justify-center gap-6 border-t border-neutral-200 py-10 text-center sm:py-20">
          <div className="mx-auto min-w-0 max-w-2xl">
            <h2 className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {t('about.ctaTitle')}
            </h2>
            <p className="mx-auto mt-2 max-w-xl break-words text-[15px] leading-7 text-neutral-600">
              {t('about.ctaBody')}
            </p>
          </div>
          <Link
            to="/african-products"
            className={`${buttonVariants({ size: 'sm' })} min-h-11 !rounded-full sm:min-h-9`}
          >
            {t('home.featuredCta')}
          </Link>
        </section>
      </div>
    </>
  );
}
