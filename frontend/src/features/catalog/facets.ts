/** Selected catalog facet values, grouped by facet source. */
export interface SelectedFacets {
  brands: string[];
  dietary: string[];
  origins: string[];
}

/** Stable empty selection; never mutated. */
export const EMPTY_FACETS: SelectedFacets = { brands: [], dietary: [], origins: [] };
