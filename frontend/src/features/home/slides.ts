/**
 * Editorial fallback slides for the hero. When live products are available the
 * carousel builds its slides from those products instead (see HeroCarousel),
 * so the hero always shows real, recently uploaded storefront imagery.
 * Copy for the editorial slides lives in i18n under `hero.slides.<id>`.
 */
export type HeroSlideId = 'rwanda' | 'coffee' | 'food' | 'crafts' | 'shipping';

export interface HeroSlide {
  id: HeroSlideId;
  href: string;
  image?: string;
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`;

/** Product-led photography used only while the catalog query is loading/empty. */
export const HERO_FALLBACK_IMAGES: Record<HeroSlideId, string> = {
  rwanda: unsplash('photo-1447933601403-0c6688de566e'),
  coffee: unsplash('photo-1495474472287-4d71bcdd2085'),
  food: unsplash('photo-1542838132-92c53300491e'),
  crafts: unsplash('photo-1605000797499-95a51c5269ae'),
  shipping: unsplash('photo-1607082348824-0a96f2a4b9da'),
};

export const HERO_SLIDES: HeroSlide[] = [
  { id: 'rwanda', href: '/african-products' },
  { id: 'coffee', href: '/collections/coffee' },
  { id: 'food', href: '/catalog' },
  { id: 'crafts', href: '/collections/crafts' },
  { id: 'shipping', href: '/shipping' },
];

export interface HeroCarouselSlide {
  key: string;
  href: string;
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  imageAlt: string;
  /** Optional override for slides whose art should not be cropped. */
  imageClassName?: string;
  /** Short related detail, e.g. the live price of a product slide. */
  meta?: string;
}
