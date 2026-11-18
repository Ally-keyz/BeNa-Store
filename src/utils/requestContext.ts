import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  buyerIp?: string;
  requestId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function currentBuyerIp(): string | undefined {
  return storage.getStore()?.buyerIp;
}

/** Remove IPv4-mapped IPv6 prefixes and drop loopback/private addresses. */
export function normalizeIp(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const value = raw.startsWith('::ffff:') ? raw.slice(7) : raw;
  if (!/^[0-9a-fA-F.:]+$/.test(value)) return undefined;
  if (value === '::1' || value.startsWith('127.') || value === '::') return undefined;
  if (/^10\./.test(value)) return undefined;
  if (/^192\.168\./.test(value)) return undefined;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(value)) return undefined;
  if (/^f[cd][0-9a-f]{2}:/i.test(value)) return undefined; // IPv6 ULA
  return value;
}
