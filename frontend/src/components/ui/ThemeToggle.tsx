import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeMode } from '@/lib/theme';

const OPTIONS: Array<{ mode: ThemeMode; icon: typeof Sun }> = [
  { mode: 'light', icon: Sun },
  { mode: 'dark', icon: Moon },
  { mode: 'system', icon: Monitor },
];

/** Compact appearance menu for the header: light / dark / follow system. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { mode, theme, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const Icon = mode === 'system' ? Monitor : theme === 'dark' ? Moon : Sun;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('theme.label')}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-ink"
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t('theme.label')}
          className="animate-dialog-in absolute right-0 top-12 z-[60] w-48 origin-top-right rounded-2xl border border-neutral-200 bg-surface p-1.5 shadow-[0_20px_50px_-20px_rgba(13,11,10,0.45)]"
        >
          {OPTIONS.map(({ mode: option, icon: OptionIcon }) => {
            const active = mode === option;
            return (
              <button
                key={option}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setMode(option);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors',
                  active
                    ? 'bg-terra-50 text-ink'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-ink',
                )}
              >
                <OptionIcon className="h-4 w-4" aria-hidden="true" />
                <span className="flex-1 text-left">{t(`theme.${option}`)}</span>
                {active ? <Check className="h-3.5 w-3.5 text-brand-dark" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Full-width appearance switch used inside the mobile menu. */
export function ThemeSegmented({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();

  return (
    <div
      role="group"
      aria-label={t('theme.label')}
      className={cn(
        'inline-flex w-full items-center rounded-full border border-neutral-200/80 bg-surface p-1',
        className,
      )}
    >
      {OPTIONS.map(({ mode: option, icon: OptionIcon }) => {
        const active = mode === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => setMode(option)}
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-medium transition-colors',
              active
                ? 'bg-brand text-on-brand shadow-[0_1px_2px_rgba(13,11,10,0.12)]'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-ink',
            )}
          >
            <OptionIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t(`theme.${option}`)}
          </button>
        );
      })}
    </div>
  );
}
