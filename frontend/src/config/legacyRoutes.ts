/**
 * Shopify-era URLs that were indexed under the BeNa Origins custom domain.
 *
 * The storefront no longer has `/pages/*` or `/policies/*` routes, so these
 * paths used to fall through to the SPA 404 page. The same mappings are
 * configured as real 301 redirects in `render.yaml`; this module keeps the SPA
 * (local dev, previews and any environment where the Blueprint rules were not
 * applied) in sync.
 */

export const LEGACY_PAGE_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  'about-us': '/about',
  contact: '/contact',
  'shipping-policy': '/shipping',
  'zahlung-und-versand': '/shipping',
  'refund-return-policy-1': '/legal/refund',
  'faq-frequently-asked-questions': '/faq',
  faq: '/faq',
  homepage: '/',
  'meet-your-coffee': '/about/products/coffee',
  'allgemeine-geschaftsbedingungen-und-kundeninformationen': '/legal/terms',
  'widerrufsrecht-fur-den-verkauf-von-waren': '/legal/withdrawal',
  datenschutzerklarung: '/legal/privacy',
  impressum: '/legal/impressum',
  'privacy-policy': '/legal/privacy',
  'terms-of-service': '/legal/terms',
  'refund-policy': '/legal/refund',
  'legal-notice': '/legal/impressum',
});

export const LEGACY_POLICY_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  'shipping-policy': '/shipping',
  '54579265869': '/shipping',
  'refund-policy': '/legal/refund',
  '54476603725': '/legal/refund',
  'privacy-policy': '/legal/privacy',
  '54035546445': '/legal/privacy',
  'terms-of-service': '/legal/terms',
  '54579331405': '/legal/terms',
  'subscription-policy': '/legal/terms',
  'legal-notice': '/legal/impressum',
  impressum: '/legal/impressum',
});

export type LegacyRouteKind = 'page' | 'policy';

/** Return the canonical storefront path for a known legacy handle, if any. */
export function legacyRedirectPath(kind: LegacyRouteKind, handle: string): string | null {
  const table = kind === 'page' ? LEGACY_PAGE_REDIRECTS : LEGACY_POLICY_REDIRECTS;
  const normalized = handle.trim().toLowerCase().replace(/\.html$/, '');
  return table[normalized] ?? null;
}
