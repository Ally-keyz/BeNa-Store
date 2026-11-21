import { Coffee, Droplets, Fish, Sprout } from 'lucide-react';
import type { ProductStoryIcon as ProductStoryIconName } from '@/content/productStories';

const ICONS = {
  coffee: Coffee,
  honey: Droplets,
  fish: Fish,
  beans: Sprout,
} as const;

export interface ProductStoryIconProps {
  icon: ProductStoryIconName;
  className?: string;
}

/** Decorative icon shared by the About story grid and individual story pages. */
export function ProductStoryIcon({ icon, className }: ProductStoryIconProps) {
  const Icon = ICONS[icon];
  return <Icon className={className} aria-hidden="true" />;
}
