import { describe, expect, it } from 'vitest';
import { signShopifyHmac, verifyShopifyHmac } from '../../src/webhooks/verify';
import { MemoryDedupStore } from '../../src/webhooks/dedup';

const SECRET = 'top-secret-webhook-key';
const BODY = JSON.stringify({ id: 1, name: '#1001' });

describe('webhook HMAC verification', () => {
  it('accepts a valid base64 Shopify signature', () => {
    const signature = signShopifyHmac(BODY, SECRET);
    expect(verifyShopifyHmac(BODY, signature, SECRET)).toBe(true);
  });

  it('accepts a valid hex signature', () => {
    const hex = Buffer.from(signShopifyHmac(BODY, SECRET), 'base64').toString('hex');
    expect(verifyShopifyHmac(Buffer.from(BODY), hex, SECRET)).toBe(true);
  });

  it('rejects tampered bodies, wrong secrets and malformed headers', () => {
    const signature = signShopifyHmac(BODY, SECRET);
    expect(verifyShopifyHmac(`${BODY} `, signature, SECRET)).toBe(false);
    expect(verifyShopifyHmac(BODY, signature, 'wrong-secret')).toBe(false);
    expect(verifyShopifyHmac(BODY, 'not-a-signature', SECRET)).toBe(false);
    expect(verifyShopifyHmac(BODY, undefined, SECRET)).toBe(false);
    expect(verifyShopifyHmac(undefined, signature, SECRET)).toBe(false);
    expect(verifyShopifyHmac(BODY, signature, '')).toBe(false);
  });
});

describe('webhook deduplication', () => {
  it('marks the first delivery as new and the second as duplicate', async () => {
    const store = new MemoryDedupStore();
    expect(await store.markIfNew('shop:webhook-1')).toBe(true);
    expect(await store.markIfNew('shop:webhook-1')).toBe(false);
    expect(await store.markIfNew('shop:webhook-2')).toBe(true);
    await store.close();
  });

  it('expires entries after the TTL', async () => {
    const store = new MemoryDedupStore(10);
    expect(await store.markIfNew('expiring')).toBe(true);
    expect(await store.markIfNew('expiring')).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(await store.markIfNew('expiring')).toBe(true);
  });
});
