import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react';
import { useMarket } from '@/context/MarketContext';
import { SUPPORTED_LANGUAGES, type Language } from '@/i18n';
import { cn } from '@/lib/cn';
import { FlagIcon } from '@/components/ui/FlagIcon';

const LABELS: Record<Language, string> = { de: 'DE', en: 'EN', fr: 'FR' };
const NAMES: Record<Language, string> = { de: 'Deutsch', en: 'English', fr: 'Français' };

export interface LanguageSwitchProps {
  className?: string;
  /** Larger touch targets inside the mobile menu. */
  size?: 'sm' | 'md';
  /**
   * `popover` floats over the page (desktop header). `inline` expands in the
   * normal document flow — used in the mobile drawer whose scroll container
   * would otherwise clip an absolutely positioned menu.
   */
  variant?: 'popover' | 'inline';
}

/** Custom flagged language dropdown with the current choice always visible. */
export function LanguageSwitch({
  className,
  size = 'sm',
  variant = 'popover',
}: LanguageSwitchProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useMarket();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (code: Language) => {
    setLanguage(code);
    setOpen(false);
  };

  const menu = (
    <div className="rounded-xl border border-neutral-200 bg-surface p-1 shadow-[0_12px_32px_rgba(13,11,10,0.14)]">
      <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {t('header.languageLabel')}
      </p>
      {SUPPORTED_LANGUAGES.map((code) => {
        const active = code === language;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            onClick={() => select(code)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
              active
                ? 'bg-terra-50 font-semibold text-ink'
                : 'text-neutral-700 hover:bg-neutral-100 hover:text-ink',
            )}
          >
            <FlagIcon code={code} />
            <span className="flex-1 text-left">{NAMES[code]}</span>
            {active ? <Check className="h-4 w-4 text-brand-dark" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={cn('relative inline-flex', variant === 'inline' && 'w-full flex-col', className)}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t('header.languageLabel')}: ${NAMES[language]}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-neutral-200/80 bg-surface font-medium text-ink transition-colors hover:bg-neutral-100',
          size === 'sm' ? 'h-11 gap-1 px-2 sm:gap-1.5 sm:px-2.5' : 'h-11 px-3',
          variant === 'inline' && 'w-full',
        )}
      >
        <FlagIcon code={language} />
        <span className="text-[13px] tracking-[0.02em]">{LABELS[language]}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'h-3.5 w-3.5 text-neutral-500 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        variant === 'inline' ? (
          <div className="mt-2 animate-fade-in">{menu}</div>
        ) : (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[10.5rem] animate-pop-in">
            {menu}
          </div>
        )
      ) : null}
    </div>
  );
}
