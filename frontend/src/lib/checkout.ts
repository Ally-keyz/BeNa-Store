import type { Language } from '@/i18n';

/** Shopify checkout locale codes for each site language. */
const SHOPIFY_LOCALES: Record<Language, string> = {
  de: 'de',
  en: 'en',
  fr: 'fr',
};

/** Final Shopify checkout URLs encode the locale as the last path segment. */
const CHECKOUT_PATH_LOCALE = /^(\/checkouts\/cn\/[^/]+)\/[a-z]{2,3}(?:-[a-z]{2,3})?\/?$/i;

/**
 * Force a Shopify checkout URL to render in the site's active language.
 *
 * Shopify fixes a checkout's language when the cart is created, so passing
 * `language` to `createCart` is the primary fix. This helper also rewrites the
 * handoff URL for carts that already exist (for example, one created before a
 * language switch): final checkout URLs carry the locale as a path segment
 * such as `/checkouts/cn/<token>/en-de`, while intermediate web URLs carry a
 * `?locale=` parameter. Other query parameters, including Shopify's checkout
 * signatures, are preserved. Malformed or empty URLs are returned unchanged.
 */
export function localizedCheckoutUrl(checkoutUrl: string, language: Language): string {
  const locale = SHOPIFY_LOCALES[language];
  if (!locale || !checkoutUrl) return checkoutUrl;

  let url: URL;
  try {
    url = new URL(checkoutUrl);
  } catch {
    return checkoutUrl;
  }

  const match = CHECKOUT_PATH_LOCALE.exec(url.pathname);
  if (match) {
    url.pathname = `${match[1]}/${locale}`;
  } else {
    url.searchParams.set('locale', locale);
  }

  return url.toString();
}
