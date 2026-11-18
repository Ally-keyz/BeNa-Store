/** Minimal, dependency-free HTML/text helpers used by audit + policy checks. */

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  euro: '€',
  pound: '£',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name] ?? match);
}

export function stripHtml(html: string): string {
  if (!html) return '';
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h[1-6]|tr|section)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function normalizeForComparison(input: string): string {
  return normalizeWhitespace(
    decodeEntities(stripHtml(input))
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim(),
  );
}

export function wordCount(input: string): number {
  const text = stripHtml(input);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/** True when an allergen keyword appears inside <strong>/<b>/<em>/<mark> or an allergen heading. */
export function isEmphasizedInHtml(html: string, keyword: string): boolean {
  if (!html) return false;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const emphasis = new RegExp(
    `<(strong|b|em|mark|u)\\b[^>]*>[\\s\\S]{0,160}?${escaped}[\\s\\S]{0,160}?<\\/\\1>`,
    'i',
  );
  if (emphasis.test(html)) return true;
  const heading = new RegExp(
    `<h[1-6][^>]*>[^<]{0,80}(allergen|allergie|contains|enthält)[^<]{0,80}<\\/h[1-6]>[\\s\\S]{0,400}?${escaped}`,
    'i',
  );
  return heading.test(html);
}

/** Find the sentence containing a keyword (for evidence strings). */
export function sentenceContaining(text: string, keyword: string): string | null {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`[^.!?\\n]{0,120}${escaped}[^.!?\\n]{0,160}`, 'i');
  const match = regex.exec(text);
  return match ? normalizeWhitespace(match[0]) : null;
}

const EMAIL_REGEX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export function extractEmails(text: string): string[] {
  const plain = stripHtml(text);
  const matches = plain.match(EMAIL_REGEX) ?? [];
  return [...new Set(matches.map((email) => email.toLowerCase()))];
}

const BUSINESS_SUFFIX =
  /\b(GmbH|mbH|UG|e\.?\s?K\.?|GbR|OHG|KG|AG|Ltd\.?|Limited|LLC|Inc\.?|Sarl|SARL|BV|B\.V\.)\b/;

/** Naive but useful extraction of business-name candidates from policy text. */
export function extractBusinessNames(text: string): string[] {
  const plain = stripHtml(text);
  const lines = plain
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length > 2 && line.length < 160);
  const names = new Set<string>();
  for (const line of lines) {
    if (BUSINESS_SUFFIX.test(line)) {
      // Keep the fragment around the legal suffix, not the whole paragraph.
      const index = line.search(BUSINESS_SUFFIX);
      const start = Math.max(0, index - 60);
      const fragment = line.slice(start, Math.min(line.length, index + 30)).trim();
      names.add(fragment.replace(/^[^A-Za-zÄÖÜäöüß0-9]+/, ''));
    }
  }
  // "Inhaber: ..." is common in German Impressum pages.
  const ownerRegex = /(?:Inhaber(?:in)?|Owner|Vertreten durch)\s*:?\s*([A-ZÄÖÜ][^\n,;]{2,80})/g;
  for (const match of plain.matchAll(ownerRegex)) {
    const value = normalizeWhitespace(match[1] ?? '');
    if (value) names.add(value);
  }
  return [...names].slice(0, 12);
}

/** Extract euro amounts such as "€7.50", "7,50 €", "EUR 5.50". */
export function extractEuroAmounts(text: string): string[] {
  const plain = stripHtml(text);
  const matches = plain.match(/(?:€|EUR)\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?(?:€|EUR)/gi);
  return [...new Set((matches ?? []).map(normalizeWhitespace))];
}

export function parseEuroAmount(value: string): number | null {
  const match = value.replace(/\s/g, '').match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!match) return null;
  const normalized = match[1]!.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function truncate(input: string, max = 160): string {
  const text = normalizeWhitespace(input);
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
