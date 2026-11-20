import { motion } from 'framer-motion';
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

  const options = [
    { handle: ALL_CATEGORIES, label: t('home.filterAll') },
    ...FALLBACK.map((fallback) => ({
      handle: fallback.handle as string,
      label: t(fallback.titleKey),
    })),
  ];

  return (
    <div
      role="group"
      aria-label={t('home.filterLabel')}
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:snap-none sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const active = option.handle === value;
        return (
          <motion.button
            key={option.handle}
            type="button"
            onClick={() => onChange(option.handle)}
            aria-pressed={active}
            aria-controls={controls}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className={cn(
              'inline-flex min-h-11 shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-full border-0 px-5 py-2.5 text-sm font-semibold transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark',
              active
                ? 'bg-brand text-on-brand shadow-sm'
                : 'bg-night text-white hover:bg-white/10',
            )}
          >
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
}
