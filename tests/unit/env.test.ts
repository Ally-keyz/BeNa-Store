import { describe, expect, it } from 'vitest';
import { loadConfig, safeConfigSummary } from '../../src/config/env';

describe('environment configuration', () => {
  it('defaults to the 2026-10 Storefront API and fixture mode without credentials', () => {
    const config = loadConfig({ NODE_ENV: 'test', SHOPIFY_MOCK_MODE: 'auto' });
    expect(config.shopify.apiVersion).toBe('2026-10');
    expect(config.shopify.useFixtures).toBe(true);
    expect(config.shopify.hasToken).toBe(false);
    expect(config.apiPrefix).toBe('/api/v1');
  });

  it('rejects malformed API versions', () => {
    expect(() => loadConfig({ NODE_ENV: 'test', SHOPIFY_API_VERSION: 'latest' })).toThrow(
      /SHOPIFY_API_VERSION/,
    );
  });

  it('rejects wildcard CORS', () => {
    expect(() =>
      loadConfig({ NODE_ENV: 'test', SHOPIFY_MOCK_MODE: 'true', CORS_ALLOWED_ORIGINS: '*' }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it('requires explicit CORS and an admin token in production', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        SHOPIFY_MOCK_MODE: 'true',
        CORS_ALLOWED_ORIGINS: '',
      }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);

    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        SHOPIFY_MOCK_MODE: 'true',
        CORS_ALLOWED_ORIGINS: 'https://benaorigins.de',
        ADMIN_API_TOKEN: '',
      }),
    ).toThrow(/Admin authentication/);
  });

  it('never exposes secrets in the safe config summary', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      SHOPIFY_MOCK_MODE: 'true',
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: 'super-secret-private-token',
      SHOPIFY_WEBHOOK_SECRET: 'super-secret-webhook',
      SOCKET_ADMIN_JWT_SECRET: 'super-secret-jwt',
      ADMIN_API_TOKEN: 'super-secret-admin',
    });
    const summary = JSON.stringify(safeConfigSummary(config));
    expect(summary).not.toContain('super-secret');
    expect(summary).toContain('usingPrivateToken');
  });

  it('warns about missing webhook/socket configuration without blocking startup', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      SHOPIFY_MOCK_MODE: 'true',
      SHOPIFY_WEBHOOK_SECRET: '',
      SOCKET_ADMIN_JWT_SECRET: '',
    });
    expect(config.warnings.join(' ')).toMatch(/SHOPIFY_WEBHOOK_SECRET/);
    expect(config.warnings.join(' ')).toMatch(/SOCKET_ADMIN_JWT_SECRET|ADMIN_JWT_SECRET/);
    expect(config.isProduction).toBe(false);
  });

  it('fails fast when customer accounts are enabled without required configuration', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'test',
        SHOPIFY_MOCK_MODE: 'true',
        AUTH_CUSTOMER_ACCOUNTS_ENABLED: 'true',
        SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: '',
        SESSION_SECRET: '',
      }),
    ).toThrow(/SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID/);
  });

  it('keeps guest checkout available when customer accounts are disabled', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      SHOPIFY_MOCK_MODE: 'true',
      AUTH_CUSTOMER_ACCOUNTS_ENABLED: 'false',
    });
    expect(config.auth.enabled).toBe(false);
    expect(config.warnings.join(' ')).toMatch(/Guest checkout/);
  });
});
