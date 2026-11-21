import { Helmet } from 'react-helmet-async';
import { env } from '@/config';
import { useMarket } from '@/context/MarketContext';
import type { Language } from '@/i18n';

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

const LOCALES: Record<Language, string> = {
  de: 'de_DE',
  en: 'en_US',
  fr: 'fr_FR',
};

function absoluteUrl(path: string): string {
  const base = env.siteUrl.replace(/\/+$/, '');
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Client-side metadata layer. The static shell carries crawlable defaults from
 * the Vite build; this keeps every route uniquely titled as the user navigates.
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
  const { language } = useMarket();
  const canonical = absoluteUrl(path);
  const shareImage = absoluteUrl(image || '/logo.webp');

  return (
    <Helmet prioritizeSeoTags>
      <html lang={language} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content="BeNa Origins" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={LOCALES[language]} />
      <meta property="og:image" content={shareImage} />
      <meta property="og:image:alt" content={title} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={shareImage} />
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
