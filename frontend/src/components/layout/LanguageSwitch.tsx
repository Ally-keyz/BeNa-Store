import { useTranslation } from 'react-i18next';
import { useMarket } from '@/context/MarketContext';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { cn } from '@/lib/cn';
import { FlagIcon } from '@/components/ui/FlagIcon';

const LABELS: Record<string, string> = { de: 'DE', en: 'EN' };
const NAMES: Record<string, string> = { de: 'Deutsch', en: 'English' };

export interface LanguageSwitchProps {
  className?: string;
  /** Larger touch targets inside the mobile menu. */
  size?: 'sm' | 'md';
}

/** Compact flagged DE/EN switch. Both options stay visible and keyboard reachable. */
export function LanguageSwitch({ className, size = 'sm' }: LanguageSwitchProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useMarket();

  return (
    <div
      role="group"
      aria-label={t('header.languageLabel')}
      className={cn(
        'inline-flex items-center rounded-full border border-neutral-200/80 bg-surface p-1',
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
              'inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors duration-200',
              size === 'sm' ? 'h-11 px-2.5 text-[13px]' : 'h-11 px-3 text-[13px]',
              active
                ? 'bg-brand text-on-brand shadow-[0_1px_2px_rgba(13,11,10,0.12)]'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-ink',
            )}
          >
            <FlagIcon code={code} />
            <span className="tracking-[0.02em]">{LABELS[code]}</span>
          </button>
        );
      })}
    </div>
  );
}
