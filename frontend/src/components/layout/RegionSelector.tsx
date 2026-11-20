import { Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMarket } from '@/context/MarketContext';
import { cn } from '@/lib/cn';

export interface RegionSelectorProps {
  className?: string;
  /** Full-width layout for the mobile drawer. */
  variant?: 'compact' | 'full';
}

/**
 * Country/currency selector (audit #21). Market data comes from the backend
 * localization endpoint; no currency is hardcoded in the component.
 */
export function RegionSelector({ className, variant = 'compact' }: RegionSelectorProps) {
  const { t } = useTranslation();
  const { country, currency, countries, regionName, setCountry, isLoading } = useMarket();

  const options = countries.length
    ? countries
    : [{ isoCode: country, name: regionName || country, currency }];

  return (
    <label
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border border-neutral-200/80 bg-surface text-neutral-700',
        variant === 'compact' ? 'px-2.5 sm:px-3' : 'w-full px-3',
        className,
      )}
    >
      <Globe2 className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
      <span className="sr-only">{t('remediation.regionLabel')}</span>
      <select
        aria-label={t('remediation.regionLabel')}
        data-testid="region-select"
        value={country}
        disabled={isLoading && countries.length === 0}
        onChange={(event) => setCountry(event.target.value)}
        className={cn(
          'min-w-0 cursor-pointer appearance-none bg-transparent text-[13px] font-medium text-ink outline-none',
          variant === 'compact' ? 'max-w-[8rem]' : 'flex-1',
        )}
      >
        {options.map((item) => (
          <option key={item.isoCode} value={item.isoCode}>
            {item.name} ({item.currency})
          </option>
        ))}
      </select>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {currency}
      </span>
    </label>
  );
}
