/**
 * Home hero slides. Copy lives in i18n under `hero.slides.<id>`.
 * Images are not supplied yet, so every slide renders a clearly labelled
 * placeholder; replace `image` here when photography lands.
 */
export type HeroSlideId = 'coffee' | 'food' | 'crafts' | 'shipping';

export interface HeroSlide {
  id: HeroSlideId;
  href: string;
  /** Optional image URL. Empty until the owner supplies photography. */
  image?: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  { id: 'coffee', href: '/collections/coffee' },
  { id: 'food', href: '/collections/food' },
  { id: 'crafts', href: '/collections/crafts' },
  { id: 'shipping', href: '/shipping' },
];
