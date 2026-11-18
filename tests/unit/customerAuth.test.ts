import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env';
import { validateReturnTo, createCodeVerifier, createCodeChallenge } from '../../src/services/customerAuth/pkce';
import {
  signCookieValue,
  verifyCookieValue,
  sessionCookieOptions,
} from '../../src/services/customerAuth/sessionStore';
import { TEST_ADMIN_KEY, TEST_ADMIN_KEY_HASH } from '../helpers/testContext';

describe('customer auth primitives', () => {
  it('generates a valid S256 PKCE challenge', () => {
    const verifier = createCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    const challenge = createCodeChallenge(verifier);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // RFC 7636 test vector
    expect(createCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('rejects open redirects and accepts only same-origin relative paths', () => {
    expect(validateReturnTo('/account/orders?x=1')).toBe('/account/orders?x=1');
    expect(validateReturnTo('//evil.example')).toBe('/');
    expect(validateReturnTo('https://evil.example')).toBe('/');
    expect(validateReturnTo('/\\evil.example')).toBe('/');
    expect(validateReturnTo('javascript:alert(1)')).toBe('/');
    expect(validateReturnTo('/ok\u0000')).toBe('/');
  });

  it('signs session cookies and rejects tampering', () => {
    const secret = 'test-session-secret-0123456789abcdef';
    const signed = signCookieValue('session-id', secret);
    expect(verifyCookieValue(signed, secret)).toBe('session-id');
    expect(verifyCookieValue(`${signed}x`, secret)).toBeNull();
    expect(verifyCookieValue('session-id', secret)).toBeNull();
    expect(verifyCookieValue(signed, 'other-secret-0123456789abcdef')).toBeNull();
  });

  it('uses secure __Host- cookies in production without a cookie domain', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      SHOPIFY_MOCK_MODE: 'true',
      CORS_ALLOWED_ORIGINS: 'https://benaorigins.de',
      ADMIN_API_KEY_SHA256: TEST_ADMIN_KEY_HASH,
      AUTH_CUSTOMER_ACCOUNTS_ENABLED: 'true',
      SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: 'client',
      SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI: 'https://api.benaorigins.de/api/v1/auth/callback',
      SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL: 'https://benaorigins.de/authentication/oauth/authorize',
      SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL: 'https://benaorigins.de/authentication/oauth/token',
      SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL: 'https://benaorigins.de/authentication/logout',
      SHOPIFY_CUSTOMER_ACCOUNT_JWKS_URI: 'https://benaorigins.de/authentication/jwks.json',
      SHOPIFY_CUSTOMER_ACCOUNT_API_URL: 'https://benaorigins.de/customer/api/2026-10/graphql',
      SESSION_SECRET: 'prod-session-secret-0123456789abcdef',
    });
    expect(config.auth.cookieName).toBe('__Host-bena_sid');
    const options = sessionCookieOptions(config.auth);
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.path).toBe('/');
  });

  it('hashes the admin API key for comparison', () => {
    expect(createHash('sha256').update(TEST_ADMIN_KEY).digest('hex')).toBe(TEST_ADMIN_KEY_HASH);
  });

  it('rejects admin key JWTs without an admin role', () => {
    const token = jwt.sign({ sub: 'viewer', roles: ['viewer'] }, 'secret', { algorithm: 'HS256' });
    const decoded = jwt.verify(token, 'secret') as { roles: string[] };
    expect(decoded.roles).not.toContain('admin');
  });
});
