import type { CatalogFacets } from '@/types';
import { canonicalBrandValue } from '@/lib/product';

/** Selected catalog facet values, grouped by facet source. */
export interface SelectedFacets {
  brands: string[];
  dietary: string[];
  origins: string[];
}

/** Stable empty selection; never mutated. */
export const EMPTY_FACETS: SelectedFacets = { brands: [], dietary: [], origins: [] };

const CANONICAL_BRAND_LABELS: Record<string, string> = {
  'bena-store': 'Bena Store',
};

/**
 * Shopify can expose the same storefront brand under more than one vendor
 * string. Merge those aliases before rendering filters so shoppers only see
 * one brand option, while counts from both vendors are preserved.
 */
export function normalizeCatalogFacets(
  facets: CatalogFacets | undefined,
): CatalogFacets | undefined {
  if (!facets) return undefined;

  const brands = new Map<string, CatalogFacets['brands'][number]>();
  for (const facet of facets.brands) {
    const value = canonicalBrandValue(facet.value);
    const existing = brands.get(value);
    if (existing) {
      existing.count += facet.count;
    } else {
      brands.set(value, {
        ...facet,
        value,
        label: CANONICAL_BRAND_LABELS[value] ?? facet.label,
      });
    }
  }

  return {
    ...facets,
    brands: [...brands.values()].sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    ),
  };
}
