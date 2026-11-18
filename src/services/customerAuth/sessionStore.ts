import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import { Redis } from 'ioredis';
import type { AppConfig } from '../../config/env';
import type { AccountSession } from '../../types/auth';

export interface PendingAuth {
  state: string;
  verifier: string;
  nonce: string;
  returnTo: string;
  createdAt: number;
}

export interface AuthStore {
  readonly kind: 'memory' | 'redis';
  getSession(id: string): Promise<AccountSession | null>;
  setSession(session: AccountSession, ttlSeconds: number): Promise<void>;
  deleteSession(id: string): Promise<void>;
  putPending(pending: PendingAuth, ttlSeconds: number): Promise<void>;
  /** Single-use read: the pending record is removed atomically where possible. */
  takePending(state: string): Promise<PendingAuth | null>;
  close(): Promise<void>;
}

const SESSION_PREFIX = 'bena:session:';
const PENDING_PREFIX = 'bena:oauth-state:';

export class MemoryAuthStore implements AuthStore {
  readonly kind = 'memory' as const;
  private readonly sessions = new Map<string, { value: AccountSession; expiresAt: number }>();
  private readonly pending = new Map<string, { value: PendingAuth; expiresAt: number }>();

  async getSession(id: string): Promise<AccountSession | null> {
    const entry = this.sessions.get(id);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.sessions.delete(id);
      return null;
    }
    return entry.value;
  }

  async setSession(session: AccountSession, ttlSeconds: number): Promise<void> {
    this.sessions.set(session.id, {
      value: session,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.sweep();
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async putPending(pending: PendingAuth, ttlSeconds: number): Promise<void> {
    this.pending.set(pending.state, {
      value: pending,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.sweep();
  }

  async takePending(state: string): Promise<PendingAuth | null> {
    const entry = this.pending.get(state);
    if (!entry) return null;
    this.pending.delete(state);
    return entry.expiresAt > Date.now() ? entry.value : null;
  }

  async close(): Promise<void> {
    this.sessions.clear();
    this.pending.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.sessions) if (entry.expiresAt <= now) this.sessions.delete(key);
    for (const [key, entry] of this.pending) if (entry.expiresAt <= now) this.pending.delete(key);
    // Bound memory if a hostile client creates many pending states.
    while (this.pending.size > 10_000) {
      const oldest = this.pending.keys().next().value as string | undefined;
      if (!oldest) break;
      this.pending.delete(oldest);
    }
  }
}

/** Redis-backed sessions for multi-instance deployments; falls back to memory. */
export class RedisAuthStore implements AuthStore {
  readonly kind = 'redis' as const;
  private readonly fallback = new MemoryAuthStore();

  constructor(
    private readonly client: import('ioredis').Redis,
    private readonly logger: import('pino').Logger,
  ) {}

  async getSession(id: string): Promise<AccountSession | null> {
    try {
      const raw = await this.client.get(`${SESSION_PREFIX}${id}`);
      return raw ? (JSON.parse(raw) as AccountSession) : null;
    } catch (error) {
      this.logger.warn(
        { err: error instanceof Error ? { message: error.message } : 'unknown' },
        'redis session read failed; using memory fallback',
      );
      return this.fallback.getSession(id);
    }
  }

  async setSession(session: AccountSession, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(
        `${SESSION_PREFIX}${session.id}`,
        JSON.stringify(session),
        'EX',
        ttlSeconds,
      );
    } catch {
      await this.fallback.setSession(session, ttlSeconds);
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await this.client.del(`${SESSION_PREFIX}${id}`);
    } catch {
      await this.fallback.deleteSession(id);
    }
  }

  async putPending(pending: PendingAuth, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(
        `${PENDING_PREFIX}${pending.state}`,
        JSON.stringify(pending),
        'EX',
        ttlSeconds,
      );
    } catch {
      await this.fallback.putPending(pending, ttlSeconds);
    }
  }

  async takePending(state: string): Promise<PendingAuth | null> {
    try {
      const key = `${PENDING_PREFIX}${state}`;
      const raw = await this.client.get(key);
      if (!raw) return null;
      await this.client.del(key);
      return JSON.parse(raw) as PendingAuth;
    } catch {
      return this.fallback.takePending(state);
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

/** Cookie value = sessionId.hmacSha256Base64Url */
export function signCookieValue(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value, 'utf8').digest('base64url');
  return `${value}.${signature}`;
}

export function verifyCookieValue(
  cookieValue: string | undefined,
  secret: string,
): string | null {
  if (!cookieValue) return null;
  const separator = cookieValue.lastIndexOf('.');
  if (separator <= 0) return null;
  const value = cookieValue.slice(0, separator);
  const provided = Buffer.from(cookieValue.slice(separator + 1), 'base64url');
  const expected = createHmac('sha256', secret).update(value, 'utf8').digest();
  if (provided.length !== expected.length) return null;
  return timingSafeEqual(provided, expected) ? value : null;
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    try {
      result[name] = decodeURIComponent(value);
    } catch {
      result[name] = value;
    }
  }
  return result;
}

export function sessionCookieOptions(auth: AppConfig['auth']): CookieOptions {
  return {
    httpOnly: true,
    secure: auth.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: auth.sessionTtlSeconds * 1000,
    ...(auth.cookieDomain ? { domain: auth.cookieDomain } : {}),
  };
}

export function readSessionId(req: Request, auth: AppConfig['auth']): string | null {
  if (!auth.sessionSecret) return null;
  const cookies = parseCookieHeader(req.headers.cookie);
  const cookieValue = cookies[auth.cookieName];
  return verifyCookieValue(cookieValue, auth.sessionSecret);
}

export function writeSessionCookie(
  res: Response,
  sessionId: string,
  auth: AppConfig['auth'],
): void {
  if (!auth.sessionSecret) throw new Error('SESSION_SECRET is required to set a session cookie');
  res.cookie(auth.cookieName, signCookieValue(sessionId, auth.sessionSecret), sessionCookieOptions(auth));
}

export function clearSessionCookie(res: Response, auth: AppConfig['auth']): void {
  res.clearCookie(auth.cookieName, {
    httpOnly: true,
    secure: auth.cookieSecure,
    sameSite: 'lax',
    path: '/',
    ...(auth.cookieDomain ? { domain: auth.cookieDomain } : {}),
  });
}

function oauthStateCookieName(): string {
  // __Host- requires Path=/; the state cookie is scoped to the callback path,
  // so it deliberately uses a non-prefixed name.
  return 'bena_oauth_state';
}

/** Short-lived browser binding for the OAuth state (login CSRF defense). */
export function writeOAuthStateCookie(
  res: Response,
  state: string,
  auth: AppConfig['auth'],
): void {
  if (!auth.sessionSecret) throw new Error('SESSION_SECRET is required for OAuth state');
  res.cookie(oauthStateCookieName(), signCookieValue(state, auth.sessionSecret), {
    httpOnly: true,
    secure: auth.cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth/callback',
    maxAge: auth.stateTtlSeconds * 1000,
  });
}

export function readOAuthStateCookie(req: Request, auth: AppConfig['auth']): string | null {
  if (!auth.sessionSecret) return null;
  const cookieValue = parseCookieHeader(req.headers.cookie)[oauthStateCookieName()];
  return verifyCookieValue(cookieValue, auth.sessionSecret);
}

export function clearOAuthStateCookie(res: Response, auth: AppConfig['auth']): void {
  res.clearCookie(oauthStateCookieName(), {
    httpOnly: true,
    secure: auth.cookieSecure,
    sameSite: 'lax',
    path: '/api/v1/auth/callback',
  });
}

export function newSessionId(): string {
  return randomBytes(32).toString('base64url');
}

export function createAuthStore(
  redisUrl: string | null,
  logger: import('pino').Logger,
): AuthStore {
  if (!redisUrl) return new MemoryAuthStore();
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  client.on('error', (error) => {
    logger.warn({ message: error.message }, 'redis auth store error; memory fallback active');
  });
  void client.connect().catch((error: unknown) => {
    logger.warn(
      { err: error instanceof Error ? { message: error.message } : 'unknown' },
      'redis auth store unavailable; sessions use memory fallback',
    );
  });
  return new RedisAuthStore(client, logger);
}
