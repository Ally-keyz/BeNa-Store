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
        unitPrice: { amount: '60.00', currencyCode: 'EUR' },
        unitPriceMeasurement: measurement({ quantityValue: 200, referenceUnit: 'KG' }),
      }),
    ).toEqual({ amount: '60.00', currencyCode: 'EUR' });
  });

  it('normalizes a unit price that uses a smaller reference weight', () => {
    expect(
      getPricePerKg({
        unitPrice: { amount: '4.00', currencyCode: 'EUR' },
        unitPriceMeasurement: measurement({
          quantityValue: 250,
          referenceUnit: 'G',
          referenceValue: 100,
        }),
      }),
    ).toEqual({ amount: '40.00', currencyCode: 'EUR' });
  });

  it('never derives a per-kg price from a pack price', () => {
    expect(getPricePerKg({})).toBeNull();
    expect(getPricePerKg({ unitPriceMeasurement: measurement({ quantityValue: 200 }) })).toBeNull();
  });

  it('hides the price when Shopify omits the measurement or uses a non-weight unit', () => {
    expect(getPricePerKg({ unitPrice: { amount: '60.00', currencyCode: 'EUR' } })).toBeNull();
    expect(
      getPricePerKg({
        unitPrice: { amount: '60.00', currencyCode: 'EUR' },
        unitPriceMeasurement: measurement({ measuredType: 'VOLUME' }),
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
