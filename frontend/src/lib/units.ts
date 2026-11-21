import type { Money, SelectedOption, UnitPriceMeasurement } from '@/types';
import { toAmount } from './money';

export interface WeightContext {
  handle?: string | null;
  title?: string | null;
  productType?: string | null;
  tags?: readonly string[];
  variantTitle?: string | null;
  selectedOptions?: readonly SelectedOption[];
  measurement?: UnitPriceMeasurement | null;
}

export interface PricePerKgContext {
  unitPrice?: Money | null;
  unitPriceMeasurement?: UnitPriceMeasurement | null;
}

/**
 * Matches a package weight inside a title, handle or option value.
 * Examples: `250g`, `1 Kg`, `0,5 kg`, `200 grams`.
 */
const WEIGHT_TOKEN =
  /(?:^|[^\p{L}\d])(\d+(?:[.,]\d+)?)\s*(kg|kgs?|kilogram(?:s)?|g|gr|gram(?:s)?)(?=$|[^\p{L}])/iu;

function toKilograms(value: number, unit: string): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const normalized = unit.toLowerCase();
  if (normalized.startsWith('k')) return value;
  if (normalized.startsWith('g')) return value / 1000;
  return null;
}

function parseWeightText(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = WEIGHT_TOKEN.exec(value);
  const rawAmount = match?.[1];
  const rawUnit = match?.[2];
  if (!rawAmount || !rawUnit) return null;
  return toKilograms(Number.parseFloat(rawAmount.replace(',', '.')), rawUnit);
}

function measurementWeightKg(measurement: UnitPriceMeasurement | null | undefined): number | null {
  if (!measurement) return null;
  const measuredType = (measurement.measuredType ?? '').toUpperCase();
  if (measuredType && measuredType !== 'WEIGHT') return null;
  return toKilograms(measurement.quantityValue, measurement.quantityUnit ?? '');
}

function referenceWeightKg(measurement: UnitPriceMeasurement | null | undefined): number | null {
  if (!measurement) return null;
  const measuredType = (measurement.measuredType ?? '').toUpperCase();
  if (measuredType && measuredType !== 'WEIGHT') return null;
  const referenceValue = measurement.referenceValue > 0 ? measurement.referenceValue : 1;
  return toKilograms(referenceValue, measurement.referenceUnit ?? '');
}

/**
 * Package weight in kilograms, preferring Shopify's structured measurement
 * and falling back to the package size written in the product title/handle.
 * Returns null when the weight is genuinely unknown — never guess a pack size.
 */
export function getPackageWeightKg(context: WeightContext): number | null {
  const measured = measurementWeightKg(context.measurement);
  if (measured) return measured;

  for (const option of context.selectedOptions ?? []) {
    const parsed = parseWeightText(option.value);
    if (parsed) return parsed;
  }

  return (
    parseWeightText(context.variantTitle) ??
    parseWeightText(context.title) ??
    parseWeightText(context.handle?.replace(/-/g, ' '))
  );
}

/** Products whose quantity controls should speak in kilograms. */
export function usesKilogramUnits(context: WeightContext): boolean {
  const text = [context.handle, context.title, context.productType, context.tags?.join(' ')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bcoffee\b|\bkaffee\b|\bcaf[eé]\b/.test(text)) return true;
  return /\bindagara\b/.test(text);
}

/** Package weight for the quantity suffix, or null when units should stay generic. */
export function getKilogramPackageWeightKg(context: WeightContext): number | null {
  if (!usesKilogramUnits(context)) return null;
  return getPackageWeightKg(context);
}

function moneyFromAmount(amount: number, currencyCode: string): Money {
  return { amount: amount.toFixed(2), currencyCode };
}

/**
 * Price per kilogram, only when Shopify supplies both a unit price and a
 * weight reference. We never divide the pack price by a weight parsed from a
 * title: that would present a calculated figure as if it came from the shop.
 */
export function getPricePerKg({ unitPrice, unitPriceMeasurement }: PricePerKgContext): Money | null {
  const referenceKg = referenceWeightKg(unitPriceMeasurement);
  if (!unitPrice || !referenceKg) return null;

  const perKg = toAmount(unitPrice) / referenceKg;
  return perKg > 0 ? moneyFromAmount(perKg, unitPrice.currencyCode) : null;
}

/** Locale-aware package weight without the unit, e.g. `0,25` in German. */
export function formatWeightKg(kilograms: number, locale = 'de-DE'): string {
  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 3,
    }).format(kilograms);
  } catch {
    return String(kilograms);
  }
}
