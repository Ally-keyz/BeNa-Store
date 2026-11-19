import { describe, expect, it } from 'vitest';
import { decodeMetafield, hasMetafield, metafieldLines } from './metafields';
import { metafield } from '@/test/fixtures';

describe('decodeMetafield', () => {
  it('returns plain text unchanged', () => {
    expect(decodeMetafield(metafield('Contains tree nuts'))).toBe('Contains tree nuts');
  });

  it('decodes JSON objects into readable lines', () => {
    const field = metafield(
      JSON.stringify({ ingredients: 'Wildflower honey', origin: 'Rwanda' }),
      'json',
    );
    expect(decodeMetafield(field)).toBe('Wildflower honey\nRwanda');
  });

  it('decodes JSON arrays', () => {
    const field = metafield(JSON.stringify(['Rwanda', 'Nyamasheke']), 'json');
    expect(decodeMetafield(field)).toBe('Rwanda\nNyamasheke');
  });

  it('falls back to raw text for invalid JSON', () => {
    const raw = '{"broken":';
    expect(decodeMetafield(metafield(raw, 'json'))).toBe(raw);
  });

  it('treats missing and empty values as absent', () => {
    expect(decodeMetafield(null)).toBe('');
    expect(decodeMetafield(metafield('   '))).toBe('');
    expect(hasMetafield(metafield('   '))).toBe(false);
    expect(hasMetafield(metafield('Milk'))).toBe(true);
  });
});

describe('metafieldLines', () => {
  it('detects numbered preparation steps and strips the marker', () => {
    const lines = metafieldLines(metafield('1. Warm gently\n2. Stir before serving'));
    expect(lines).toEqual([
      { text: 'Warm gently', ordered: true },
      { text: 'Stir before serving', ordered: true },
    ]);
  });

  it('keeps bullet lines unordered', () => {
    const lines = metafieldLines(metafield('- Rinse\n- Brew'));
    expect(lines).toEqual([
      { text: 'Rinse', ordered: false },
      { text: 'Brew', ordered: false },
    ]);
  });

  it('returns no lines for an absent field', () => {
    expect(metafieldLines(null)).toEqual([]);
  });
});
