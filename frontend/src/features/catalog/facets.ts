import type { CatalogFacets } from '@/types';
import { canonicalBrandValue, canonicalFacetValue, type FacetGroup } from '@/lib/product';

/** Selected catalog facet values, grouped by facet source. */
export interface SelectedFacets {
  brands: string[];
  dietary: string[];
  origins: string[];
}

/** Stable empty selection; never mutated. */
export const EMPTY_FACETS: SelectedFacets = { brands: [], dietary: [], origins: [] };

type FacetValue = CatalogFacets['brands'][number];
type MergeableFacetGroup = Exclude<FacetGroup, 'brands'>;

const CANONICAL_BRAND_LABELS: Record<string, string> = {
  'bena-store': 'Bena Store',
};

const CANONICAL_FACET_LABELS: Record<MergeableFacetGroup, Record<string, string>> = {
  dietary: {
    'gluten-free': 'Gluten free',
  },
  origins: {
    rwandan: 'Rwandan',
    african: 'African',
    ugandan: 'Ugandan',
    kenyan: 'Kenyan',
    ethiopian: 'Ethiopian',
    tanzanian: 'Tanzanian',
  },
};

function mergeFacetGroup(group: MergeableFacetGroup, values: FacetValue[]): FacetValue[] {
  const merged = new Map<string, FacetValue>();
  for (const facet of values) {
    const value = canonicalFacetValue(group, facet.value);
    const existing = merged.get(value);
    if (existing) {
      existing.count += facet.count;
      continue;
    }
    merged.set(value, {
      ...facet,
      value,
      label: CANONICAL_FACET_LABELS[group][value] ?? facet.label,
    });
  }
  return [...merged.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

/**
 * Collapse multilingual facet synonyms before rendering so shoppers see one
 * option per real brand, dietary claim or origin. Counts from every alias are
 * preserved, and the same canonical value is used to filter products.
 */
export function normalizeCatalogFacets(
  facets: CatalogFacets | undefined,
): CatalogFacets | undefined {
  if (!facets) return undefined;

  const brands = new Map<string, FacetValue>();
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
    dietary: mergeFacetGroup('dietary', facets.dietary),
    origins: mergeFacetGroup('origins', facets.origins),
  };
}
