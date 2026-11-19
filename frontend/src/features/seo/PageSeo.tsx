import { useQuery } from '@tanstack/react-query';
import {
  getSeoCollection,
  getSeoPage,
  getSeoProduct,
  type MarketParams,
} from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { Seo } from '@/app/Seo';

type SeoResource = 'product' | 'collection' | 'page';

export interface PageSeoFallback {
  title: string;
  description: string;
  path: string;
  robots?: string;
  image?: string | null;
}

export interface PageSeoProps {
  resource?: SeoResource;
  handle?: string;
  market?: MarketParams;
  fallback: PageSeoFallback;
}

/**
 * Uses canonical metadata and JSON-LD from the backend when available, and
 * falls back to local copy while the request is loading or unavailable.
 */
export function PageSeo({ resource, handle, market = {}, fallback }: PageSeoProps) {
  const query = useQuery({
    queryKey:
      resource === 'product'
        ? queryKeys.seo.product(handle ?? '')
        : resource === 'collection'
          ? queryKeys.seo.collection(handle ?? '')
          : queryKeys.seo.page(handle ?? ''),
    queryFn: async () => {
      if (!handle) return null;
      if (resource === 'product') return (await getSeoProduct(handle, market)).data;
      if (resource === 'collection') return (await getSeoCollection(handle, market)).data;
      return (await getSeoPage(handle)).data;
    },
    enabled: Boolean(resource && handle),
    staleTime: 10 * 60_000,
    retry: false,
  });

  const metadata = query.data;
  return (
    <Seo
      title={metadata?.title || fallback.title}
      description={metadata?.description || fallback.description}
      path={metadata?.canonicalUrl || fallback.path}
      robots={metadata?.robots || fallback.robots || 'index,follow'}
      image={metadata?.openGraph.image ?? fallback.image ?? null}
      type={metadata?.openGraph.type || 'website'}
      jsonLd={metadata?.jsonLd}
    />
  );
}
