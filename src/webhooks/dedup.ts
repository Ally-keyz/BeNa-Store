import type { Logger } from 'pino';
import { Redis } from 'ioredis';

export interface DedupStore {
  readonly kind: 'memory' | 'redis';
  /** Atomically mark the webhook id; returns true when it is new. */
  markIfNew(webhookId: string): Promise<boolean>;
  close(): Promise<void>;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20_000;

export class MemoryDedupStore implements DedupStore {
  readonly kind = 'memory' as const;
  private readonly seen = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  async markIfNew(webhookId: string): Promise<boolean> {
    const now = Date.now();
    const expiresAt = this.seen.get(webhookId);
    if (expiresAt && expiresAt > now) return false;

    this.seen.set(webhookId, now + this.ttlMs);
    if (this.seen.size > MAX_ENTRIES) this.sweep(now);
    return true;
  }

  private sweep(now: number): void {
    for (const [id, expiresAt] of this.seen.entries()) {
      if (expiresAt <= now) this.seen.delete(id);
    }
    // Still too large: drop the oldest insertion order entries.
    while (this.seen.size > MAX_ENTRIES) {
      const oldest = this.seen.keys().next().value as string | undefined;
      if (!oldest) break;
      this.seen.delete(oldest);
    }
  }

  async close(): Promise<void> {
    this.seen.clear();
  }
}

export class RedisDedupStore implements DedupStore {
  readonly kind = 'redis' as const;
  private readonly client: Redis;
  private readonly fallback = new MemoryDedupStore();
  private readonly logger: Logger;
  private readonly ttlSeconds: number;

  constructor(redisUrl: string, logger: Logger, ttlSeconds = 86_400) {
    this.logger = logger;
    this.ttlSeconds = ttlSeconds;
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.client.on('error', (error) => {
      this.logger.warn({ err: { message: error.message } }, 'redis dedup error; using memory fallback');
    });
  }

  async markIfNew(webhookId: string): Promise<boolean> {
    try {
      if (this.client.status === 'wait' || this.client.status === 'end') {
        await this.client.connect();
      }
      const result = await this.client.set(`webhook:dedupe:${webhookId}`, '1', 'EX', this.ttlSeconds, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.warn(
        { err: error instanceof Error ? { message: error.message } : 'unknown' },
        'redis dedup unavailable; falling back to in-memory dedup for this delivery',
      );
      return this.fallback.markIfNew(webhookId);
    }
  }

  async close(): Promise<void> {
    await this.fallback.close();
    try {
      if (this.client.status !== 'end') await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}

export function createDedupStore(redisUrl: string | null, logger: Logger): DedupStore {
  if (redisUrl) {
    logger.info('Webhook dedup: Redis store enabled');
    return new RedisDedupStore(redisUrl, logger);
  }
  logger.info('Webhook dedup: in-memory TTL store (single instance only)');
  return new MemoryDedupStore();
}
