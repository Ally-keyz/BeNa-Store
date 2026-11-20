import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { WithdrawalService } from '../../src/services/withdrawal.service';
import { testConfig } from '../helpers/testContext';

const WEBHOOK_URL = 'https://hooks.example.test/bena/withdrawals';
const WEBHOOK_SECRET = 'withdrawal-signing-secret-do-not-log';
const logger = pino({ level: 'silent' });

const submission = {
  orderNumber: '#1001',
  email: 'customer.pii@example.test',
  fullName: 'Ada Lovelace',
  countryCode: 'DE',
  orderedOn: '2026-10-20',
  itemDescription: 'Rwanda Coffee 250g',
  reason: 'Changed my mind',
  declaration: true as const,
  language: 'de',
};

afterEach(() => {
  vi.restoreAllMocks();
});

function serviceWith(fetchMock: ReturnType<typeof vi.fn>, overrides: Record<string, string | undefined> = {}) {
  return new WithdrawalService(
    testConfig({
      WITHDRAWAL_PROVIDER: 'webhook',
      WITHDRAWAL_WEBHOOK_URL: WEBHOOK_URL,
      WITHDRAWAL_WEBHOOK_SECRET: WEBHOOK_SECRET,
      ...overrides,
    }),
    logger,
    fetchMock as unknown as typeof fetch,
  );
}

describe('WithdrawalService webhook mode', () => {
  it('posts a signed payload and never logs the secret or the shopper PII', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const service = serviceWith(fetchMock);
    const info = vi.spyOn(logger, 'info');

    const result = await service.submit(submission);

    expect(result.status).toBe('received');
    expect(result.simulated).toBe(false);
    expect(result.provider).toBe('webhook');
    expect(result.reference).toMatch(/^WD-\d{8}-[A-F0-9]{6}$/);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe(WEBHOOK_URL);
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });

    const body = init.body as string;
    expect(JSON.parse(body)).toMatchObject({
      ...submission,
      reference: result.reference,
      receivedAt: result.receivedAt,
    });
    expect(body).not.toContain(WEBHOOK_SECRET);

    const expectedSignature = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
    expect((init.headers as Record<string, string>)['x-bena-signature']).toBe(expectedSignature);

    const logged = info.mock.calls
      .map((call) => call.map((part) => (typeof part === 'string' ? part : JSON.stringify(part))).join(' '))
      .join(' ');
    expect(logged).toContain('withdrawal request received');
    expect(logged).not.toContain(WEBHOOK_SECRET);
    expect(logged).not.toContain(submission.email);
    expect(logged).not.toContain(submission.fullName);
    expect(logged).not.toContain(submission.orderNumber);
  });

  it('omits the signature header when no webhook secret is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const service = serviceWith(fetchMock, { WITHDRAWAL_WEBHOOK_SECRET: '' });

    const result = await service.submit(submission);

    expect(result.status).toBe('received');
    const [, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('x-bena-signature');
  });

  it('fails fast when webhook mode has no URL', async () => {
    const fetchMock = vi.fn();
    const service = serviceWith(fetchMock, { WITHDRAWAL_WEBHOOK_URL: '' });

    await expect(service.submit(submission)).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a failed webhook response to an upstream error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('nope', { status: 502 }));
    const service = serviceWith(fetchMock);

    await expect(service.submit(submission)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
