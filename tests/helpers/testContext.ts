import { createHash } from 'node:crypto';
import pino from 'pino';
import type { Express } from 'express';
import { loadConfig, type AppConfig } from '../../src/config/env';
import { FixtureCommerceClient } from '../../src/integrations/shopify/fixtureClient';
import { createContainer } from '../../src/container';
import { createApp } from '../../src/app';
import { MemoryDedupStore } from '../../src/webhooks/dedup';
import type { RealtimeEvent, RealtimePublisher } from '../../src/sockets/publisher';

export const TEST_WEBHOOK_SECRET = 'test-webhook-secret';
export const TEST_ADMIN_KEY = 'test-admin-key';
export const TEST_ADMIN_KEY_HASH = createHash('sha256').update(TEST_ADMIN_KEY).digest('hex');
export const TEST_ADMIN_JWT_SECRET = 'test-admin-jwt-secret-0123456789abcdef';
export const TEST_ADMIN_TOKEN = TEST_ADMIN_KEY; // legacy alias used by older tests

export function testConfig(overrides: Record<string, string | undefined> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: 'test',
    PORT: '0',
    LOG_LEVEL: 'silent',
    LOG_PRETTY: 'false',
    SHOPIFY_MOCK_MODE: 'true',
    SHOPIFY_API_VERSION: '2026-10',
    CORS_ALLOWED_ORIGINS: 'http://localhost:5173,http://localhost:3000',
    SOCKET_ADMIN_JWT_SECRET: 'test-socket-secret-0123456789abcdef',
    ADMIN_API_KEY_SHA256: TEST_ADMIN_KEY_HASH,
    ADMIN_JWT_SECRET: TEST_ADMIN_JWT_SECRET,
    AUTH_CUSTOMER_ACCOUNTS_ENABLED: 'false',
    SHOPIFY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    REVIEWS_PROVIDER: 'none',
    RESTOCK_PROVIDER: 'mock',
    NEWSLETTER_PROVIDER: 'mock',
    ADMIN_API_TOKEN: '',
    ...overrides,
  });
}

export interface TestContext {
  app: Express;
  config: AppConfig;
  container: ReturnType<typeof createContainer>;
  publisher: RealtimePublisher & { publish: (event: RealtimeEvent) => void };
  events: RealtimeEvent[];
}

export function buildTestContext(
  overrides: Record<string, string | undefined> = {},
  options: { withAdminToken?: boolean } = {},
): TestContext {
  const config = testConfig(
    options.withAdminToken ? { ADMIN_API_TOKEN: TEST_ADMIN_TOKEN, ...overrides } : overrides,
  );
  const logger = pino({ level: process.env.TEST_LOG_LEVEL ?? 'silent' });
  const events: RealtimeEvent[] = [];
  const publisher: RealtimePublisher = {
    publish: (event: RealtimeEvent) => {
      events.push(event);
    },
  };
  const client = new FixtureCommerceClient();
  const container = createContainer(config, logger, client, 'fixture', publisher);
  const app = createApp(container, { dedupStore: new MemoryDedupStore() });
  return {
    app,
    config,
    container,
    publisher: publisher as TestContext['publisher'],
    events,
  };
}

export const COFFEE_VARIANT = 'gid://shopify/ProductVariant/rwanda-coffee-250g-default';
export const COFFEE_PRODUCT = 'gid://shopify/Product/rwanda-coffee-250g';
