import { describe, expect, it } from 'vitest';
import {
  addCartLinesBody,
  createCartBody,
  listProductsQuery,
  newsletterBody,
  auditCatalogQuery,
} from '../../src/schemas/requests';
import { countrySchema } from '../../src/schemas/common';

describe('request schemas', () => {
  it('normalizes country codes and rejects invalid lengths', () => {
    expect(countrySchema.parse('de')).toBe('DE');
    expect(() => countrySchema.parse('Germany')).toThrow();
  });

  it('validates newsletter email and consent type', () => {
    expect(
      newsletterBody.parse({ email: 'a@b.de', marketingConsent: true }),
    ).toMatchObject({ email: 'a@b.de' });
    expect(() => newsletterBody.parse({ email: 'nope', marketingConsent: true })).toThrow();
    expect(() =>
      newsletterBody.parse({ email: 'a@b.de', marketingConsent: 'yes' }),
    ).toThrow();
  });

  it('enforces cart line GIDs and quantity limits', () => {
    const valid = createCartBody.parse({
      lines: [
        {
          merchandiseId: 'gid://shopify/ProductVariant/123',
          quantity: 2,
        },
      ],
    });
    expect(valid.lines?.[0]?.quantity).toBe(2);

    expect(() =>
      addCartLinesBody.parse({
        lines: [{ merchandiseId: 'https://evil.example', quantity: 1 }],
      }),
    ).toThrow();

    expect(() =>
      addCartLinesBody.parse({
        lines: [{ merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 0 }],
      }),
    ).toThrow();
  });

  it('coerces pagination and boolean query flags', () => {
    const products = listProductsQuery.parse({ first: '5', reverse: 'true' });
    expect(products.first).toBe(5);
    expect(products.reverse).toBe(true);

    const audit = auditCatalogQuery.parse({ refresh: 'false', limit: '10' });
    expect(audit.refresh).toBe(false);
    expect(audit.limit).toBe(10);
  });
});
