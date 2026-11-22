import { describe, expect, it } from 'vitest';
import { languageFromTags } from './detect';

describe('languageFromTags', () => {
  it('uses the first supported device language in priority order', () => {
    expect(languageFromTags(['de-DE', 'en-GB', 'fr-FR'])).toBe('de');
    expect(languageFromTags(['fr-CA', 'en-US'])).toBe('fr');
    expect(languageFromTags(['en-US', 'de-DE'])).toBe('en');
  });

  it('matches regional variants and case differences', () => {
    expect(languageFromTags(['de-CH'])).toBe('de');
    expect(languageFromTags(['FR'])).toBe('fr');
  });

  it('skips unsupported languages to find a supported fallback', () => {
    expect(languageFromTags(['es-ES', 'de-AT', 'en'])).toBe('de');
    expect(languageFromTags(['ar', 'tr-TR', 'fr'])).toBe('fr');
  });

  it('returns null when no supported language is present', () => {
    expect(languageFromTags([])).toBeNull();
    expect(languageFromTags(['es-ES', 'it-IT'])).toBeNull();
  });
});
