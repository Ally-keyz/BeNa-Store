import { useTranslation } from 'react-i18next';
import { PageSeo } from '@/features/seo/PageSeo';
import { HeroCarousel } from '@/features/home/HeroCarousel';
import { FeaturedProducts } from '@/features/home/FeaturedProducts';
import { useCollection } from '@/hooks/useCatalog';
import { useMarket } from '@/context/MarketContext';
import { pageContainer } from '@/lib/layout';

const HERO_CATEGORIES = ['coffee', 'food', 'crafts'] as const;

export function RwandanProductsPage() {
  const { t } = useTranslation();
  const { marketParams } = useMarket();

  // The hero uses products drawn from each category, so it shows a different
  // set from the home carousel's "newest products" slides.
  const coffeeQuery = useCollection(HERO_CATEGORIES[0], {
    first: 2,
    sortKey: 'CREATED',
    ...marketParams,
  });
  const foodQuery = useCollection(HERO_CATEGORIES[1], {
    first: 2,
    sortKey: 'CREATED',
    ...marketParams,
  });
  const craftsQuery = useCollection(HERO_CATEGORIES[2], {
    first: 2,
    sortKey: 'CREATED',
    ...marketParams,
  });
  const heroProducts = [coffeeQuery, foodQuery, craftsQuery].flatMap(
    (query) => query.data?.collection.products ?? [],
  );

  return (
    <>
      <PageSeo
        fallback={{
          title: `${t('rwandan.title')} — BeNa Origins`,
          description: t('rwandan.body'),
          path: '/rwandan-products',
        }}
      />

      <div className="mx-auto w-full max-w-6xl sm:px-6 lg:px-8">
        <div className="pt-4 sm:pt-6">
          <HeroCarousel products={heroProducts} />
        </div>
      </div>

      <FeaturedProducts
        variant="white"
        titleId="rwandan-featured"
        eyebrow={t('home.featuredEyebrow')}
        title={t('rwandan.featuredTitle')}
        body={t('rwandan.featuredBody')}
        align="center"
        headingAs="h1"
        showFilters={false}
        showCta={false}
        first={8}
        darkOverlay
      />

      <div className={pageContainer}>
        <section className="mx-auto grid w-full max-w-5xl gap-8 py-12 sm:py-16 lg:grid-cols-[1fr_1.2fr] lg:py-[72px]">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-terra-600">
              {t('home.storyEyebrow')}
            </p>
            <h2 className="mt-2 text-[clamp(24px,2.4vw,32px)] font-semibold tracking-tight">
              {t('rwandan.sourcingTitle')}
            </h2>
          </div>
          <p className="max-w-2xl text-[15px] leading-7 text-neutral-600">
            {t('rwandan.sourcingBody')}
          </p>
        </section>
      </div>
    </>
  );
}
