import { describe, expect, it } from 'vitest';
import { formatMoney, isOnSale, percentDiscount } from './money';

describe('money helpers', () => {
  it('formats money with Intl for the active locale', () => {
    expect(formatMoney({ amount: '12.90', currencyCode: 'EUR' }, { locale: 'de-DE' })).toContain('12,90');
    expect(formatMoney({ amount: '12.90', currencyCode: 'EUR' }, { locale: 'en-IE' })).toContain('12.90');
  });

  it('renders nothing for missing money', () => {
    expect(formatMoney(null)).toBe('');
    expect(formatMoney(undefined)).toBe('');
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
