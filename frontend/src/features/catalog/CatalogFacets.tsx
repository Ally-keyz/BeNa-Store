import { useState } from 'react';
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

/** Long lists collapse to this many rows; selected values always stay visible. */
const VISIBLE_LIMIT = 6;

/** Catalog-derived filters for brand, dietary claims and origin (audit #20). */
export function CatalogFacets({ facets, selected, onChange, loading = false }: CatalogFacetsProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Partial<Record<FacetGroup, boolean>>>({});

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
      <p className="mt-6 text-[13px] leading-6 text-neutral-500">
        {t('remediation.facetsNoOptions')}
      </p>
    );
  }

  return (
    <section
      aria-labelledby="catalog-facets-title"
      aria-busy={loading}
      className="mt-6 border-t border-terra-100 pt-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="catalog-facets-title" className="text-[15px] font-semibold text-ink">
          {t('remediation.facetsTitle')}
        </h2>
        {hasSelection ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FACETS)}
            className="inline-flex min-h-11 items-center rounded-sm text-[13px] text-neutral-600 underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-0"
          >
            {t('remediation.facetsClear')}
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-x-10 gap-y-7 md:grid-cols-3">
        {groups.map(({ group, titleKey, values }) => {
          const isExpanded = Boolean(expanded[group]);
          const overflow = values.length > VISIBLE_LIMIT;
          const visible =
            isExpanded || !overflow
              ? values
              : values.filter(
                  (facet, index) => index < VISIBLE_LIMIT || selected[group].includes(facet.value),
                );
          const hiddenCount = values.length - visible.length;

          return (
            <div key={group} role="group" aria-labelledby={`facet-${group}`} className="min-w-0">
              <h3 id={`facet-${group}`} className="text-[13px] font-semibold text-ink">
                {t(titleKey)}
              </h3>

              {values.length ? (
                <>
                  <ul className="mt-1">
                    {visible.map((facet) => {
                      const active = selected[group].includes(facet.value);
                      return (
                        <li key={facet.value}>
                          <label className="group flex min-h-11 cursor-pointer items-center gap-2.5 text-[13px] sm:min-h-8">
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggle(group, facet.value)}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded-sm accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            />
                            <span
                              className={cn(
                                'min-w-0 flex-1 leading-5 transition-colors',
                                active
                                  ? 'font-medium text-ink'
                                  : 'text-neutral-700 group-hover:text-ink',
                              )}
                            >
                              {facet.label}
                            </span>
                            <span className="tabular text-[12px] text-neutral-500">{facet.count}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>

                  {overflow ? (
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpanded((prev) => ({ ...prev, [group]: !prev[group] }))}
                      className="mt-0.5 inline-flex min-h-11 items-center rounded-sm text-[13px] font-medium text-terra-800 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-8"
                    >
                      {isExpanded
                        ? t('remediation.facetsShowLess', { defaultValue: 'Show less' })
                        : t('remediation.facetsShowMore', {
                            defaultValue: 'Show {{count}} more',
                            count: hiddenCount,
                          })}
                    </button>
                  ) : null}
                </>
              ) : loading ? (
                <ul aria-hidden="true" className="mt-1">
                  {[0, 1, 2, 3, 4].map((row) => (
                    <li key={row} className="flex min-h-8 items-center gap-2.5">
                      <span className="h-4 w-4 shrink-0 animate-pulse rounded-sm bg-terra-100" />
                      <span className="h-3 w-2/3 animate-pulse rounded-sm bg-terra-100" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-neutral-500">{t('remediation.facetsNoOptions')}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}