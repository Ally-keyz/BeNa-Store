import { useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  hasNextPage: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  /** Start fetching slightly before the sentinel is actually visible. */
  rootMargin?: string;
}

/**
 * Attaches an IntersectionObserver to a sentinel element so paginated product
 * feeds grow automatically while the visitor scrolls — no "Load more" click.
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  loading = false,
  onLoadMore,
  rootMargin = '320px 0px',
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<T | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loading) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, loading, rootMargin]);

  return sentinelRef;
}
