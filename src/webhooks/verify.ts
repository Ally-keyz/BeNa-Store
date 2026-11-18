import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify X-Shopify-Hmac-Sha256 against the RAW request body.
 *
 * Shopify sends the digest base64-encoded; hex is accepted as a fallback for
 * tooling. Comparison is timing-safe.
 */
export function verifyShopifyHmac(
  rawBody: Buffer | string | undefined,
  hmacHeader: string | undefined,
  secret: string,
): boolean {
  if (!rawBody || !hmacHeader || !secret) return false;
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  const expected = createHmac('sha256', secret).update(body).digest();

  let provided: Buffer;
  if (/^[a-f0-9]{64}$/i.test(hmacHeader)) {
    provided = Buffer.from(hmacHeader, 'hex');
  } else if (/^[A-Za-z0-9+/]{43}=?$/.test(hmacHeader)) {
    provided = Buffer.from(hmacHeader, 'base64');
  } else {
    return false;
  }

  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** Shopify-compatible signature (base64) for tests and local tooling. */
export function signShopifyHmac(rawBody: Buffer | string, secret: string): string {
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  return createHmac('sha256', secret).update(body).digest('base64');
}
