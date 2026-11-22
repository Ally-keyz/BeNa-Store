import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageSeo } from '@/features/seo/PageSeo';
import { ProductStoryIcon } from '@/features/about/ProductStoryIcon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
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
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-terra-50 text-terra-700">
              <ProductStoryIcon icon={story.icon} className="h-7 w-7" />
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

            <ol className="mx-auto mt-10 max-w-4xl space-y-12 sm:mt-12 sm:space-y-16">
              {story.sections.map((section, index) => (
                <li key={section.key} className="border-t border-neutral-200 pt-8 sm:pt-10">
                  <article className="grid items-center gap-5 md:grid-cols-2 md:gap-10">
                    <div className={index % 2 === 1 ? 'md:order-2' : undefined}>
                      <img
                        src={section.image}
                        alt={localizedText(section.imageAlt, language)}
                        loading="lazy"
                        decoding="async"
                        className="aspect-[16/10] w-full rounded-2xl border border-neutral-200 bg-neutral-100 object-cover"
                      />
                      <p className="mt-2 text-[11px] leading-4 text-neutral-500">
                        <a
                          href={section.creditUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-terra-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          {t('productStories.photoCredit', { credit: section.credit })}
                        </a>
                      </p>
                    </div>
                    <div className={index % 2 === 1 ? 'md:order-1' : undefined}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
                        {t('productStories.stepLabel', { number: index + 1 })}
                      </p>
                      <h3 className="mt-2 break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                        {t(SECTION_TITLE_KEYS[section.key])}
                      </h3>
                      <p className="mt-3 break-words text-base leading-8 text-neutral-600">
                        {localizedText(section.body, language)}
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </section>

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
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terra-50 text-terra-700">
                  <ProductStoryIcon icon={item.icon} className="h-5 w-5" />
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
