import { describe, expect, it } from 'vitest';
import {
  extractBusinessNames,
  extractEmails,
  extractEuroAmounts,
  isEmphasizedInHtml,
  normalizeForComparison,
  parseEuroAmount,
  sentenceContaining,
  stripHtml,
} from '../../src/utils/html';

describe('html/text utilities', () => {
  it('strips tags and decodes entities', () => {
    const text = stripHtml('<p>Akarabo&nbsp;biscuits &amp; coffee</p><ul><li>Wheat</li></ul>');
    expect(text).toContain('Akarabo biscuits & coffee');
    expect(text).toContain('Wheat');
    expect(text).not.toContain('<p>');
  });

  it('normalizes text for duplicate-title comparison', () => {
    expect(normalizeForComparison('  Igiseke   Basket! ')).toBe('igiseke basket');
    expect(normalizeForComparison('IGISEKE basket')).toBe('igiseke basket');
  });

  it('detects emphasized allergens in HTML only', () => {
    expect(isEmphasizedInHtml('<p>Contains <strong>wheat</strong> flour</p>', 'wheat')).toBe(true);
    expect(isEmphasizedInHtml('<p>Contains wheat flour</p>', 'wheat')).toBe(false);
    expect(
      isEmphasizedInHtml('<h3>Allergens</h3><p>wheat, eggs and butter</p>', 'butter'),
    ).toBe(true);
  });

  it('extracts emails, business names and euro amounts', () => {
    const policy = `<p>Contact store@benaorigins.de or Hello@benaorigins.de.</p>
      <p>BeNa Origins UG, Hauptstrasse 1.</p><p>Germany €7.50, Europe EUR 19,90.</p>`;
    expect(extractEmails(policy).sort()).toEqual([
      'hello@benaorigins.de',
      'store@benaorigins.de',
    ]);
    expect(extractBusinessNames(policy).join(' ')).toMatch(/BeNa Origins UG/);
    const amounts = extractEuroAmounts(policy);
    expect(amounts.length).toBeGreaterThanOrEqual(2);
    expect(parseEuroAmount('€7,50')).toBe(7.5);
  });

  it('finds the sentence containing a keyword', () => {
    const sentence = sentenceContaining(
      'We deliver worldwide. Delivery within Germany costs 7.50 EUR.',
      'worldwide',
    );
    expect(sentence).toContain('worldwide');
  });
});
