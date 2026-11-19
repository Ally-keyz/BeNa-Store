import type { MetafieldValue } from '@/types/domain';

export interface MetafieldLine {
  text: string;
  ordered: boolean;
}

function flatten(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).map(flatten).filter(Boolean).join('\n');
  }
  return String(value);
}

/**
 * Shopify returns metafields as raw strings. JSON metafields are decoded into
 * readable text; plain text is returned unchanged. Nothing is trusted as HTML.
 */
export function decodeMetafield(field: MetafieldValue | null | undefined): string {
  const raw = field?.value?.trim();
  if (!raw) return '';
  const looksJson = field?.type?.toLowerCase().includes('json') || raw.startsWith('{') || raw.startsWith('[');
  if (!looksJson) return raw;
  try {
    return flatten(JSON.parse(raw)).trim();
  } catch {
    return raw;
  }
}

/** Split a decoded metafield into display lines, preserving list structure. */
export function metafieldLines(field: MetafieldValue | null | undefined): MetafieldLine[] {
  const decoded = decodeMetafield(field);
  if (!decoded) return [];
  return decoded
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({
      text: text.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').trim(),
      ordered: /^\s*\d+[.)]\s*/.test(text),
    }));
}

export function hasMetafield(field: MetafieldValue | null | undefined): boolean {
  return decodeMetafield(field).length > 0;
}
