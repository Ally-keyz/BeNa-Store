import type { Money, ProductVariant, UnitPriceMeasurement } from '@/types/domain';

export interface MoneyFormatOptions {
  /** BCP-47 locale for Intl.NumberFormat, e.g. 'de-DE'. */
  locale?: string;
  /** Override the currency code. */
  currency?: string;
  /** Always render two decimals even for whole amounts. */
  alwaysDecimals?: boolean;
}

/** Parse a Money string into a number (0 when missing/invalid). */
export function toAmount(money?: Money | null): number {
  if (!money) return 0;
  const value = Number.parseFloat(money.amount);
  return Number.isFinite(value) ? value : 0;
}

/** Format a Money value using Intl.NumberFormat for the active locale/currency. */
export function formatMoney(
  money: Money | null | undefined,
  options: MoneyFormatOptions = {},
): string {
  if (!money) return '';
  const amount = toAmount(money);
  const currency = options.currency ?? money.currencyCode;
  const locale = options.locale ?? 'de-DE';
  const minDigits = options.alwaysDecimals || !Number.isInteger(amount) ? 2 : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Format a unit price like "31,60 € / kg". Returns '' when missing. */
export function formatUnitPrice(
  unitPrice: Money | null | undefined,
  measurement: UnitPriceMeasurement | null | undefined,
  options: MoneyFormatOptions = {},
): string {
  if (!unitPrice || toAmount(unitPrice) === 0) return '';
  const reference = (measurement?.referenceUnit ?? '').trim().toLowerCase();
  const base = formatMoney(unitPrice, { ...options, alwaysDecimals: true });
  return reference ? `${base} / ${reference}` : base;
}

/** True when the variant has a valid sale: compare-at strictly above price. */
export function isOnSale(
  price: Money | null | undefined,
  compareAtPrice: Money | null | undefined,
): boolean {
  const compare = toAmount(compareAtPrice);
  const current = toAmount(price);
  return compare > 0 && compare > current;
}

/** Percent discount (rounded), or null when not a valid sale. */
export function percentDiscount(
  price: Money | null | undefined,
  compareAtPrice: Money | null | undefined,
): number | null {
  if (!isOnSale(price, compareAtPrice)) return null;
  const compare = toAmount(compareAtPrice);
  const current = toAmount(price);
  return Math.round(((compare - current) / compare) * 100);
}

/** The representative variant for a product (first available, else first). */
export function representativeVariant(product: {
  variants: ProductVariant[];
}): ProductVariant | null {
  if (product.variants.length === 0) return null;
  return product.variants.find((v) => v.availableForSale) ?? product.variants[0] ?? null;
}
