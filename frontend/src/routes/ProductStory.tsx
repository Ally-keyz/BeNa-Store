import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageSeo } from '@/features/seo/PageSeo';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/motion/Reveal';
import { buttonVariants } from '@/components/ui/Button';
import {
  PRODUCT_STORIES,
  getProductStory,
  getProductStoryHref,
  localizedText,
  type StorySectionKey,
} from '@/content/productStories';
import { useMarket } from '@/context/MarketContext';
import { contentContainer } from '@/lib/layout';
import { NotFoundPage } from './NotFoundPage';

const SECTION_TITLE_KEYS: Record<StorySectionKey, string> = {
  people: 'productStories.sectionPeople',
  grown: 'productStories.sectionGrown',
  made: 'productStories.sectionMade',
  exported: 'productStories.sectionExported',
  packed: 'productStories.sectionPacked',
};

const CREDIT_CLASS =
  'text-[11px] leading-4 text-neutral-500 hover:text-terra-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

function MediaCredit({
  label,
  creditUrl,
}: {
  label: string;
  creditUrl?: string;
}) {
  return (
    <p className="mt-2 text-[11px] leading-4 text-neutral-500">
      {creditUrl ? (
        <a href={creditUrl} target="_blank" rel="noreferrer" className={CREDIT_CLASS}>
          {label}
        </a>
      ) : (
        label
      )}
    </p>
  );
}

export function ProductStoryPage() {
  const { slug = '' } = useParams();
  const { t } = useTranslation();
  const { language } = useMarket();

  const story = getProductStory(slug);
  if (!story) return <NotFoundPage />;

  const title = localizedText(story.title, language);
  const summary = localizedText(story.summary, language);
  const shopHref = getProductStoryHref(story);
  const otherStories = PRODUCT_STORIES.filter((item) => item.slug !== story.slug);

  return (
    <>
      <PageSeo
        fallback={{
          title: `${title} — BeNa Origins`,
          description: summary,
          path: `/about/products/${story.slug}`,
        }}
      />

      <div className={contentContainer}>
        <Breadcrumbs
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('nav.about'), href: '/about' },
            { label: title },
          ]}
          label={t('a11y.breadcrumb')}
          className="pt-6"
        />

        <article className="pb-10 pt-8 sm:pb-16 sm:pt-12">
          <header className="text-center">
            <span className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white p-2">
              <img
                src={story.logo.image}
                alt=""
                loading="eager"
                decoding="async"
                className="h-full w-full object-contain"
              />
            </span>
            <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('productStories.eyebrow')}
            </p>
            <h1 className="mx-auto mt-3 max-w-3xl break-words text-[clamp(30px,4vw,52px)] font-semibold leading-[1.08] tracking-tight text-ink">
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl break-words text-[17px] leading-8 text-neutral-600">
              {summary}
            </p>
          </header>

          {story.hero ? (
            <figure className="mt-10 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100">
              <img
                src={story.hero.image}
                alt={localizedText(story.hero.imageAlt, language)}
                loading="eager"
                decoding="async"
                className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
              />
              <figcaption className="px-4 py-2 text-right">
                <MediaCredit
                  label={t('productStories.photoCredit', { credit: story.hero.credit })}
                  creditUrl={story.hero.creditUrl}
                />
              </figcaption>
            </figure>
          ) : null}

          <div className="mx-auto mt-10 max-w-2xl space-y-5 text-left text-base leading-8 text-neutral-600">
            <p>{localizedText(story.body, language)}</p>
            <p>{localizedText(story.detail, language)}</p>
          </div>

          <section className="mt-14 sm:mt-20" aria-labelledby="process-title">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                id="process-title"
                className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]"
              >
                {t('productStories.processTitle')}
              </h2>
              <p className="mt-3 break-words text-sm leading-7 text-neutral-600">
                {t('productStories.processIntro')}
              </p>
            </div>

            {/*
             * The five stages sit in a calm two-column card grid instead of one
             * very long alternating stack. The final card spans both columns so
             * the "packed by BeNa" step closes the journey cleanly.
             */}
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-12 sm:grid-cols-2">
              {story.sections.map((section, index) => {
                const isFinal = index === story.sections.length - 1;
                return (
                  <Reveal
                    key={section.key}
                    delay={index * 0.04}
                    className={isFinal ? 'sm:col-span-2' : undefined}
                  >
                    <article className="h-full overflow-hidden rounded-2xl border border-neutral-200 bg-surface transition-shadow duration-300 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.25)] motion-reduce:transition-none">
                      <img
                        src={section.image}
                        alt={localizedText(section.imageAlt, language)}
                        loading="lazy"
                        decoding="async"
                        className={`w-full object-cover ${isFinal ? 'aspect-[21/9]' : 'aspect-[16/10]'}`}
                      />
                      <div className="p-5 sm:p-6">
                        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
                          {t('productStories.stepLabel', { number: index + 1 })}
                        </p>
                        <h3 className="mt-2 break-words text-lg font-semibold tracking-tight text-ink">
                          {t(SECTION_TITLE_KEYS[section.key])}
                        </h3>
                        <p className="mt-3 break-words text-sm leading-7 text-neutral-600">
                          {localizedText(section.body, language)}
                        </p>
                        <MediaCredit
                          label={t('productStories.photoCredit', { credit: section.credit })}
                          creditUrl={section.creditUrl}
                        />
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </section>

          {story.gallery?.length ? (
            <section className="mt-14 sm:mt-20" aria-labelledby="story-gallery-title">
              <div className="mx-auto max-w-2xl text-center">
                <h2
                  id="story-gallery-title"
                  className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]"
                >
                  {t('productStories.galleryTitle')}
                </h2>
                <p className="mt-3 break-words text-sm leading-7 text-neutral-600">
                  {t('productStories.galleryIntro')}
                </p>
              </div>
              <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
                {story.gallery.map((item, index) => (
                  <figure
                    key={item.image}
                    className="group overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100"
                  >
                    <img
                      src={item.image}
                      alt={localizedText(item.imageAlt, language)}
                      loading="lazy"
                      decoding="async"
                      className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none ${
                        index === 0 ? 'aspect-[16/9] sm:aspect-[16/7]' : 'aspect-square'
                      } ${index === 0 ? 'sm:col-span-2' : ''}`}
                    />
                    <figcaption className="px-3 py-2 text-right">
                      <MediaCredit
                        label={t('productStories.photoCredit', { credit: item.credit })}
                        creditUrl={item.creditUrl}
                      />
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {story.videos?.length ? (
            <section className="mt-14 sm:mt-20" aria-labelledby="story-videos-title">
              <div className="mx-auto max-w-2xl text-center">
                <h2
                  id="story-videos-title"
                  className="break-words text-2xl font-semibold tracking-tight text-ink sm:text-[28px]"
                >
                  {t('productStories.videoTitle')}
                </h2>
              </div>
              <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
                {story.videos.map((video) => (
                  <figure
                    key={video.src}
                    className="overflow-hidden rounded-2xl border border-neutral-200 bg-surface"
                  >
                    <video
                      src={video.src}
                      poster={video.poster}
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={localizedText(video.posterAlt, language)}
                      className="aspect-video w-full bg-ink object-cover"
                    />
                    <figcaption className="px-3 py-2 text-right">
                      <MediaCredit
                        label={t('productStories.photoCredit', { credit: video.credit })}
                        creditUrl={video.creditUrl}
                      />
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {shopHref ? (
              <Link
                to={shopHref}
                className={`${buttonVariants({ size: 'sm' })} min-h-11 sm:min-h-9`}
              >
                {story.productHandle
                  ? t('productStories.shopProduct')
                  : t('productStories.findProduct')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null}
            <Link
              to="/about"
              className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} min-h-11 sm:min-h-9`}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              {t('productStories.backToAbout')}
            </Link>
          </div>
        </article>

        <section className="border-t border-neutral-200 py-10 sm:py-16" aria-labelledby="more-stories">
          <h2
            id="more-stories"
            className="text-center text-2xl font-semibold tracking-tight text-ink sm:text-[28px]"
          >
            {t('productStories.moreStories')}
          </h2>
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherStories.map((item) => (
              <Link
                key={item.slug}
                to={`/about/products/${item.slug}`}
                className="group flex min-w-0 items-center gap-3 rounded-2xl border border-terra-100 bg-surface p-4 text-left transition-colors hover:border-terra-300 hover:bg-terra-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5">
                  <img
                    src={item.logo.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                  />
                </span>
                <span className="min-w-0 flex-1 break-words text-sm font-medium text-ink">
                  {localizedText(item.title, language)}
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-terra-700"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
