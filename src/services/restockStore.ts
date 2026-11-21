import { createHash } from 'node:crypto';

/**
 * Product-specific restock signups are kept in process memory only.
 *
 * There is deliberately no Redis/database dependency: the flow works out of
 * the box with zero infrastructure. The trade-off is that pending signups are
 * lost when the backend restarts, so a durable store would be needed if the
 * shop expects alerts to survive deploys.
 */
export interface RestockSignupRecord {
  /** Stable, non-reversible id: SHA-256 of product handle + lowercased email. */
  id: string;
  email: string;
  productHandle: string;
  country: string | null;
  language: string | null;
  registeredAt: string;
  notifiedAt: string | null;
}

export type RestockSignupInput = Omit<RestockSignupRecord, 'id' | 'notifiedAt'>;

export interface RestockStore {
  readonly kind: 'memory';
  add(input: RestockSignupInput): Promise<{
    status: 'registered' | 'already_registered';
    record: RestockSignupRecord;
  }>;
  listPending(productHandle: string): Promise<RestockSignupRecord[]>;
  markNotified(productHandle: string, id: string): Promise<void>;
  pendingCount(productHandle: string): Promise<number>;
  close(): Promise<void>;
}

const MAX_ENTRIES = 50_000;

function signupId(productHandle: string, email: string): string {
  return createHash('sha256')
    .update(`${productHandle.toLowerCase()}:${email.trim().toLowerCase()}`)
    .digest('hex');
}

export class MemoryRestockStore implements RestockStore {
  readonly kind = 'memory' as const;
  private readonly entries = new Map<string, { record: RestockSignupRecord; expiresAt: number }>();
  private readonly ttlMs: number;

  constructor(ttlSeconds = 2_592_000) {
    this.ttlMs = ttlSeconds * 1000;
  }

  async add(input: RestockSignupInput): Promise<{
    status: 'registered' | 'already_registered';
    record: RestockSignupRecord;
  }> {
    const now = Date.now();
    const id = signupId(input.productHandle, input.email);
    const key = `${input.productHandle}:${id}`;
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > now && !existing.record.notifiedAt) {
      return { status: 'already_registered', record: existing.record };
    }

    const record: RestockSignupRecord = {
      ...input,
      email: input.email.trim().toLowerCase(),
      id,
      notifiedAt: null,
    };
    this.entries.set(key, { record, expiresAt: now + this.ttlMs });
    if (this.entries.size > MAX_ENTRIES) this.sweep(now);
    return { status: 'registered', record };
  }

  async listPending(productHandle: string): Promise<RestockSignupRecord[]> {
    const now = Date.now();
    const prefix = `${productHandle}:`;
    const pending: RestockSignupRecord[] = [];
    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
        continue;
      }
      if (key.startsWith(prefix) && !entry.record.notifiedAt) pending.push(entry.record);
    }
    return pending;
  }

  async markNotified(productHandle: string, id: string): Promise<void> {
    const key = `${productHandle}:${id}`;
    const entry = this.entries.get(key);
    if (entry) entry.record.notifiedAt = new Date().toISOString();
  }

  async pendingCount(productHandle: string): Promise<number> {
    return (await this.listPending(productHandle)).length;
  }

  async close(): Promise<void> {
    this.entries.clear();
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.entries.entries()) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = this.entries.keys().next().value as string | undefined;
      if (!oldest) break;
      this.entries.delete(oldest);
    }
  }
}

export function createRestockStore(ttlSeconds = 2_592_000): RestockStore {
  return new MemoryRestockStore(ttlSeconds);
}
