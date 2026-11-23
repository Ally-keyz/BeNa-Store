import type { ListProductsParams } from '@/api/endpoints';
import { matchesProductCategory } from '@/lib/product';
import { useInfiniteProducts } from './useCatalog';

interface CategoryFeedOptions {
  category: string;
  /** Live product feed; the classifier narrows it to the selected category. */
  allParams: Omit<ListProductsParams, 'after'>;
}

/**
 * Shared product source for the home and catalog category filters. Shopify
 * collection membership is deliberately not used: the live Drinks collection,
 * for example, omits Fanta and other beverages. Instead every product in the
 * live feed is classified from its own text, so the selected filter always
 * matches the products shown.
 */
export function useCategoryFeed({ category, allParams }: CategoryFeedOptions) {
  const query = useInfiniteProducts(allParams);
  const products = (query.data?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((product) => matchesProductCategory(product, category));

  return {
    query,
    products,
    hasNextPage: query.data?.pages.at(-1)?.hasNextPage ?? false,
  };
}
