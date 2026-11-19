import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'span', 'table',
  'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'hr', 'code',
];

const ALLOWED_ATTR = ['href', 'target', 'rel', 'title'];

/**
 * Sanitize HTML from Shopify descriptions/policies before rendering.
 * NEVER use dangerouslySetInnerHTML with unsanitized input. External links
 * are forced to open in a new tab with safe `rel` attributes.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force rel/target on anchors so external links never leak opener context.
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}

/** Plain-text excerpt for a11y hints, search snippets, etc. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
