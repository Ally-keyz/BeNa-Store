import { describe, expect, it } from 'vitest';
import { formatMoney, formatUnitPrice, isOnSale, percentDiscount } from './money';

describe('money helpers', () => {
  it('formats money with Intl for the active locale', () => {
    expect(formatMoney({ amount: '12.90', currencyCode: 'EUR' }, { locale: 'de-DE' })).toContain('12,90');
    expect(formatMoney({ amount: '12.90', currencyCode: 'EUR' }, { locale: 'en-IE' })).toContain('12.90');
  });

  it('renders nothing for missing money', () => {
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(undefined)).toBe('');
  });

  it('hides unknown or zero unit prices', () => {
    expect(formatUnitPrice(null, null)).toBe('');
    expect(formatUnitPrice({ amount: '0.00', currencyCode: 'EUR' }, null)).toBe('');
  });

  it('formats a known unit price with its reference unit', () => {
    const result = formatUnitPrice(
      { amount: '31.60', currencyCode: 'EUR' },
      {
        measuredType: 'weight',
        quantityUnit: 'KG',
        quantityValue: 1,
        referenceUnit: 'kg',
        referenceValue: 1,
      },
      { locale: 'de-DE' },
    );
    expect(result).toContain('/ kg');
  });

  it('only treats a strictly higher compare-at as a sale', () => {
    const price = { amount: '10.00', currencyCode: 'EUR' };
    expect(isOnSale(price, null)).toBe(false);
    expect(isOnSale(price, { amount: '0.00', currencyCode: 'EUR' })).toBe(false);
    expect(isOnSale(price, { amount: '10.00', currencyCode: 'EUR' })).toBe(false);
    expect(isOnSale(price, { amount: '12.00', currencyCode: 'EUR' })).toBe(true);
    expect(percentDiscount(price, { amount: '20.00', currencyCode: 'EUR' })).toBe(50);
  });
});
