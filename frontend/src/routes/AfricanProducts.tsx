import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { HeroCarousel } from '@/features/home/HeroCarousel';
import { FeaturedProducts } from '@/features/home/FeaturedProducts';
import { useCollection } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { pageContainer } from '@/lib/layout';

const HERO_CATEGORIES = ['coffee', 'drinks', 'spices'] as const;

export function AfricanProductsPage() {
  const { t } = useTranslation();
  const { marketParams } = useMarket();

  // The hero uses products drawn from each category, so it shows a different
  // set from the home carousel's "newest products" slides.
  const coffeeQuery = useCollection(HERO_CATEGORIES[0], {
    first: 2,
    sortKey: 'CREATED',
    ...marketParams,
  });
  const drinksQuery = useCollection(HERO_CATEGORIES[1], {
    first: 2,
    sortKey: 'CREATED',
    ...marketParams,
  });
  const spicesQuery = useCollection(HERO_CATEGORIES[2], {
    first: 2,
    sortKey: 'CREATED',
    ...marketParams,
  });
  const heroProducts = [coffeeQuery, drinksQuery, spicesQuery].flatMap(
    (query) => query.data?.collection.products ?? [],
  );

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('african.title')} — BeNa Origins`,
          description: t('african.body'),
          path: '/african-products',
        }}
      />

      <div className="mx-auto w-full max-w-6xl sm:px-6 lg:px-8">
        <div className="pt-4 sm:pt-6">
          <HeroCarousel products={heroProducts} />
        </div>
      </div>

      <FeaturedProducts
        variant="white"
        titleId="african-featured"
        eyebrow={t('home.featuredEyebrow')}
        title={t('african.featuredTitle')}
        body={t('african.featuredBody')}
        align="center"
        headingAs="h1"
        showFilters={false}
        showCta={false}
        first={8}
      />

      <div className={pageContainer}>
        <section className="mx-auto grid w-full max-w-5xl gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_1.2fr] lg:py-[72px]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('home.storyEyebrow')}
            </p>
            <h2 className="mt-2 text-[clamp(24px,2.4vw,32px)] font-semibold tracking-tight">
              {t('african.sourcingTitle')}
            </h2>
          </div>
          <p className="max-w-2xl text-[15px] leading-7 text-neutral-600">
            {t('african.sourcingBody')}
          </p>
        </section>
      </div>
    </>
  );
}
