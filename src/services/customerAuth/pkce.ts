import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function base64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function randomToken(bytes = 32): string {
  return base64Url(randomBytes(bytes));
}

export function createState(): string {
  return randomToken(32);
}

export function createNonce(): string {
  return randomToken(32);
}

/** RFC 7636 verifier: 43–128 characters from the unreserved set. */
export function createCodeVerifier(): string {
  return randomToken(32);
}

export function createCodeChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier, 'ascii').digest());
}

export function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Only allow same-origin relative return paths. Rejects absolute URLs,
 * protocol-relative URLs, backslashes and control characters.
 */
export function validateReturnTo(raw: string | undefined | null): string {
  if (!raw) return '/';
  const value = raw.trim();
  if (value.length === 0 || value.length > 512) return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  if (value.includes('\\')) return '/';
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 32 || code === 127) return '/';
  }
  try {
    const parsed = new URL(value, 'https://return-to.invalid');
    if (parsed.origin !== 'https://return-to.invalid') return '/';
    if (!parsed.pathname.startsWith('/')) return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export function isSafeRelativePath(value: string | undefined | null): boolean {
  return validateReturnTo(value) === (value ?? '/').trim();
}
