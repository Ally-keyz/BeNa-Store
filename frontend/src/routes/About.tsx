import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { PageSeo } from '@/features/seo/PageSeo';
import { ProductStoryIcon } from '@/features/about/ProductStoryIcon';
import { buttonVariants } from '@/components/ui/Button';
import { PRODUCT_STORIES, localizedText } from '@/content/productStories';
import { useMarket } from '@/context/MarketContext';
import { heroContainer } from '@/lib/layout';

const PILLARS = [
  { titleKey: 'about.sourcingTitle', bodyKey: 'about.sourcingBody' },
  { titleKey: 'about.clarityTitle', bodyKey: 'about.clarityBody' },
  { titleKey: 'about.fulfilmentTitle', bodyKey: 'about.fulfilmentBody' },
] as const;

const H2 =
  'break-words text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-[32px]';
const SECTION = 'border-t border-neutral-200 py-14 sm:py-20 lg:py-24';

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
      <span className="h-px w-8 bg-terra-300" aria-hidden="true" />
      {children}
    </p>
  );
}

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
        {/* Hero — split layout, left-aligned editorial type */}
        <section className="grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-28">
          <div className="min-w-0">
            <Eyebrow>{t('about.eyebrow')}</Eyebrow>
            <h1 className="mt-5 max-w-2xl break-words text-[clamp(34px,5vw,64px)] font-semibold leading-[1.04] tracking-[-0.03em] text-ink">
              {t('about.title')}
            </h1>
            <p className="mt-6 max-w-xl break-words text-[17px] leading-8 text-neutral-600 sm:text-lg">
              {t('about.lead')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/african-products"
                className={`${buttonVariants({ size: 'md' })} group`}
              >
                {t('home.featuredCta')}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </Link>
              <a
                href="#about-products"
                className={buttonVariants({ variant: 'ghost', size: 'md' })}
              >
                {t('about.storiesTitle')}
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <div
              className="absolute -inset-3 -z-10 rounded-[2rem] bg-terra-50/70"
              aria-hidden="true"
            />
            <div className="flex aspect-square items-center justify-center rounded-3xl border border-terra-100 bg-surface p-10 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.08)]">
              <img
                src="/logo_new.png"
                alt={t('about.title')}
                className="h-full w-full object-contain"
                loading="eager"
              />
            </div>
          </div>
        </section>

        {/* Story — sticky heading left, copy right */}
        <section className={SECTION}>
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <h2 className={`${H2} lg:sticky lg:top-24 lg:self-start`}>{t('about.storyTitle')}</h2>
            <p className="max-w-2xl break-words text-lg leading-9 text-neutral-600">
              {t('about.storyBody')}
            </p>
          </div>
        </section>

        {/* Mission & vision — soft tonal cards */}
        <section className="pb-14 sm:pb-20 lg:pb-24">
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {[
              { title: 'about.missionTitle', body: 'about.missionBody' },
              { title: 'about.visionTitle', body: 'about.visionBody' },
            ].map(({ title, body }) => (
              <article
                key={title}
                className="min-w-0 rounded-3xl border border-terra-100 bg-terra-50/60 p-7 sm:p-10"
              >
                <h2 className="break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  {t(title)}
                </h2>
                <p className="mt-4 break-words text-[15px] leading-7 text-neutral-600">
                  {t(body)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Product stories — bento-style grid */}
        <section className={SECTION} aria-labelledby="about-products" id="about-products">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
            <h2 id="about-products" className={H2}>
              {t('about.storiesTitle')}
            </h2>
            <p className="max-w-md break-words text-[15px] leading-7 text-neutral-600">
              {t('about.storiesBody')}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
            {PRODUCT_STORIES.map((story, index) => (
              <Link
                key={story.slug}
                to={`/about/products/${story.slug}`}
                className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border border-terra-100 bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-terra-300 hover:bg-terra-50/50 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8"
              >
                {/*
                 * Stories with supplied photography lead with a slim image band.
                 * The others keep the original icon-led card so the grid stays
                 * visually consistent as new stories are added.
                 */}
                {story.hero ? (
                  <div className="-mx-6 -mt-6 mb-6 h-32 overflow-hidden bg-neutral-100 sm:-mx-8 sm:-mt-8 sm:mb-7 sm:h-36">
                    <img
                      src={story.hero.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  </div>
                ) : null}

                <div className="flex items-start justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-terra-50 text-terra-700 transition-colors group-hover:bg-surface">
                    <ProductStoryIcon icon={story.icon} className="h-5 w-5" />
                  </span>
                  <span
                    className="text-[12px] font-medium tabular tracking-widest text-terra-300"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-8 break-words text-lg font-semibold tracking-tight text-ink">
                  {localizedText(story.title, language)}
                </h3>
                <p className="mt-2 flex-1 break-words text-sm leading-6 text-neutral-600">
                  {localizedText(story.summary, language)}
                </p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-terra-800 group-hover:text-ink">
                  {t('productStories.readStory')}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Pillars — numbered, hairline-divided */}
        <section className={SECTION}>
          <h2 className={H2}>{t('about.pillarsTitle')}</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-neutral-200">
            {PILLARS.map(({ titleKey, bodyKey }, index) => (
              <article key={titleKey} className="min-w-0 md:px-8 md:first:pl-0 md:last:pr-0">
                <span
                  className="text-sm font-medium tabular text-terra-600"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 break-words text-lg font-semibold tracking-tight text-ink">
                  {t(titleKey)}
                </h3>
                <p className="mt-3 break-words text-sm leading-7 text-neutral-600">{t(bodyKey)}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA — contained panel */}
        <section className="pb-14 sm:pb-20 lg:pb-24">
          <div className="flex flex-col items-start justify-between gap-8 rounded-3xl border border-terra-100 bg-terra-50/60 p-8 sm:p-12 md:flex-row md:items-center">
            <div className="min-w-0 max-w-xl">
              <h2 className={H2}>{t('about.ctaTitle')}</h2>
              <p className="mt-3 break-words text-[15px] leading-7 text-neutral-600">
                {t('about.ctaBody')}
              </p>
            </div>
            <Link
              to="/african-products"
              className={`${buttonVariants({ size: 'lg' })} group shrink-0`}
            >
              {t('home.featuredCta')}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
