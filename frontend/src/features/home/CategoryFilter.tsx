import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

export const ALL_CATEGORIES = 'all';

const FALLBACK = [
  { handle: 'coffee', titleKey: 'nav.coffee' },
  { handle: 'food', titleKey: 'nav.food' },
  { handle: 'crafts', titleKey: 'nav.crafts' },
] as const;

interface CategoryFilterProps {
  value: string;
  onChange: (handle: string) => void;
  /** id of the element that shows the filtered results (for aria-controls) */
  controls?: string;
}

export function CategoryFilter({ value, onChange, controls }: CategoryFilterProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const options = [
    { handle: ALL_CATEGORIES, label: t('home.filterAll') },
    ...FALLBACK.map((fallback) => ({
      handle: fallback.handle as string,
      label: t(fallback.titleKey),
    })),
  ];

  return (
    // Colors inherit from the surrounding text, so this works on light or dark sections.
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-current opacity-15"
      />
      <div
        role="group"
        aria-label={t('home.filterLabel')}
        className="-mx-4 flex snap-x snap-mandatory gap-7 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:snap-none sm:gap-9 sm:px-0 [&::-webkit-scrollbar]:hidden"
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
              className={cn(
                'relative inline-flex min-h-12 shrink-0 snap-start items-center whitespace-nowrap text-[15px] font-medium transition-opacity',
                'focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                active ? 'opacity-100' : 'opacity-60 hover:opacity-100',
              )}
            >
              {option.label}
              {active ? (
                <motion.span
                  layoutId="category-filter-underline"
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-brand"
                  transition={
                    reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40 }
                  }
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}