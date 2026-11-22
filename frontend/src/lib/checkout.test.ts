import { describe, expect, it } from 'vitest';
import { localizedCheckoutUrl } from './checkout';

const CHECKOUT =
  'https://benaafricanshop.myshopify.com/checkouts/cn/hWNJRvQ1UySNMfJJhcGLxTs2/en-de?_r=AQABKpq&_s=49254e42&_y=feb024c6';

describe('localizedCheckoutUrl', () => {
  it('replaces the locale path segment with the site language and keeps signatures', () => {
    const result = new URL(localizedCheckoutUrl(CHECKOUT, 'de'));
    expect(result.pathname).toBe('/checkouts/cn/hWNJRvQ1UySNMfJJhcGLxTs2/de');
    expect(result.searchParams.get('_r')).toBe('AQABKpq');
    expect(result.searchParams.get('_s')).toBe('49254e42');
    expect(result.searchParams.get('_y')).toBe('feb024c6');
  });

  it('rewrites other site languages and existing locale path segments', () => {
    expect(new URL(localizedCheckoutUrl(CHECKOUT, 'fr')).pathname).toMatch(/\/fr$/);
    expect(new URL(localizedCheckoutUrl(CHECKOUT, 'en')).pathname).toMatch(/\/en$/);
  });

  it('handles a trailing slash without duplicating the locale', () => {
    const url = CHECKOUT.replace('/en-de?', '/en-de/?');
    expect(new URL(localizedCheckoutUrl(url, 'de')).pathname).toBe(
      '/checkouts/cn/hWNJRvQ1UySNMfJJhcGLxTs2/de',
    );
  });

  it('sets the locale query parameter on intermediate checkout web URLs', () => {
    const url = 'https://benaafricanshop.myshopify.com/cart/c/token?_s=abc';
    const result = new URL(localizedCheckoutUrl(url, 'fr'));
    expect(result.searchParams.get('locale')).toBe('fr');
    expect(result.searchParams.get('_s')).toBe('abc');
  });

  it('replaces an existing locale query parameter', () => {
    const url = 'https://benaafricanshop.myshopify.com/checkout?locale=en&_s=abc';
    const result = new URL(localizedCheckoutUrl(url, 'de'));
    expect(result.searchParams.get('locale')).toBe('de');
    expect(result.searchParams.get('_s')).toBe('abc');
  });

  it('leaves malformed or empty URLs untouched', () => {
    expect(localizedCheckoutUrl('not a url', 'de')).toBe('not a url');
    expect(localizedCheckoutUrl('', 'de')).toBe('');
  });
});
