import type { Money } from '../types/domain';

export function toAmount(money: Money | null | undefined): number {
  if (!money) return 0;
  const value = Number.parseFloat(money.amount);
  return Number.isFinite(value) ? value : 0;
}

export function isZeroMoney(money: Money | null | undefined): boolean {
  return toAmount(money) === 0;
}

export function compareMoney(a: Money | null | undefined, b: Money | null | undefined): number {
  return toAmount(a) - toAmount(b);
}

export function formatMoney(money: Money | null | undefined): string {
  if (!money) return '';
  const amount = toAmount(money);
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: money.currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${money.currencyCode}`;
  }
}

export function money(amount: number | string, currencyCode: string): Money {
  return { amount: typeof amount === 'number' ? amount.toFixed(2) : amount, currencyCode };
}

export function percentDiscount(price: Money, compareAt: Money | null): number | null {
  const compare = toAmount(compareAt);
  const current = toAmount(price);
  if (!compare || compare <= current) return null;
  return Math.round(((compare - current) / compare) * 100);
}
