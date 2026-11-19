import { useTranslation } from 'react-i18next';
import { useMarket } from '@/context/MarketContext';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { cn } from '@/lib/cn';

const LABELS: Record<string, string> = { de: 'DE', en: 'EN' };
const NAMES: Record<string, string> = { de: 'Deutsch', en: 'English' };

export interface LanguageSwitchProps {
  className?: string;
  /** Larger touch targets inside the mobile menu. */
  size?: 'sm' | 'md';
}

/** Compact DE/EN switch. Both options stay visible and keyboard reachable. */
export function LanguageSwitch({ className, size = 'sm' }: LanguageSwitchProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useMarket();

  return (
    <div
      role="group"
      aria-label={t('header.languageLabel')}
      className={cn(
        'inline-flex items-center rounded-full border border-chocolate-200 bg-white p-0.5',
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map((code) => {
        const active = code === language;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            aria-label={NAMES[code]}
            onClick={() => setLanguage(code)}
            className={cn(
              'rounded-full font-medium transition-colors duration-200',
              size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-8 px-3 text-xs',
              active
                ? 'bg-chocolate-900 text-white'
                : 'text-neutral-600 hover:bg-chocolate-50 hover:text-ink',
            )}
          >
            {LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
