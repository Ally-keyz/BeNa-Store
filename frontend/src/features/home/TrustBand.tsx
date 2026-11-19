import { useTranslation } from 'react-i18next';
import { ListChecks, Sprout, Truck } from 'lucide-react';
import { contentContainer } from '@/lib/layout';

const ITEMS = [
  { key: 'trustDirect', Icon: Sprout },
  { key: 'trustInfo', Icon: ListChecks },
  { key: 'trustDelivery', Icon: Truck },
] as const;

export function TrustBand() {
  const { t } = useTranslation();

  return (
    <section className="border-y border-terra-100 bg-terra-50/60" aria-label={t('home.storyEyebrow')}>
      <div className={`${contentContainer} grid gap-6 py-10 sm:grid-cols-3 sm:gap-8 sm:py-12`}>
        {ITEMS.map(({ key, Icon }) => (
          <div key={key} className="flex gap-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-terra-800">
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">{t(`home.${key}Title`)}</h2>
              <p className="mt-1 text-[13px] leading-5 text-neutral-600">{t(`home.${key}Body`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
