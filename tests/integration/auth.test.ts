import pino from 'pino';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT, type KeyLike } from 'jose';
import { buildTestContext, COFFEE_VARIANT, testConfig } from '../helpers/testContext';
import { CustomerOAuthClient } from '../../src/services/customerAuth/oauthClient';

const AUTH_ENV: Record<string, string> = {
  AUTH_CUSTOMER_ACCOUNTS_ENABLED: 'true',
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: 'test-client-id',
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET: '',
  SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL: 'https://auth.example/oauth/authorize',
  SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL: 'https://auth.example/oauth/token',
  SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL: 'https://auth.example/logout',
  SHOPIFY_CUSTOMER_ACCOUNT_JWKS_URI: 'https://auth.example/jwks.json',
  SHOPIFY_CUSTOMER_ACCOUNT_ISSUER: 'https://issuer.example',
  SHOPIFY_CUSTOMER_ACCOUNT_API_URL: 'https://api.example/customer/2026-10/graphql',
  SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI: 'https://api.example/api/v1/auth/callback',
  SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI: 'https://shop.example/logged-out',
  SHOPIFY_CUSTOMER_ACCOUNT_JS_ORIGIN: 'http://localhost:5173',
  SESSION_SECRET: 'test-session-secret-0123456789abcdef',
  COOKIE_SECURE: 'false',
};

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function cookiesFrom(response: request.Response): string {
  const raw = response.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const session = cookies.find((entry) => entry.startsWith('bena_sid='));
  if (!session) throw new Error('session cookie not set');
  return session.split(';')[0]!;
}

function cookieNamed(response: request.Response, name: string): string {
  const raw = response.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = cookies.find((entry) => entry.startsWith(`${name}=`));
  if (!match) throw new Error(`${name} cookie not set`);
  return match.split(';')[0]!;
}

async function mintIdToken(params: {
  privateKey: KeyLike;
  nonce: string;
  email?: string;
}): Promise<string> {
  return new SignJWT({ nonce: params.nonce, email: params.email ?? 'customer@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuer('https://issuer.example')
    .setAudience('test-client-id')
    .setSubject('gid://shopify/Customer/1')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(params.privateKey);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Layer 1 - customer accounts feature flag', () => {
  it('keeps guest checkout working and fails closed when disabled', async () => {
    const { app } = buildTestContext();
    const session = await request(app).get('/api/v1/auth/session');
    expect(session.status).toBe(200);
    expect(session.body.data).toEqual({ enabled: false, authenticated: false });

    const login = await request(app).get('/api/v1/auth/login');
    expect(login.status).toBe(503);
    expect(login.body.error.code).toBe('FEATURE_DISABLED');

    const account = await request(app).get('/api/v1/account/me');
    expect(account.status).toBe(503);
    expect(account.body.error.code).toBe('FEATURE_DISABLED');
  });

  it('builds a PKCE authorization redirect and rejects a tampered state', async () => {
    const { app } = buildTestContext(AUTH_ENV);
    const login = await request(app).get('/api/v1/auth/login?returnTo=/account&locale=de-DE');
    expect(login.status).toBe(302);
    const location = new URL(login.headers.location as string);
    expect(location.origin).toBe('https://auth.example');
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(location.searchParams.get('client_id')).toBe('test-client-id');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).toBeTruthy();
    expect(location.searchParams.get('state')).toBeTruthy();
    expect(location.searchParams.get('nonce')).toBeTruthy();
    expect(location.searchParams.get('scope')).toContain('customer-account-api:full');
    expect(location.searchParams.get('locale')).toBe('de-DE');
    const stateCookie = cookieNamed(login, 'bena_oauth_state');
    expect(login.headers['set-cookie']?.toString()).toMatch(/HttpOnly/i);
    expect(login.headers['set-cookie']?.toString()).toMatch(/Path=\/api\/v1\/auth\/callback/i);

    const callback = await request(app)
      .get(`/api/v1/auth/callback?code=abc&state=tampered-state`)
      .set('Cookie', stateCookie);
    expect(callback.status).toBe(400);
    expect(callback.body.error.code).toBe('VALIDATION_ERROR');  });

  it('completes login with nonce validation, sets a safe cookie, and exposes no tokens', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    Object.assign(jwk, { kid: 'test-key', alg: 'RS256', use: 'sig' });

    const { app } = buildTestContext(AUTH_ENV);
    const login = await request(app).get('/api/v1/auth/login?returnTo=/account');
    const authorizeUrl = new URL(login.headers.location as string);
    const state = authorizeUrl.searchParams.get('state')!;
    const nonce = authorizeUrl.searchParams.get('nonce')!;
    const stateCookie = cookieNamed(login, 'bena_oauth_state');
    const idToken = await mintIdToken({ privateKey, nonce });

    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://auth.example/jwks.json') {
        return jsonResponse({ keys: [jwk] });
      }
      if (url === 'https://auth.example/oauth/token') {
        const body = String(init?.body ?? '');
        if (body.includes('grant_type=refresh_token')) {
          return jsonResponse({
            access_token: 'refreshed-access-token',
            expires_in: 3600,
            refresh_token: 'rotated-refresh-token',
            id_token: idToken,
          });
        }
        return jsonResponse({
          access_token: 'access-token-123456',
          expires_in: 3600,
          refresh_token: 'refresh-token-123456',
          id_token: idToken,
        });
      }
      if (url === 'https://api.example/customer/2026-10/graphql') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { query?: string };
        const query = body.query ?? '';
        if (query.includes('CustomerProfile')) {
          return jsonResponse({
            data: {
              customer: {
                id: 'gid://shopify/Customer/1',
                displayName: 'Test Customer',
                firstName: 'Test',
                lastName: 'Customer',
                emailAddress: { emailAddress: 'customer@example.com' },
                phoneNumber: null,
                defaultAddress: {
                  id: 'gid://shopify/CustomerAddress/1',
                  name: 'Test Customer',
                  firstName: 'Test',
                  lastName: 'Customer',
                  company: null,
                  address1: 'Hauptstrasse 1',
                  address2: null,
                  city: 'Berlin',
                  province: 'Berlin',
                  country: 'Germany',
                  countryCode: 'DE',
                  zip: '10115',
                  phoneNumber: null,
                  formatted: ['Hauptstrasse 1', '10115 Berlin', 'Germany'],
                },
              },
            },
          });
        }
        if (query.includes('CustomerOrders')) {
          return jsonResponse({
            data: {
              customer: {
                orders: {
                  pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    startCursor: null,
                    endCursor: null,
                  },
                  edges: [
                    {
                      cursor: 'c1',
                      node: {
                        id: 'gid://shopify/Order/1',
                        name: '#1001',
                        number: 1001,
                        processedAt: '2026-10-20T10:00:00Z',
                        financialStatus: 'PAID',
                        fulfillmentStatus: 'FULFILLED',
                        totalPrice: { amount: '15.00', currencyCode: 'EUR' },
                        statusPageUrl: 'https://shopify.com/status/1',
                        lineItems: {
                          edges: [{ node: { title: 'Rwanda Coffee 250g', quantity: 1 } }],
                        },
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        if (query.includes('CustomerAddresses')) {
          return jsonResponse({
            data: {
              customer: {
                addresses: {
                  pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    startCursor: null,
                    endCursor: null,
                  },
                  edges: [
                    {
                      cursor: 'a1',
                      node: {
                        id: 'gid://shopify/CustomerAddress/1',
                        name: 'Test Customer',
                        firstName: 'Test',
                        lastName: 'Customer',
                        company: null,
                        address1: 'Hauptstrasse 1',
                        address2: null,
                        city: 'Berlin',
                        province: 'Berlin',
                        country: 'Germany',
                        countryCode: 'DE',
                        zip: '10115',
                        phoneNumber: null,
                        formatted: ['Hauptstrasse 1', '10115 Berlin', 'Germany'],
                      },
                    },
                  ],
                },
              },
            },
          });
        }
        return jsonResponse({ data: {} });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const callback = await request(app)
      .get(`/api/v1/auth/callback?code=auth-code&state=${encodeURIComponent(state)}`)
      .set('Cookie', stateCookie);
    expect(callback.status, JSON.stringify(callback.body)).toBe(302);
    expect(callback.headers.location).toBe('http://localhost:5173/account');
    const cookie = cookiesFrom(callback);

    const replay = await request(app)
      .get(`/api/v1/auth/callback?code=auth-code&state=${encodeURIComponent(state)}`)
      .set('Cookie', stateCookie);
    expect(replay.status).toBe(400);
    expect(replay.body.error.code).toBe('VALIDATION_ERROR');
    expect(callback.headers['set-cookie']?.toString()).toMatch(/HttpOnly/i);
    expect(callback.headers['set-cookie']?.toString()).toMatch(/SameSite=Lax/i);
    expect(callback.headers['set-cookie']?.toString()).not.toMatch(/Secure/i);

    const session = await request(app).get('/api/v1/auth/session').set('Cookie', cookie);
    expect(session.status).toBe(200);
    expect(session.headers['cache-control']).toMatch(/no-store/i);
    expect(session.body.data.authenticated).toBe(true);
    expect(session.body.data.customer.email).toBe('customer@example.com');
    expect(session.body.data.csrfToken).toBeTruthy();
    expect(JSON.stringify(session.body)).not.toContain('access-token');
    const csrfToken = session.body.data.csrfToken as string;

    const me = await request(app).get('/api/v1/account/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.displayName).toBe('Test Customer');
    expect(me.body.data.defaultAddress.city).toBe('Berlin');
    expect(JSON.stringify(me.body)).not.toMatch(/access_token|refresh_token|id_token/);

    const orders = await request(app).get('/api/v1/account/orders?first=5').set('Cookie', cookie);
    expect(orders.status).toBe(200);
    expect(orders.body.data[0].name).toBe('#1001');
    expect(orders.body.meta.pagination.hasNextPage).toBe(false);

    const addresses = await request(app)
      .get('/api/v1/account/addresses')
      .set('Cookie', cookie);
    expect(addresses.status).toBe(200);
    expect(addresses.body.data[0].countryCode).toBe('DE');

    const cart = await request(app)
      .post('/api/v1/cart')
      .send({ lines: [{ merchandiseId: COFFEE_VARIANT, quantity: 1 }] });
    const associated = await request(app)
      .post('/api/v1/account/cart/associate')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send({ cartId: cart.body.data.id });
    expect(associated.status).toBe(200);

    const noCsrf = await request(app)
      .post('/api/v1/account/cart/associate')
      .set('Cookie', cookie)
      .send({ cartId: cart.body.data.id });
    expect(noCsrf.status).toBe(403);
    expect(noCsrf.body.error.message).toMatch(/CSRF/);

    const logoutNoCsrf = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(logoutNoCsrf.status).toBe(403);

    const badOrigin = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .set('Origin', 'https://evil.example');
    expect(badOrigin.status).toBe(403);

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .set('Origin', 'http://localhost:5173');
    expect(logout.status).toBe(303);
    expect(logout.headers.location).toContain('https://auth.example/logout');
    expect(logout.headers.location).toContain('id_token_hint=');

    const afterLogout = await request(app).get('/api/v1/auth/session').set('Cookie', cookie);
    expect(afterLogout.body.data.authenticated).toBe(false);
  });

  it('rotates refresh tokens server-side', async () => {
    const config = testConfig(AUTH_ENV);
    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url === 'https://auth.example/oauth/token') {
        return jsonResponse({
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'new-refresh-token',
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    const client = new CustomerOAuthClient(config.auth, pino({ level: 'silent' }), fetchMock);
    const refreshed = await client.refresh('old-refresh-token');
    expect(refreshed.accessToken).toBe('new-access-token');
    expect(refreshed.refreshToken).toBe('new-refresh-token');
    expect(refreshed.idToken).toBeNull();
  });

  it('rejects a valid ID token whose nonce does not match the pending login', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwk = await exportJWK(publicKey);
    Object.assign(jwk, { kid: 'test-key', alg: 'RS256', use: 'sig' });
    const config = testConfig(AUTH_ENV);

    const idToken = await new SignJWT({ nonce: 'wrong-nonce', email: 'customer@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://issuer.example')
      .setAudience('test-client-id')
      .setSubject('gid://shopify/Customer/1')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(privateKey);

    const fetchMock = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url === 'https://auth.example/jwks.json') return jsonResponse({ keys: [jwk] });
      throw new Error(`Unexpected fetch: ${url}`);
    });
    const client = new CustomerOAuthClient(config.auth, pino({ level: 'silent' }), fetchMock);
    await expect(client.verifyIdToken(idToken, 'expected-nonce')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});



