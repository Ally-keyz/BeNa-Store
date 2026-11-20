import { useTranslation } from 'react-i18next';
import type { CatalogFacets as CatalogFacetsData, CatalogFacetValue } from '@/types';
import { cn } from '@/lib/cn';
import type { FacetGroup } from '@/lib/product';
import { EMPTY_FACETS, type SelectedFacets } from './facets';

export interface CatalogFacetsProps {
  facets: CatalogFacetsData | undefined;
  selected: SelectedFacets;
  onChange: (next: SelectedFacets) => void;
  loading?: boolean;
}

/** Catalog-derived filters for brand, dietary claims and origin (audit #20). */
export function CatalogFacets({ facets, selected, onChange, loading = false }: CatalogFacetsProps) {
  const { t } = useTranslation();

  const groups: Array<{
    group: FacetGroup;
    titleKey: string;
    values: CatalogFacetValue[];
  }> = [
    { group: 'brands', titleKey: 'remediation.facetsBrands', values: facets?.brands ?? [] },
    { group: 'dietary', titleKey: 'remediation.facetsDietary', values: facets?.dietary ?? [] },
    { group: 'origins', titleKey: 'remediation.facetsOrigins', values: facets?.origins ?? [] },
  ];

  const hasOptions = groups.some((entry) => entry.values.length > 0);
  const hasSelection = groups.some((entry) => selected[entry.group].length > 0);

  const toggle = (group: FacetGroup, value: string) => {
    const current = selected[group];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...selected, [group]: next });
  };

  if (!loading && !hasOptions) {
    return (
      <p className="mt-6 rounded-card border border-terra-100 bg-terra-50/60 p-4 text-[13px] leading-6 text-neutral-600">
        {t('remediation.facetsNoOptions')}
      </p>
    );
  }

  return (
    <section aria-labelledby="catalog-facets-title" className="mt-6 rounded-card border border-terra-100 bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="catalog-facets-title" className="text-[13px] font-semibold uppercase tracking-[0.14em] text-neutral-700">
          {t('remediation.facetsTitle')}
        </h2>
        {hasSelection ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FACETS)}
            className="inline-flex min-h-11 items-center rounded-sm text-[12px] font-medium text-terra-800 underline underline-offset-2 hover:text-ink sm:min-h-0"
          >
            {t('remediation.facetsClear')}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {groups.map(({ group, titleKey, values }) => (
          <div key={group} role="group" aria-label={t(titleKey)} className="min-w-0">
            <h3 className="text-[12px] font-medium text-ink">{t(titleKey)}</h3>
            {values.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {values.map((facet) => {
                  const active = selected[group].includes(facet.value);
                  return (
                    <button
                      key={facet.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(group, facet.value)}
                      className={cn(
                        'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors sm:min-h-0',
                        active
                          ? 'border-brand bg-brand text-on-brand'
                          : 'border-terra-200 text-neutral-600 hover:bg-terra-50 hover:text-ink',
                      )}
                    >
                      <span>{facet.label}</span>
                      <span className="tabular text-[11px] opacity-70">{facet.count}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-2 text-[12px] text-neutral-500">{t('remediation.facetsNoOptions')}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
