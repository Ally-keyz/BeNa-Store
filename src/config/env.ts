import path from 'node:path';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load `.env` once. Real environment variables always win.
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const emptyToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

const booleanish = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(65535).default(4000)),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRETTY: booleanish.default(false),
  TRUST_PROXY: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(10).optional()),

  CORS_ALLOWED_ORIGINS: optionalString,
  API_PUBLIC_URL: optionalString,
  FRONTEND_URL: optionalString,
  SITE_URL: optionalString,
  SITE_NAME: z.string().trim().min(1).default('BeNa Origins'),

  SHOPIFY_STORE_DOMAIN: optionalString,
  // Latest stable verified against https://shopify.dev/docs/api/storefront on 2026-11-19.
  SHOPIFY_API_VERSION: z
    .string()
    .regex(/^(unstable|\d{4}-\d{2})$/, 'SHOPIFY_API_VERSION must look like 2026-10')
    .default('2026-10'),
  SHOPIFY_STOREFRONT_PUBLIC_TOKEN: optionalString,
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN: optionalString,
  SHOPIFY_MOCK_MODE: z.enum(['auto', 'true', 'false']).default('auto'),

  SHOPIFY_WEBHOOK_SECRET: optionalString,
  PUBLIC_WEBHOOK_BASE_URL: optionalString,
  SHOPIFY_WEBHOOK_TOPICS: optionalString,
  SHOPIFY_WEBHOOKS_APPLY: booleanish.default(false),
  SHOPIFY_ADMIN_API_ACCESS_TOKEN: optionalString,
  SHOPIFY_ADMIN_API_VERSION: z
    .string()
    .regex(/^(unstable|\d{4}-\d{2})$/)
    .default('2026-10'),

  ADMIN_API_TOKEN: optionalString,
  ADMIN_API_KEY: optionalString,
  ADMIN_API_KEY_SHA256: optionalString,
  ADMIN_JWT_SECRET: optionalString,
  ADMIN_JWT_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(60).max(86_400).default(3600),
  ),

  AUTH_CUSTOMER_ACCOUNTS_ENABLED: z.preprocess(emptyToUndefined, booleanish.default(false)),
  AUTH_SESSION_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(60).max(2_592_000).default(86_400),
  ),
  AUTH_STATE_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(60).max(3600).default(600),
  ),
  AUTH_RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1000).default(10),
  ),
  SESSION_SECRET: optionalString,
  COOKIE_DOMAIN: optionalString,
  COOKIE_SECURE: z.preprocess(emptyToUndefined, booleanish.optional()),
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_SCOPE: z
    .string()
    .trim()
    .min(1)
    .default('openid email customer-account-api:full'),
  SHOPIFY_CUSTOMER_ACCOUNT_DISCOVERY_URL: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_API_DISCOVERY_URL: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_JWKS_URI: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_ISSUER: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_API_URL: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI: optionalString,
  CUSTOMER_ACCOUNT_REDIRECT_URI: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI: optionalString,
  CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI: optionalString,
  SHOPIFY_CUSTOMER_ACCOUNT_JS_ORIGIN: optionalString,
  CUSTOMER_ACCOUNT_JS_ORIGIN: optionalString,
  AUDIT_PRODUCT_SCAN_LIMIT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1000).default(250),
  ),
  AUDIT_CACHE_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).max(86400).default(300),
  ),
  AUDIT_MIN_IMAGES: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(20).default(3),
  ),
  AUDIT_FOOD_KEYWORDS: optionalString,

  SHOPIFY_METAFIELD_NAMESPACES: optionalString,
  METAFIELD_NUTRITION_KEY: z.string().trim().min(1).default('nutrition'),
  METAFIELD_INGREDIENTS_KEY: z.string().trim().min(1).default('ingredients'),
  METAFIELD_ALLERGENS_KEY: z.string().trim().min(1).default('allergens'),
  METAFIELD_ORIGIN_KEY: z.string().trim().min(1).default('origin'),
  METAFIELD_PREPARATION_KEY: z.string().trim().min(1).default('preparation'),

  SHIPPING_WORLDWIDE_CLAIM: booleanish.default(true),
  SHIPPING_ADVERTISED_COUNTRIES: optionalString,

  SOCKET_ADMIN_JWT_SECRET: optionalString,
  SOCKET_ADMIN_TOKEN_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(60).max(86_400).default(3600),
  ),
  SOCKET_CORS_ORIGINS: optionalString,

  RATE_LIMIT_WINDOW_MS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1000).max(3_600_000).default(60_000),
  ),
  RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100_000).default(120),
  ),
  CART_RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(10_000).default(40),
  ),
  NEWSLETTER_RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1000).default(5),
  ),
  WEBHOOK_RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(100_000).default(300),
  ),

  REDIS_URL: optionalString,
  SENTRY_DSN: optionalString,

  NEWSLETTER_PROVIDER: z.enum(['mock', 'webhook', 'klaviyo', 'mailchimp']).default('mock'),
  NEWSLETTER_WEBHOOK_URL: optionalString,
  NEWSLETTER_WEBHOOK_SECRET: optionalString,
  KLAVIYO_API_KEY: optionalString,
  KLAVIYO_LIST_ID: optionalString,
  KLAVIYO_API_REVISION: z.string().trim().min(1).default('2025-01-15'),
  MAILCHIMP_API_KEY: optionalString,
  MAILCHIMP_LIST_ID: optionalString,
  MAILCHIMP_SERVER_PREFIX: optionalString,

  REVIEWS_PROVIDER: z
    .enum([
      'auto',
      'judge_me',
      'loox',
      'stamped',
      'yotpo',
      'okendo',
      'shopify_product_reviews',
      'none',
    ])
    .default('auto'),
  REVIEWS_API_TOKEN: optionalString,

  // AI product-fact suggestions. One pretrained hosted model, no training and
  // no local runtime. Default provider is Groq's free tier; one API key is the
  // only deployment requirement. Results are cached and never written back.
  AI_ENABLED: booleanish.default(true),
  AI_API_KEY: optionalString,
  AI_BASE_URL: z.string().trim().min(1).default('https://api.groq.com/openai/v1'),
  AI_MODEL: z.string().trim().min(1).default('openai/gpt-oss-20b'),
  AI_TEMPERATURE: z.preprocess(
    emptyToUndefined,
    z.coerce.number().min(0).max(1).default(0.2),
  ),
  AI_CACHE_TTL_SECONDS: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(0).max(86400).default(3600),
  ),
  AI_RATE_LIMIT_MAX: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(1000).default(60),
  ),
});

export type RawEnv = z.infer<typeof EnvSchema>;

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  isTest: boolean;
  port: number;
  apiPrefix: '/api/v1';
  logLevel: RawEnv['LOG_LEVEL'];
  logPretty: boolean;
  trustProxy: number;
  corsOrigins: string[];
  socketCorsOrigins: string[];
  apiPublicUrl: string | null;
  frontendUrl: string;
  siteUrl: string;
  siteName: string;
  shopify: {
    storeDomain: string | null;
    apiVersion: string;
    publicToken: string | null;
    privateToken: string | null;
    hasToken: boolean;
    useFixtures: boolean;
    mockMode: RawEnv['SHOPIFY_MOCK_MODE'];
  };
  webhooks: {
    secret: string | null;
    publicBaseUrl: string | null;
    topics: string[];
    adminAccessToken: string | null;
    adminApiVersion: string;
    apply: boolean;
  };
  adminApiToken?: string | null;
  admin: {
    /** SHA-256 hex of the accepted X-Admin-Key (plaintext is never kept). */
    keyHash: string | null;
    jwtSecret: string | null;
    jwtTtlSeconds: number;
    configured: boolean;
  };
  auth: {
    enabled: boolean;
    clientId: string | null;
    clientSecret: string | null;
    scope: string;
    discoveryUrl: string | null;
    apiDiscoveryUrl: string | null;
    authUrl: string | null;
    tokenUrl: string | null;
    logoutUrl: string | null;
    jwksUri: string | null;
    issuer: string | null;
    apiUrl: string | null;
    redirectUri: string | null;
    logoutRedirectUri: string | null;
    jsOrigin: string;
    sessionSecret: string | null;
    sessionTtlSeconds: number;
    stateTtlSeconds: number;
    cookieName: string;
    cookieSecure: boolean;
    cookieDomain: string | null;
    rateLimitMax: number;
    configured: boolean;
  };
  audit: {
    scanLimit: number;
    cacheTtlSeconds: number;
    minImages: number;
    foodKeywords: string[];
  };
  metafields: {
    namespaces: string[];
    keys: {
      nutrition: string;
      ingredients: string;
      allergens: string;
      origin: string;
      preparation: string;
    };
  };
  shipping: { worldwideClaim: boolean; advertisedCountries: string[] };
  socket: { adminJwtSecret: string | null; adminTokenTtlSeconds: number };
  rateLimits: {
    windowMs: number;
    globalMax: number;
    cartMax: number;
    newsletterMax: number;
    webhookMax: number;
    authMax: number;
    aiMax: number;
  };
  redisUrl: string | null;
  sentryDsn: string | null;
  newsletter: {
    provider: RawEnv['NEWSLETTER_PROVIDER'];
    webhookUrl: string | null;
    webhookSecret: string | null;
    klaviyoApiKey: string | null;
    klaviyoListId: string | null;
    klaviyoRevision: string;
    mailchimpApiKey: string | null;
    mailchimpListId: string | null;
    mailchimpServerPrefix: string | null;
  };
  reviews: { provider: RawEnv['REVIEWS_PROVIDER']; apiToken: string | null };
  ai: {
    enabled: boolean;
    apiKey: string | null;
    baseUrl: string;
    model: string;
    temperature: number;
    cacheTtlSeconds: number;
  };
  warnings: string[];
}

const DEFAULT_DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, '');
}

function normalizeStoreDomain(raw: string | undefined): string | null {
  if (!raw) return null;
  const withoutProtocol = raw.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(withoutProtocol)) {
    throw new Error(`SHOPIFY_STORE_DOMAIN is not a valid hostname: "${raw}"`);
  }
  return withoutProtocol.toLowerCase();
}

function normalizeUrl(raw: string | undefined, fallback: string): string {
  const value = raw?.trim() || fallback;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) throw new Error('protocol');
    return url.toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`Invalid URL: "${value}"`);
  }
}

function normalizeUrlWithPath(raw: string, label: string): string {
  try {
    const url = new URL(raw.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error('protocol');
    return url.toString();
  } catch {
    throw new Error(`${label} is not a valid URL: "${raw}"`);
  }
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function resolveAdminCredentials(
  env: RawEnv,
): { keyHash: string | null; jwtSecret: string | null } {
  const explicitHash = env.ADMIN_API_KEY_SHA256?.toLowerCase() ?? null;
  if (explicitHash && !/^[a-f0-9]{64}$/.test(explicitHash)) {
    throw new Error('ADMIN_API_KEY_SHA256 must be a 64-character SHA-256 hex digest');
  }
  const plainKey = env.ADMIN_API_KEY ?? env.ADMIN_API_TOKEN ?? null;
  const keyHash = explicitHash ?? (plainKey ? sha256Hex(plainKey) : null);
  const jwtSecret = env.ADMIN_JWT_SECRET ?? env.SOCKET_ADMIN_JWT_SECRET ?? null;
  return { keyHash, jwtSecret };
}

/**
 * Validate and normalize environment configuration.
 * Throws with a readable list of problems (fail fast, no partial config).
 */
export function loadConfig(overrides: NodeJS.ProcessEnv = {}): AppConfig {
  const parsed = EnvSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  const env = parsed.data;
  const warnings: string[] = [];
  const isProduction = env.NODE_ENV === 'production';

  const storeDomain = normalizeStoreDomain(env.SHOPIFY_STORE_DOMAIN ?? undefined);
  const hasToken = Boolean(env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN);

  const useFixtures =
    env.SHOPIFY_MOCK_MODE === 'true' ||
    (env.SHOPIFY_MOCK_MODE === 'auto' && !(storeDomain && hasToken));

  if (!useFixtures && !storeDomain) {
    throw new Error(
      'SHOPIFY_STORE_DOMAIN is required when not running in fixture mode (set SHOPIFY_MOCK_MODE=auto/true or provide credentials).',
    );
  }

  const configuredOrigins = parseCsv(env.CORS_ALLOWED_ORIGINS).map(normalizeOrigin);
  if (configuredOrigins.includes('*')) {
    throw new Error('CORS_ALLOWED_ORIGINS must not contain "*". Use an explicit allow-list.');
  }
  if (isProduction && configuredOrigins.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS is required in production.');
  }
  const corsOrigins =
    configuredOrigins.length > 0 ? configuredOrigins : isProduction ? [] : DEFAULT_DEV_ORIGINS;

  const socketCorsOrigins = parseCsv(env.SOCKET_CORS_ORIGINS).map(normalizeOrigin);
  if (socketCorsOrigins.includes('*')) {
    throw new Error('SOCKET_CORS_ORIGINS must not contain "*".');
  }

  const frontendUrl = normalizeUrl(env.FRONTEND_URL, 'http://localhost:5173');
  const siteUrl = normalizeUrl(env.SITE_URL, 'https://benaorigins.de');

  if (!useFixtures && !hasToken) {
    warnings.push(
      'No SHOPIFY_STOREFRONT_PRIVATE_TOKEN/PUBLIC_TOKEN: tokenless Storefront access works for products/collections/cart, but metafields, tags and inventory quantities are unavailable. Product completeness checks will be partial.',
    );
  }
  if (!env.SHOPIFY_WEBHOOK_SECRET) {
    warnings.push('SHOPIFY_WEBHOOK_SECRET is missing: /webhooks/shopify will reject all deliveries (503).');
  }

  const adminCredentials = resolveAdminCredentials(env);
  const adminConfigured = Boolean(adminCredentials.keyHash || adminCredentials.jwtSecret);
  if (!env.ADMIN_API_KEY_SHA256 && (env.ADMIN_API_KEY || env.ADMIN_API_TOKEN)) {
    warnings.push(
      'Admin key is provided in plaintext. Prefer ADMIN_API_KEY_SHA256 so only the hash is stored in the environment.',
    );
  }
  if (!adminConfigured) {
    if (isProduction) {
      throw new Error(
        'Admin authentication is required in production: set ADMIN_API_KEY_SHA256 (or ADMIN_API_KEY) and/or ADMIN_JWT_SECRET.',
      );
    }
    warnings.push(
      'No admin credentials configured (ADMIN_API_KEY_SHA256/ADMIN_API_KEY/ADMIN_JWT_SECRET): admin endpoints return 503 NOT_CONFIGURED.',
    );
  }

  const adminJwtSecret = adminCredentials.jwtSecret;
  if (!adminJwtSecret) {
    warnings.push('ADMIN_JWT_SECRET is missing: the admin Socket.IO namespace is disabled.');
  }

  // ---------------------------------------------------------- Layer 1 auth ---
  const authEnabled = env.AUTH_CUSTOMER_ACCOUNTS_ENABLED;
  const customerClientId = env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID ?? null;
  const customerClientSecret = env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET ?? null;
  const sessionSecret = env.SESSION_SECRET ?? null;
  const redirectUriSource =
    env.SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI ?? env.CUSTOMER_ACCOUNT_REDIRECT_URI;
  const redirectUri = redirectUriSource
    ? normalizeUrlWithPath(redirectUriSource, 'SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI')
    : null;
  const logoutRedirectUriSource =
    env.SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI ?? env.CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI;
  const logoutRedirectUri = logoutRedirectUriSource
    ? normalizeUrlWithPath(
        logoutRedirectUriSource,
        'SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI',
      )
    : null;
  const discoveryUrl = env.SHOPIFY_CUSTOMER_ACCOUNT_DISCOVERY_URL
    ? normalizeUrlWithPath(
        env.SHOPIFY_CUSTOMER_ACCOUNT_DISCOVERY_URL,
        'SHOPIFY_CUSTOMER_ACCOUNT_DISCOVERY_URL',
      )
    : `https://${new URL(siteUrl).host}/.well-known/openid-configuration`;
  const apiDiscoveryUrl = env.SHOPIFY_CUSTOMER_ACCOUNT_API_DISCOVERY_URL
    ? normalizeUrlWithPath(
        env.SHOPIFY_CUSTOMER_ACCOUNT_API_DISCOVERY_URL,
        'SHOPIFY_CUSTOMER_ACCOUNT_API_DISCOVERY_URL',
      )
    : `https://${new URL(siteUrl).host}/.well-known/customer-account-api`;
  const authUrl = env.SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL
    ? normalizeUrlWithPath(env.SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL, 'SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL')
    : null;
  const tokenUrl = env.SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL
    ? normalizeUrlWithPath(env.SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL, 'SHOPIFY_CUSTOMER_ACCOUNT_TOKEN_URL')
    : null;
  const logoutUrl = env.SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL
    ? normalizeUrlWithPath(env.SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL, 'SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_URL')
    : null;
  const jwksUri = env.SHOPIFY_CUSTOMER_ACCOUNT_JWKS_URI
    ? normalizeUrlWithPath(env.SHOPIFY_CUSTOMER_ACCOUNT_JWKS_URI, 'SHOPIFY_CUSTOMER_ACCOUNT_JWKS_URI')
    : null;
  const apiUrl = env.SHOPIFY_CUSTOMER_ACCOUNT_API_URL
    ? normalizeUrlWithPath(env.SHOPIFY_CUSTOMER_ACCOUNT_API_URL, 'SHOPIFY_CUSTOMER_ACCOUNT_API_URL')
    : null;
  const jsOrigin = normalizeOrigin(
    env.SHOPIFY_CUSTOMER_ACCOUNT_JS_ORIGIN ?? env.CUSTOMER_ACCOUNT_JS_ORIGIN ?? frontendUrl,
  );

  const cookieDomain = env.COOKIE_DOMAIN ?? null;
  const cookieSecure = env.COOKIE_SECURE ?? isProduction;
  const cookieName = isProduction && !cookieDomain ? '__Host-bena_sid' : 'bena_sid';

  if (authEnabled) {
    const missing: string[] = [];
    if (!customerClientId) missing.push('SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID');
    if (!redirectUri) missing.push('SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI');
    if (!sessionSecret || sessionSecret.length < 32) missing.push('SESSION_SECRET (min 32 chars)');
    if (!apiUrl && !apiDiscoveryUrl) missing.push('SHOPIFY_CUSTOMER_ACCOUNT_API_URL or API discovery');
    if ((!authUrl || !tokenUrl || !logoutUrl || !jwksUri) && !discoveryUrl) {
      missing.push(
        'SHOPIFY_CUSTOMER_ACCOUNT_AUTH_URL/TOKEN_URL/LOGOUT_URL/JWKS_URI or DISCOVERY_URL',
      );
    }
    if (missing.length > 0) {
      throw new Error(
        `AUTH_CUSTOMER_ACCOUNTS_ENABLED=true but configuration is incomplete: ${missing.join(', ')}`,
      );
    }
    if (isProduction) {
      if (!redirectUri?.startsWith('https://')) {
        throw new Error('SHOPIFY_CUSTOMER_ACCOUNT_REDIRECT_URI must be HTTPS in production');
      }
      if (logoutRedirectUri && !logoutRedirectUri.startsWith('https://')) {
        throw new Error('SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI must be HTTPS in production');
      }
      if (!cookieSecure) {
        throw new Error('COOKIE_SECURE must be true in production when customer accounts are enabled');
      }
    }
    if (!corsOrigins.includes(jsOrigin)) {
      warnings.push(
        `CUSTOMER_ACCOUNT_JS_ORIGIN (${jsOrigin}) is not in CORS_ALLOWED_ORIGINS; browser auth requests may be blocked.`,
      );
    }
    if (!logoutRedirectUri) {
      warnings.push(
        'SHOPIFY_CUSTOMER_ACCOUNT_LOGOUT_REDIRECT_URI is not set: logout will return to FRONTEND_URL.',
      );
    }
    warnings.push(
      'AUTH_CUSTOMER_ACCOUNTS_ENABLED=true: Layer 1 is UNVERIFIED until Shopify Customer Account API credentials are supplied and a live login is tested.',
    );
  } else {
    warnings.push(
      'Customer accounts are disabled (AUTH_CUSTOMER_ACCOUNTS_ENABLED=false). Guest checkout remains fully functional.',
    );
  }

  if (env.AI_ENABLED && !env.AI_API_KEY) {
    warnings.push(
      'AI suggestions are disabled: set AI_API_KEY (a free Groq key) to enable them. No training or local model is required.',
    );
  }

  if (env.NEWSLETTER_PROVIDER !== 'mock') {
    const credentialsPresent = {
      webhook: Boolean(env.NEWSLETTER_WEBHOOK_URL),
      klaviyo: Boolean(env.KLAVIYO_API_KEY && env.KLAVIYO_LIST_ID),
      mailchimp: Boolean(
        env.MAILCHIMP_API_KEY && env.MAILCHIMP_LIST_ID && env.MAILCHIMP_SERVER_PREFIX,
      ),
    }[env.NEWSLETTER_PROVIDER];
    if (!credentialsPresent) {
      warnings.push(
        `NEWSLETTER_PROVIDER=${env.NEWSLETTER_PROVIDER} but its credentials are incomplete; requests will fail with NOT_CONFIGURED.`,
      );
    }
  }

  return {
    nodeEnv: env.NODE_ENV,
    isProduction,
    isTest: env.NODE_ENV === 'test',
    port: env.PORT,
    apiPrefix: '/api/v1',
    logLevel: env.LOG_LEVEL,
    logPretty: env.LOG_PRETTY,
    trustProxy: env.TRUST_PROXY ?? 0,
    corsOrigins,
    socketCorsOrigins:
      socketCorsOrigins.length > 0 ? socketCorsOrigins : corsOrigins.length > 0 ? corsOrigins : DEFAULT_DEV_ORIGINS,
    apiPublicUrl: env.API_PUBLIC_URL
      ? normalizeUrl(env.API_PUBLIC_URL, env.API_PUBLIC_URL)
      : null,
    frontendUrl,
    siteUrl,
    siteName: env.SITE_NAME,
    shopify: {
      storeDomain,
      apiVersion: env.SHOPIFY_API_VERSION,
      publicToken: env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN ?? null,
      privateToken: env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN ?? null,
      hasToken,
      useFixtures,
      mockMode: env.SHOPIFY_MOCK_MODE,
    },
    webhooks: {
      secret: env.SHOPIFY_WEBHOOK_SECRET ?? null,
      publicBaseUrl: env.PUBLIC_WEBHOOK_BASE_URL
        ? normalizeUrl(env.PUBLIC_WEBHOOK_BASE_URL, env.PUBLIC_WEBHOOK_BASE_URL)
        : null,
      topics: (() => {
        const configured = parseCsv(env.SHOPIFY_WEBHOOK_TOPICS ?? undefined).map((topic) =>
          topic.toLowerCase(),
        );
        return configured.length > 0
          ? configured
          : [
              'orders/create',
              'orders/updated',
              'orders/fulfilled',
              'products/update',
              'inventory_levels/update',
              'app/uninstalled',
            ];
      })(),
      adminAccessToken: env.SHOPIFY_ADMIN_API_ACCESS_TOKEN ?? null,
      adminApiVersion: env.SHOPIFY_ADMIN_API_VERSION,
      apply: env.SHOPIFY_WEBHOOKS_APPLY,
    },
    admin: {
      keyHash: adminCredentials.keyHash,
      jwtSecret: adminCredentials.jwtSecret,
      jwtTtlSeconds: env.ADMIN_JWT_TTL_SECONDS,
      configured: adminConfigured,
    },
    auth: {
      enabled: authEnabled,
      clientId: customerClientId,
      clientSecret: customerClientSecret,
      scope: env.SHOPIFY_CUSTOMER_ACCOUNT_SCOPE,
      discoveryUrl,
      apiDiscoveryUrl,
      authUrl,
      tokenUrl,
      logoutUrl,
      jwksUri,
      issuer: env.SHOPIFY_CUSTOMER_ACCOUNT_ISSUER ?? null,
      apiUrl,
      redirectUri,
      logoutRedirectUri,
      jsOrigin,
      sessionSecret,
      sessionTtlSeconds: env.AUTH_SESSION_TTL_SECONDS,
      stateTtlSeconds: env.AUTH_STATE_TTL_SECONDS,
      cookieName,
      cookieSecure,
      cookieDomain,
      rateLimitMax: env.AUTH_RATE_LIMIT_MAX,
      configured:
        authEnabled &&
        Boolean(
          customerClientId &&
            redirectUri &&
            sessionSecret &&
            (apiUrl || apiDiscoveryUrl) &&
            ((authUrl && tokenUrl && logoutUrl && jwksUri) || discoveryUrl),
        ),
    },
    audit: {
      scanLimit: env.AUDIT_PRODUCT_SCAN_LIMIT,
      cacheTtlSeconds: env.AUDIT_CACHE_TTL_SECONDS,
      minImages: env.AUDIT_MIN_IMAGES,
      foodKeywords: parseCsv(
        env.AUDIT_FOOD_KEYWORDS ??
          'coffee,juice,syrup,biscuit,margarine,oil,flour,rice,beans,tea,chocolate,snack,food,spice,sauce,drink',
      ),
    },
    metafields: {
      namespaces: parseCsv(env.SHOPIFY_METAFIELD_NAMESPACES).length
        ? parseCsv(env.SHOPIFY_METAFIELD_NAMESPACES)
        : ['custom', 'food'],
      keys: {
        nutrition: env.METAFIELD_NUTRITION_KEY,
        ingredients: env.METAFIELD_INGREDIENTS_KEY,
        allergens: env.METAFIELD_ALLERGENS_KEY,
        origin: env.METAFIELD_ORIGIN_KEY,
        preparation: env.METAFIELD_PREPARATION_KEY,
      },
    },
    shipping: {
      worldwideClaim: env.SHIPPING_WORLDWIDE_CLAIM,
      advertisedCountries: parseCsv(env.SHIPPING_ADVERTISED_COUNTRIES ?? undefined).map((code) =>
        code === 'UK' ? 'GB' : code.toUpperCase(),
      ),
    },
    socket: {
      adminJwtSecret: adminJwtSecret,
      adminTokenTtlSeconds: env.SOCKET_ADMIN_TOKEN_TTL_SECONDS,
    },
    rateLimits: {
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      globalMax: env.RATE_LIMIT_MAX,
      cartMax: env.CART_RATE_LIMIT_MAX,
      newsletterMax: env.NEWSLETTER_RATE_LIMIT_MAX,
      webhookMax: env.WEBHOOK_RATE_LIMIT_MAX,
      authMax: env.AUTH_RATE_LIMIT_MAX,
      aiMax: env.AI_RATE_LIMIT_MAX,
    },
    redisUrl: env.REDIS_URL ?? null,
    sentryDsn: env.SENTRY_DSN ?? null,
    newsletter: {
      provider: env.NEWSLETTER_PROVIDER,
      webhookUrl: env.NEWSLETTER_WEBHOOK_URL ?? null,
      webhookSecret: env.NEWSLETTER_WEBHOOK_SECRET ?? null,
      klaviyoApiKey: env.KLAVIYO_API_KEY ?? null,
      klaviyoListId: env.KLAVIYO_LIST_ID ?? null,
      klaviyoRevision: env.KLAVIYO_API_REVISION,
      mailchimpApiKey: env.MAILCHIMP_API_KEY ?? null,
      mailchimpListId: env.MAILCHIMP_LIST_ID ?? null,
      mailchimpServerPrefix: env.MAILCHIMP_SERVER_PREFIX ?? null,
    },
    reviews: { provider: env.REVIEWS_PROVIDER, apiToken: env.REVIEWS_API_TOKEN ?? null },
    ai: {
      enabled: env.AI_ENABLED && Boolean(env.AI_API_KEY),
      apiKey: env.AI_API_KEY ?? null,
      baseUrl: env.AI_BASE_URL.replace(/\/+$/, ''),
      model: env.AI_MODEL,
      temperature: env.AI_TEMPERATURE,
      cacheTtlSeconds: env.AI_CACHE_TTL_SECONDS,
    },
    warnings,
  };
}

/** Redacted configuration snapshot. Never contains tokens or secrets. */
export function safeConfigSummary(config: AppConfig): Record<string, unknown> {
  return {
    nodeEnv: config.nodeEnv,
    shopify: {
      storeDomain: config.shopify.storeDomain,
      apiVersion: config.shopify.apiVersion,
      dataSource: config.shopify.useFixtures ? 'fixture' : 'shopify',
      usingPrivateToken: Boolean(config.shopify.privateToken),
      usingPublicToken: Boolean(config.shopify.publicToken),
    },
    corsOrigins: config.corsOrigins,
    siteUrl: config.siteUrl,
    frontendUrl: config.frontendUrl,
    webhooks: {
      configured: Boolean(config.webhooks.secret),
      topics: config.webhooks.topics,
      publicBaseUrlConfigured: Boolean(config.webhooks.publicBaseUrl),
    },
    socket: { adminEnabled: Boolean(config.socket.adminJwtSecret) },
    adminAuth: {
      configured: config.admin.configured,
      apiKeyConfigured: Boolean(config.admin.keyHash),
      jwtConfigured: Boolean(config.admin.jwtSecret),
    },
    customerAccounts: {
      enabled: config.auth.enabled,
      configured: config.auth.configured,
      cookieName: config.auth.cookieName,
    },
    newsletterProvider: config.newsletter.provider,
    reviewsProvider: config.reviews.provider,
    ai: {
      enabled: config.ai.enabled,
      configured: Boolean(config.ai.apiKey),
      model: config.ai.model,
    },
    redisEnabled: Boolean(config.redisUrl),
    rateLimits: config.rateLimits,
  };
}
