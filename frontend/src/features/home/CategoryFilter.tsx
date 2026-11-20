import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export const ALL_CATEGORIES = 'all';

const CATEGORY_IMAGE = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=640&q=80`;

const FALLBACK = [
  {
    handle: 'coffee',
    titleKey: 'nav.coffee',
    image: CATEGORY_IMAGE('photo-1447933601403-0c6688de566e'),
  },
  {
    handle: 'food',
    titleKey: 'nav.food',
    image: CATEGORY_IMAGE('photo-1542838132-92c53300491e'),
  },
  {
    handle: 'crafts',
    titleKey: 'nav.crafts',
    image: CATEGORY_IMAGE('photo-1493106641515-6b5631de4bb9'),
  },
] as const;

const ALL_IMAGE = CATEGORY_IMAGE('photo-1607082348824-0a96f2a4b9da');

interface CategoryFilterProps {
  value: string;
  onChange: (handle: string) => void;
  /** id of the element that shows the filtered results (for aria-controls) */
  controls?: string;
}

/**
 * Image-backed category controls. Labels always come from i18n — never from
 * collection titles — so the "All / Coffee / Food / Crafts" row is correctly
 * translated and never shows backend or brand metadata.
 */
export function CategoryFilter({ value, onChange, controls }: CategoryFilterProps) {
  const { t } = useTranslation();

  const options = [
    { handle: ALL_CATEGORIES, label: t('home.filterAll'), image: ALL_IMAGE },
    ...FALLBACK.map((fallback) => ({
      handle: fallback.handle as string,
      label: t(fallback.titleKey),
      image: fallback.image,
    })),
  ];

  return (
    <div
      role="group"
      aria-label={t('home.filterLabel')}
      className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const active = option.handle === value;
        return (
          <button
            key={option.handle}
            type="button"
            onClick={() => onChange(option.handle)}
            aria-pressed={active}
            aria-controls={controls}
            style={{
              backgroundImage: `linear-gradient(135deg, ${
                active ? 'rgba(255,112,52,.82)' : 'rgba(13,11,10,.58)'
              }, rgba(13,11,10,.78)), url("${option.image}")`,
            }}
            className={cn(
              'relative inline-flex min-h-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300',
              'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark',
              active
                ? 'ring-2 ring-brand ring-offset-2 ring-offset-paper'
                : 'ring-1 ring-black/5 hover:brightness-110',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
