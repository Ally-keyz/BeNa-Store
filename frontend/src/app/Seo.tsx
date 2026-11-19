import { Helmet } from 'react-helmet-async';
import { env } from '@/config';

export interface SeoProps {
  title: string;
  description: string;
  /** Path relative to VITE_SITE_URL, e.g. `/collections/coffee`. */
  path?: string;
  robots?: string;
  image?: string | null;
  /** Open Graph type, e.g. `product` or `collection`. */
  type?: string;
  /** Structured data supplied by the backend `/seo/*` endpoints. */
  jsonLd?: unknown[];
}

function absoluteUrl(path: string): string {
  const base = env.siteUrl.replace(/\/+$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Client-side metadata layer. Phase 6 adds backend `/seo/*` metadata and
 * prerendering; this keeps every route uniquely titled until then.
 */
export function Seo({
  title,
  description,
  path = '/',
  robots = 'index,follow',
  image,
  type = 'website',
  jsonLd,
}: SeoProps) {
  const canonical = absoluteUrl(path);
  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      {image ? <meta property="og:image" content={absoluteUrl(image)} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd?.length
        ? jsonLd.map((block, index) => (
            <script key={index} type="application/ld+json">
              {JSON.stringify(block)}
            </script>
          ))
        : null}
    </Helmet>
  );
}
