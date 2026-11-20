import { createHmac, randomBytes } from 'node:crypto';
import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type { WithdrawalResult, WithdrawalSubmission } from '../types/domain';
import { notConfigured, upstreamError } from '../utils/errors';

/**
 * Receives an electronic withdrawal request (audit #1).
 *
 * This is an intake workflow, not a legal conclusion. The owner must have the
 * copy and process reviewed before publishing the form. With the default
 * `mock` provider nothing leaves the process; `webhook` forwards a signed JSON
 * payload to an owner-controlled endpoint for ticketing/email.
 */
export class WithdrawalService {
  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async submit(input: WithdrawalSubmission): Promise<WithdrawalResult> {
    const reference = `WD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const receivedAt = new Date().toISOString();
    const provider = this.config.withdrawal.provider;
    const payload = { ...input, reference, receivedAt };

    const result =
      provider === 'mock' ? await this.mockProvider() : await this.webhookProvider(payload);

    // Never log the email/body of a withdrawal request.
    this.logger.info({ provider, reference, simulated: result.simulated }, 'withdrawal request received');

    return {
      reference,
      status: result.status,
      provider,
      receivedAt,
      simulated: result.simulated,
      message: result.message,
    };
  }

  private async mockProvider(): Promise<{ status: WithdrawalResult['status']; message: string; simulated: boolean }> {
    return {
      status: 'simulated',
      message:
        'Simulated withdrawal receipt (WITHDRAWAL_PROVIDER=mock). No data was sent to any provider. Configure the webhook provider before launch.',
      simulated: true,
    };
  }

  private async webhookProvider(
    payload: WithdrawalSubmission & { reference: string; receivedAt: string },
  ): Promise<{ status: WithdrawalResult['status']; message: string; simulated: boolean }> {
    const url = this.config.withdrawal.webhookUrl;
    if (!url) {
      throw notConfigured('WITHDRAWAL_WEBHOOK_URL is required for WITHDRAWAL_PROVIDER=webhook');
    }

    const body = JSON.stringify(payload);
    const signature = this.config.withdrawal.webhookSecret
      ? createHmac('sha256', this.config.withdrawal.webhookSecret).update(body).digest('hex')
      : null;

    const response = await this.fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'x-bena-signature': signature } : {}),
      },
      body,
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw upstreamError(`Withdrawal webhook responded with HTTP ${response.status}`);
    }

    return {
      status: 'received',
      message:
        'Your withdrawal request has been received. A confirmation will be sent to the email address you provided.',
      simulated: false,
    };
  }
}
