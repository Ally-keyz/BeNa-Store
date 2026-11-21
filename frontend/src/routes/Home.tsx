import { useTranslation } from 'react-i18next';
import { Seo } from '@/app/Seo';
import { HeroCarousel } from '@/features/home/HeroCarousel';
import { SocialStrip } from '@/features/home/SocialStrip';
import { FeaturedProducts } from '@/features/home/FeaturedProducts';
import { TrustBand } from '@/features/home/TrustBand';
import { NewsletterSection } from '@/features/home/NewsletterSection';

export function HomePage() {
  const { t } = useTranslation();
  const description = t('home.featuredBody');

  return (
    <>
      <Seo title="BeNa Origins — African products, coffee & crafts" description={description} path="/" />
      <div className="pt-4 sm:pt-6">
        <div className="mx-auto w-full max-w-6xl sm:px-6 lg:px-8">
          <HeroCarousel />
        </div>
      </div>
      <SocialStrip />
      <FeaturedProducts />
      <TrustBand />
      <NewsletterSection />
    </>
  );
}
