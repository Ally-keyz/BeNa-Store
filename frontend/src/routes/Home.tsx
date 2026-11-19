import { useTranslation } from 'react-i18next';
import { Seo } from '@/app/Seo';
import { HeroCarousel } from '@/features/home/HeroCarousel';
import { SocialStrip } from '@/features/home/SocialStrip';
import { FeaturedProducts } from '@/features/home/FeaturedProducts';
import { TrustBand } from '@/features/home/TrustBand';
import { NewsletterSection } from '@/features/home/NewsletterSection';
import { heroContainer } from '@/lib/layout';

export function HomePage() {
  const { t } = useTranslation();
  const description = t('home.featuredBody');

  return (
    <>
      <Seo title="BeNa Origins — Rwandan products, coffee & crafts" description={description} path="/" />
      <div className="pt-4 sm:pt-6">
        <div className={heroContainer}>
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
