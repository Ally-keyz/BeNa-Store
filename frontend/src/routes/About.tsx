import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { buttonVariants } from '@/components/ui/Button';
import { PRODUCT_STORIES, localizedText } from '@/content/productStories';
import { useMarket } from '@/context/MarketContext';
import { heroContainer } from '@/lib/layout';

const PILLARS = [
  { titleKey: 'about.sourcingTitle', bodyKey: 'about.sourcingBody' },
  { titleKey: 'about.clarityTitle', bodyKey: 'about.clarityBody' },
  { titleKey: 'about.fulfilmentTitle', bodyKey: 'about.fulfilmentBody' },
] as const;

const MISSION_VISION = [
  { titleKey: 'about.missionTitle', bodyKey: 'about.missionBody' },
  { titleKey: 'about.visionTitle', bodyKey: 'about.visionBody' },
] as const;

const STORIES = PRODUCT_STORIES;

const SECTION = 'border-t border-neutral-200 py-16 text-center sm:py-24';
const H2 =
  'mx-auto max-w-2xl break-words text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl';
const BODY = 'mx-auto max-w-2xl break-words text-base leading-8 text-neutral-600 sm:text-lg';

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

      <div className={heroContainer}>
        {/* Hero */}
        <section className="flex flex-col items-center py-16 text-center sm:py-24 lg:py-32">
          <img
            src="/logo_new.png"
            alt=""
            className="h-20 w-20 object-contain sm:h-24 sm:w-24"
            loading="eager"
          />
          <h1 className="mt-8 max-w-3xl break-words text-[clamp(32px,5vw,56px)] font-semibold leading-[1.1] tracking-tight text-ink">
            {t('about.title')}
          </h1>
          <p className={`${BODY} mt-6 max-w-xl`}>{t('about.lead')}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/african-products" className={buttonVariants({ size: 'md' })}>
              {t('home.featuredCta')}
            </Link>
            <a href="#about-products" className={buttonVariants({ variant: 'ghost', size: 'md' })}>
              {t('about.storiesTitle')}
            </a>
          </div>
        </section>

        {/* Story */}
        <section className={SECTION}>
          <h2 className={H2}>{t('about.storyTitle')}</h2>
          <p className={`${BODY} mt-6`}>{t('about.storyBody')}</p>
        </section>

        {/* Mission & vision */}
        <section className={SECTION}>
          <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-2 md:gap-0 md:divide-x md:divide-neutral-200">
            {MISSION_VISION.map(({ titleKey, bodyKey }) => (
              <article key={titleKey} className="min-w-0 md:px-12">
                <h2 className="break-words text-xl font-semibold tracking-tight text-ink">
                  {t(titleKey)}
                </h2>
                <p className="mt-4 break-words text-base leading-7 text-neutral-600">
                  {t(bodyKey)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Product stories */}
        <section className={SECTION} id="about-products" aria-labelledby="about-products-title">
          <h2 id="about-products-title" className={H2}>
            {t('about.storiesTitle')}
          </h2>
          <p className={`${BODY} mt-4 text-base sm:text-base`}>{t('about.storiesBody')}</p>

          <div className="mt-14 flex flex-wrap justify-center gap-6">
            {STORIES.map((story) => (
              <Link
                key={story.slug}
                to={`/about/products/${story.slug}`}
                className="group flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-surface text-center transition-colors hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              >
                <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-neutral-100">
                  {story.hero ? (
                    <img
                      src={story.hero.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <span className="absolute left-3 top-3 inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white/95 p-1.5 shadow-sm">
                    <img
                      src={story.logo.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  </span>
                </div>

                <div className="flex flex-1 flex-col items-center px-6 pb-8 pt-7">
                  <h3 className="break-words text-xl font-semibold tracking-tight text-ink">
                    {localizedText(story.title, language)}
                  </h3>
                  <p className="mt-3 flex-1 break-words text-[15px] leading-7 text-neutral-600">
                    {localizedText(story.summary, language)}
                  </p>
                  <span className="mt-6 inline-flex items-center rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium text-ink transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-white motion-reduce:transition-none">
                    {t('productStories.readStory')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Pillars */}
        <section className={SECTION}>
          <h2 className={H2}>{t('about.pillarsTitle')}</h2>
          <div className="mx-auto mt-12 grid max-w-5xl gap-10 md:grid-cols-3 md:gap-12">
            {PILLARS.map(({ titleKey, bodyKey }) => (
              <article key={titleKey} className="min-w-0">
                <h3 className="break-words text-lg font-semibold tracking-tight text-ink">
                  {t(titleKey)}
                </h3>
                <p className="mt-3 break-words text-sm leading-7 text-neutral-600">{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className={SECTION}>
          <h2 className={H2}>{t('about.ctaTitle')}</h2>
          <p className={`${BODY} mt-4 text-base sm:text-base`}>{t('about.ctaBody')}</p>
          <div className="mt-8 flex justify-center">
            <Link to="/african-products" className={buttonVariants({ size: 'lg' })}>
              {t('home.featuredCta')}
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}