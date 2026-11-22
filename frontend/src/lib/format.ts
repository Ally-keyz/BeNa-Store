/** Formatting helpers for quantities, dates and text. */

/** Format a date for display using the active locale. */
export function formatDate(iso: string | null | undefined, locale = 'de-DE'): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Clamp a line item quantity to the backend's allowed range (1..100). */
export function clampQuantity(value: number, max = 100): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(max, Math.max(1, Math.round(value)));
}
