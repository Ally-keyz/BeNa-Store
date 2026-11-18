import { createHmac } from 'node:crypto';
import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type { NewsletterSubscriptionResult } from '../types/domain';
import { badRequest, notConfigured, upstreamError } from '../utils/errors';

export interface NewsletterInput {
  email: string;
  marketingConsent: boolean;
  source?: string;
  language?: string;
}

interface ProviderResult {
  status: NewsletterSubscriptionResult['status'];
  message: string;
  simulated: boolean;
}

/**
 * Provider-agnostic newsletter service.
 *
 * Shopify's native customer marketing consent cannot be recorded from a
 * passwordless server call: Storefront customerCreate requires an account
 * (password or Customer Account API). Choose a real provider via
 * NEWSLETTER_PROVIDER, or keep `mock` for development.
 */
export class NewsletterService {
  private readonly mockSubscribers = new Set<string>();

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async subscribe(input: NewsletterInput): Promise<NewsletterSubscriptionResult> {
    if (!input.marketingConsent) {
      throw badRequest(
        'Marketing consent is required to subscribe to the newsletter. Do not subscribe users without explicit consent.',
      );
    }

    const provider = this.config.newsletter.provider;
    const result = await this.dispatch(provider, input);

    this.logger.info(
      { provider, status: result.status, simulated: result.simulated },
      'newsletter subscription processed',
    );

    return {
      email: input.email,
      status: result.status,
      provider,
      consent: {
        marketing: true,
        source: input.source ?? 'storefront_footer',
        recordedAt: new Date().toISOString(),
      },
      simulated: result.simulated,
      message: result.message,
    };
  }

  private async dispatch(
    provider: AppConfig['newsletter']['provider'],
    input: NewsletterInput,
  ): Promise<ProviderResult> {
    switch (provider) {
      case 'mock':
        return this.mockProvider(input);
      case 'webhook':
        return this.webhookProvider(input);
      case 'klaviyo':
        return this.klaviyoProvider(input);
      case 'mailchimp':
        return this.mailchimpProvider(input);
      default:
        throw notConfigured(`Unsupported newsletter provider: ${String(provider)}`);
    }
  }

  private mockProvider(input: NewsletterInput): ProviderResult {
    const key = input.email.toLowerCase();
    if (this.mockSubscribers.has(key)) {
      return {
        status: 'already_subscribed',
        message: 'This email is already in the local mock subscriber list.',
        simulated: true,
      };
    }
    this.mockSubscribers.add(key);
    return {
      status: 'subscribed',
      message:
        'Simulated subscription (NEWSLETTER_PROVIDER=mock). No data was sent to any provider.',
      simulated: true,
    };
  }

  private async webhookProvider(input: NewsletterInput): Promise<ProviderResult> {
    const url = this.config.newsletter.webhookUrl;
    if (!url) {
      throw notConfigured('NEWSLETTER_WEBHOOK_URL is required for NEWSLETTER_PROVIDER=webhook');
    }
    const body = JSON.stringify({
      email: input.email,
      marketingConsent: input.marketingConsent,
      source: input.source ?? 'storefront_footer',
      language: input.language ?? null,
      timestamp: new Date().toISOString(),
    });
    const signature = this.config.newsletter.webhookSecret
      ? createHmac('sha256', this.config.newsletter.webhookSecret).update(body).digest('hex')
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
      throw upstreamError(`Newsletter webhook responded with HTTP ${response.status}`);
    }
    return { status: 'subscribed', message: 'Subscribed via configured webhook.', simulated: false };
  }

  private async klaviyoProvider(input: NewsletterInput): Promise<ProviderResult> {
    const { klaviyoApiKey, klaviyoListId } = this.config.newsletter;
    if (!klaviyoApiKey || !klaviyoListId) {
      throw notConfigured('KLAVIYO_API_KEY and KLAVIYO_LIST_ID are required for Klaviyo');
    }
    const response = await this.fetchImpl(
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Klaviyo-API-Key ${klaviyoApiKey}`,
          revision: this.config.newsletter.klaviyoRevision,
        },
        body: JSON.stringify({
          data: {
            type: 'profile-subscription-bulk-create-job',
            attributes: {
              list_id: klaviyoListId,
              custom_source: input.source ?? 'BeNa storefront',
              profiles: {
                data: [
                  {
                    type: 'profile',
                    attributes: {
                      email: input.email,
                      subscriptions: {
                        email: { marketing: { consent: 'SUBSCRIBED' } },
                      },
                    },
                  },
                ],
              },
            },
          },
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.warn(
        { provider: 'klaviyo', status: response.status, detail: detail.slice(0, 200) },
        'klaviyo subscription failed',
      );
      throw upstreamError(`Klaviyo responded with HTTP ${response.status}`);
    }
    return {
      status: 'subscribed',
      message: 'Subscription submitted to Klaviyo (double opt-in may still be required).',
      simulated: false,
    };
  }

  private async mailchimpProvider(input: NewsletterInput): Promise<ProviderResult> {
    const { mailchimpApiKey, mailchimpListId, mailchimpServerPrefix } = this.config.newsletter;
    if (!mailchimpApiKey || !mailchimpListId || !mailchimpServerPrefix) {
      throw notConfigured(
        'MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID and MAILCHIMP_SERVER_PREFIX are required for Mailchimp',
      );
    }
    const auth = Buffer.from(`bena:${mailchimpApiKey}`).toString('base64');
    const response = await this.fetchImpl(
      `https://${mailchimpServerPrefix}.api.mailchimp.com/3.0/lists/${mailchimpListId}/members`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          email_address: input.email,
          status: 'subscribed',
          tags: ['bena-newsletter'],
        }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (response.ok) {
      return {
        status: 'subscribed',
        message: 'Subscription submitted to Mailchimp.',
        simulated: false,
      };
    }

    if (response.status === 400) {
      const payload = (await response.json().catch(() => null)) as { title?: string } | null;
      if (payload?.title === 'Member Exists') {
        return {
          status: 'already_subscribed',
          message: 'This email is already subscribed in Mailchimp.',
          simulated: false,
        };
      }
    }

    this.logger.warn({ provider: 'mailchimp', status: response.status }, 'mailchimp subscription failed');
    throw upstreamError(`Mailchimp responded with HTTP ${response.status}`);
  }
}
