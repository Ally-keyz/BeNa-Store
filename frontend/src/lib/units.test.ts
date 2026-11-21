import { describe, expect, it } from 'vitest';
import type { UnitPriceMeasurement } from '@/types';
import {
  formatWeightKg,
  getKilogramPackageWeightKg,
  getPackageWeightKg,
  getPricePerKg,
  usesKilogramUnits,
} from './units';

const measurement = (overrides: Partial<UnitPriceMeasurement> = {}): UnitPriceMeasurement => ({
  measuredType: 'WEIGHT',
  quantityUnit: 'G',
  quantityValue: 250,
  referenceUnit: 'KG',
  referenceValue: 1,
  ...overrides,
});

describe('package weight helpers', () => {
  it('prefers the structured Shopify measurement', () => {
    expect(
      getPackageWeightKg({
        title: 'Coffee 1 kg',
        measurement: measurement({ quantityValue: 500 }),
      }),
    ).toBe(0.5);
  });

  it('reads package sizes from titles and handles when Shopify omits them', () => {
    expect(getPackageWeightKg({ title: 'Premium coffee 250g' })).toBe(0.25);
    expect(getPackageWeightKg({ title: 'Ifu Y’Indagara 200g Ground Dried Small Fish' })).toBe(0.2);
    expect(getPackageWeightKg({ handle: 'coffee-freshly-roasted-1kg' })).toBe(1);
    expect(getPackageWeightKg({ title: 'Coffee 0,5 kg' })).toBe(0.5);
  });

  it('does not invent a weight for the unlabelled coffee sample', () => {
    expect(getPackageWeightKg({ title: 'Kleine Kaffee Probe' })).toBeNull();
  });

  it('only uses kilogram suffixes for coffee and indagara families', () => {
    expect(usesKilogramUnits({ title: 'Premium Rwandan Arabica Coffee 500g' })).toBe(true);
    expect(usesKilogramUnits({ title: 'Ifu Y’Indagara 200g' })).toBe(true);
    expect(usesKilogramUnits({ title: 'Indagara Z’Indundi 200g' })).toBe(true);
    expect(usesKilogramUnits({ title: 'UBURANGA Honey 500g' })).toBe(false);

    expect(getKilogramPackageWeightKg({ title: 'Coffee 250g' })).toBe(0.25);
    expect(getKilogramPackageWeightKg({ title: 'UBURANGA Honey 500g' })).toBeNull();
  });
});

describe('price per kg', () => {
  it('uses Shopify unit price and reference weight', () => {
    expect(
      getPricePerKg({
        title: 'Indagara 200g',
        unitPrice: { amount: '60.00', currencyCode: 'EUR' },
        unitPriceMeasurement: measurement({ quantityValue: 200, referenceUnit: 'KG' }),
      }),
    ).toEqual({ amount: '60.00', currencyCode: 'EUR' });
  });

  it('normalizes a unit price that uses a smaller reference weight', () => {
    expect(
      getPricePerKg({
        title: 'Coffee 250g',
        unitPrice: { amount: '4.00', currencyCode: 'EUR' },
        unitPriceMeasurement: measurement({
          quantityValue: 250,
          referenceUnit: 'G',
          referenceValue: 100,
        }),
      }),
    ).toEqual({ amount: '40.00', currencyCode: 'EUR' });
  });

  it('derives a missing coffee or ifu unit price from the package weight', () => {
    expect(
      getPricePerKg({
        title: 'Ifu Y’Indagara 200g',
        price: { amount: '12.00', currencyCode: 'EUR' },
      }),
    ).toEqual({ amount: '60.00', currencyCode: 'EUR' });

    expect(
      getPricePerKg({
        title: 'Premium coffee 500g',
        price: { amount: '19.99', currencyCode: 'EUR' },
      }),
    ).toEqual({ amount: '39.98', currencyCode: 'EUR' });
  });

  it('does not derive per-kg prices for unrelated products', () => {
    expect(
      getPricePerKg({
        title: 'UBURANGA Honey 500g',
        price: { amount: '9.50', currencyCode: 'EUR' },
      }),
    ).toBeNull();
  });
});

describe('formatWeightKg', () => {
  it('formats decimals for the active locale', () => {
    expect(formatWeightKg(0.25, 'en-IE')).toBe('0.25');
    expect(formatWeightKg(0.25, 'de-DE')).toBe('0,25');
    expect(formatWeightKg(1, 'de-DE')).toBe('1');
  });
});
