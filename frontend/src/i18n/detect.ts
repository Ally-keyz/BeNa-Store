import type { Language } from './index';

/**
 * Return the first supported language from an ordered list of BCP-47 tags.
 * Device preferences are ordered by priority, so `['es-ES', 'de-DE', 'en']`
 * resolves to German. Regional variants such as `de-CH` or `fr-CA` match their
 * base language.
 */
export function languageFromTags(tags: readonly string[]): Language | null {
  for (const tag of tags) {
    const base = tag.trim().toLowerCase().split('-')[0];
    if (base === 'de' || base === 'en' || base === 'fr') return base;
  }
  return null;
}
