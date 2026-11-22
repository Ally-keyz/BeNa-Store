import { describe, expect, it } from 'vitest';
import { legacyRedirectPath } from './legacyRoutes';

describe('legacy Shopify redirects', () => {
  it.each([
    ['about-us', '/about'],
    ['contact', '/contact'],
    ['shipping-policy', '/shipping'],
    ['refund-return-policy-1', '/legal/refund'],
    ['faq-frequently-asked-questions', '/faq'],
    ['meet-your-coffee', '/about/products/coffee'],
    ['impressum', '/legal/impressum'],
    ['datenschutzerklarung', '/legal/privacy'],
  ])('maps /pages/%s to %s', (handle, target) => {
    expect(legacyRedirectPath('page', handle)).toBe(target);
  });

  it.each([
    ['shipping-policy', '/shipping'],
    ['54579265869.html', '/shipping'],
    ['privacy-policy', '/legal/privacy'],
    ['subscription-policy', '/legal/terms'],
  ])('maps /policies/%s to %s', (handle, target) => {
    expect(legacyRedirectPath('policy', handle)).toBe(target);
  });

  it('normalizes case and ignores unknown handles', () => {
    expect(legacyRedirectPath('page', 'About-Us')).toBe('/about');
    expect(legacyRedirectPath('page', 'does-not-exist')).toBeNull();
    expect(legacyRedirectPath('policy', 'does-not-exist')).toBeNull();
  });
});
