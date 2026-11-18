import type { AppConfig } from '../config/env';
import type { CommerceClient } from '../types/domain';
import { APP_VERSION } from '../config/constants';

interface ShopifyCheck {
  ok: boolean;
  latencyMs: number;
  detail: string;
  dataSource: 'shopify' | 'fixture';
}

export interface ReadinessResult {
  status: 'ok' | 'degraded' | 'error';
  checks: {
    shopify: ShopifyCheck;
    webhooks: { configured: boolean; detail: string };
    adminAuth: { configured: boolean; detail: string };
    customerAccounts: { enabled: boolean; configured: boolean; detail: string };
    socket: { adminEnabled: boolean; detail: string };
    redis: { configured: boolean; detail: string };
    environment: { valid: true; warnings: number };
  };
  uptimeSeconds: number;
  timestamp: string;
  version: string;
}

export class HealthService {
  private readonly startedAt = Date.now();

  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
  ) {}

  liveness(): { status: 'ok'; uptimeSeconds: number; version: string; timestamp: string } {
    return {
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  async readiness(): Promise<ReadinessResult> {
    const ping = await this.client.ping();
    const webhooksConfigured = Boolean(this.config.webhooks.secret);
    const adminEnabled = Boolean(this.config.socket.adminJwtSecret);

    const status: ReadinessResult['status'] =
      ping.ok
        ? webhooksConfigured && this.config.admin.configured && (adminEnabled || !this.config.isProduction)
          ? 'ok'
          : 'degraded'
        : 'error';

    return {
      status,
      checks: {
        shopify: {
          ok: ping.ok,
          latencyMs: ping.latencyMs,
          detail: ping.detail ?? `Storefront API reachable (${this.config.shopify.apiVersion})`,
          dataSource: this.config.shopify.useFixtures ? 'fixture' : 'shopify',
        },
        webhooks: {
          configured: webhooksConfigured,
          detail: webhooksConfigured
            ? 'HMAC secret configured'
            : 'SHOPIFY_WEBHOOK_SECRET missing — webhook deliveries are rejected',
        },
        adminAuth: {
          configured: this.config.admin.configured,
          detail: this.config.admin.configured
            ? `Admin auth enabled (${[
                this.config.admin.keyHash ? 'API key' : null,
                this.config.admin.jwtSecret ? 'JWT' : null,
              ]
                .filter(Boolean)
                .join(' + ')})`
            : 'No admin credentials configured — admin routes return 503',
        },
        customerAccounts: {
          enabled: this.config.auth.enabled,
          configured: this.config.auth.configured,
          detail: this.config.auth.enabled
            ? this.config.auth.configured
              ? 'Customer Account API configured (Layer 1 remains UNVERIFIED until live login is tested)'
              : 'Customer accounts enabled but configuration is incomplete'
            : 'Customer accounts disabled — guest checkout only',
        },
        socket: {
          adminEnabled,
          detail: adminEnabled
            ? 'Admin namespace requires a signed JWT'
            : 'SOCKET_ADMIN_JWT_SECRET missing — admin namespace disabled',
        },
        redis: {
          configured: Boolean(this.config.redisUrl),
          detail: this.config.redisUrl
            ? 'Redis configured (dedup/scaling adapter)'
            : 'In-memory dedup + single-instance Socket.IO',
        },
        environment: { valid: true, warnings: this.config.warnings.length },
      },
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
      version: APP_VERSION,
    };
  }
}
