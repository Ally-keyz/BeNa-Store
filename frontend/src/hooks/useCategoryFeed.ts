import type { CollectionProductsParams, ListProductsParams } from '@/api/endpoints';
import { getCategoryCollectionHandle, matchesProductCategory } from '@/lib/product';
import { useInfiniteCollectionProducts, useInfiniteProducts } from './useCatalog';

interface CategoryFeedOptions {
  category: string;
  /** Product feed used for All and when the category collection is unavailable. */
  allParams: Omit<ListProductsParams, 'after'>;
  /** Collection feed used when the category maps to a Shopify collection. */
  collectionParams: Omit<CollectionProductsParams, 'after'>;
}

/**
 * Shared product source for the home and catalog category filters. Shopify
 * collection membership is authoritative; when a collection is missing or
 * empty, the live feed is narrowed by the same category classifier so the two
 * pages always show products that match the selected filter.
 */
export function useCategoryFeed({ category, allParams, collectionParams }: CategoryFeedOptions) {
  const collectionHandle = getCategoryCollectionHandle(category);

  const allQuery = useInfiniteProducts(allParams);
  const collectionQuery = useInfiniteCollectionProducts(collectionHandle ?? '', collectionParams);
  const collectionProducts = (collectionQuery.data?.pages ?? []).flatMap((page) => page.items);

  const useFeedFallback =
    Boolean(collectionHandle) &&
    (collectionQuery.isError ||
      (collectionQuery.isSuccess && collectionProducts.length === 0));

  const query = collectionHandle && !useFeedFallback ? collectionQuery : allQuery;
  const feedProducts = (query.data?.pages ?? []).flatMap((page) => page.items);
  const products = useFeedFallback
    ? feedProducts.filter((product) => matchesProductCategory(product, category))
    : feedProducts;

  return {
    query,
    products,
    hasNextPage: query.data?.pages.at(-1)?.hasNextPage ?? false,
    useFeedFallback,
  };
}
