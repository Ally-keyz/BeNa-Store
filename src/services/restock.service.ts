import { createHmac } from 'node:crypto';
import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type {
  CommerceClient,
  Product,
  RestockNotificationResult,
  RestockSignupResult,
} from '../types/domain';
import { badRequest, notConfigured, upstreamError } from '../utils/errors';
import type { RestockSignupRecord, RestockStore } from './restockStore';

export interface RestockSubscribeInput {
  email: string;
  productHandle: string;
  country?: string;
  language?: string;
  consent: boolean;
}

interface DeliveryResult {
  simulated: boolean;
}

/**
 * Product-specific back-in-stock alerts.
 *
 * Signups are persisted by RestockStore. Shopify's `products/update` webhook
 * re-fetches the product from the commerce client, verifies real availability,
 * and delivers each pending alert through the configured provider.
 */
export class RestockService {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly client: CommerceClient,
    private readonly store: RestockStore,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async subscribe(input: RestockSubscribeInput): Promise<RestockSignupResult> {
    if (!input.consent) {
      throw badRequest('Explicit consent is required for restock notifications');
    }

    const email = input.email.trim().toLowerCase();
    const { status, record } = await this.store.add({
      email,
      productHandle: input.productHandle,
      country: input.country ?? null,
      language: input.language ?? null,
      registeredAt: new Date().toISOString(),
    });

    const provider = this.config.restock.provider;
    const simulated = provider === 'mock';
    this.logger.info(
      {
        productHandle: input.productHandle,
        status,
        provider,
        store: this.store.kind,
        signupId: record.id,
      },
      'restock signup recorded',
    );

    return {
      email,
      productHandle: input.productHandle,
      status,
      provider,
      store: this.store.kind,
      simulated,
      registeredAt: record.registeredAt,
      message: simulated
        ? 'Saved. Restock alerts are simulated while RESTOCK_PROVIDER=mock.'
        : "Saved. We'll let you know as soon as this product is back.",
    };
  }

  /**
   * Called from the Shopify products/update webhook. Returns null when nobody
   * is waiting for this product (the common case), so no extra API call is made.
   */
  async notifyIfRestocked(productHandle: string): Promise<RestockNotificationResult | null> {
    if (this.inFlight.has(productHandle)) return null;
    const pending = await this.store.listPending(productHandle);
    if (pending.length === 0) return null;

    this.inFlight.add(productHandle);
    try {
      const product = await this.client.getProductByHandle(productHandle);
      const available = product ? isProductAvailable(product) : false;
      const simulated = this.config.restock.provider === 'mock';

      if (!product || !available) {
        this.logger.info(
          { productHandle, pending: pending.length, found: Boolean(product) },
          'restock check skipped: product is not available',
        );
        return { productHandle, available, notified: 0, failed: 0, simulated };
      }

      let notified = 0;
      let failed = 0;
      for (const signup of pending) {
        try {
          await this.deliver(signup, product);
          await this.store.markNotified(productHandle, signup.id);
          notified += 1;
        } catch (error) {
          failed += 1;
          this.logger.error(
            {
              productHandle,
              signupId: signup.id,
              provider: this.config.restock.provider,
              err: error instanceof Error ? { message: error.message } : 'unknown',
            },
            'restock alert delivery failed; signup stays pending for retry',
          );
        }
      }

      this.logger.info(
        { productHandle, notified, failed, simulated },
        'restock notifications processed',
      );
      return { productHandle, available: true, notified, failed, simulated };
    } finally {
      this.inFlight.delete(productHandle);
    }
  }

  pendingCount(productHandle: string): Promise<number> {
    return this.store.pendingCount(productHandle);
  }

  close(): Promise<void> {
    return this.store.close();
  }

  private async deliver(signup: RestockSignupRecord, product: Product): Promise<DeliveryResult> {
    switch (this.config.restock.provider) {
      case 'mock':
        return { simulated: true };

      case 'webhook':
        return this.webhookProvider(signup, product);

      case 'resend':
        return this.resendProvider(signup, product);
    }
  }

  private async webhookProvider(
    signup: RestockSignupRecord,
    product: Product,
  ): Promise<DeliveryResult> {
    const url = this.config.restock.webhookUrl;
    if (!url) throw notConfigured('RESTOCK_WEBHOOK_URL is required for RESTOCK_PROVIDER=webhook');

    const body = JSON.stringify({
      type: 'product.restock',
      product: {
        handle: product.handle,
        title: product.title,
        url: product.url,
      },
      recipient: {
        email: signup.email,
        country: signup.country,
        language: signup.language,
      },
      registeredAt: signup.registeredAt,
      notifiedAt: new Date().toISOString(),
    });
    const signature = this.config.restock.webhookSecret
      ? createHmac('sha256', this.config.restock.webhookSecret).update(body).digest('hex')
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
      throw upstreamError(`Restock webhook responded with HTTP ${response.status}`);
    }
    return { simulated: false };
  }

  private async resendProvider(
    signup: RestockSignupRecord,
    product: Product,
  ): Promise<DeliveryResult> {
    const apiKey = this.config.restock.resendApiKey;
    const from = this.config.restock.fromEmail;
    if (!apiKey || !from) {
      throw notConfigured(
        'RESTOCK_RESEND_API_KEY and RESTOCK_FROM_EMAIL are required for RESTOCK_PROVIDER=resend',
      );
    }

    const isGerman = signup.language === 'DE';
    const subject = isGerman
      ? `${product.title} ist wieder verfügbar`
      : `${product.title} is back in stock`;
    const text = isGerman
      ? `Gute Nachricht: ${product.title} ist wieder verfügbar.\n\nJetzt ansehen: ${product.url}\n\nDu erhältst diese Nachricht, weil du eine Benachrichtigung für dieses Produkt angefordert hast.`
      : `Good news: ${product.title} is back in stock.\n\nView it here: ${product.url}\n\nYou are receiving this because you requested a restock alert for this product.`;
    const html = `<p>${isGerman ? 'Gute Nachricht' : 'Good news'}: <strong>${escapeHtml(product.title)}</strong> ${isGerman ? 'ist wieder verfügbar.' : 'is back in stock.'}</p><p><a href="${escapeHtml(product.url)}">${isGerman ? 'Jetzt ansehen' : 'View it now'}</a></p><p><small>${isGerman ? 'Du erhältst diese Nachricht, weil du eine Benachrichtigung für dieses Produkt angefordert hast.' : 'You are receiving this because you requested a restock alert for this product.'}</small></p>`;

    const response = await this.fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [signup.email],
        reply_to: this.config.restock.replyToEmail ?? undefined,
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw upstreamError(`Restock email provider responded with HTTP ${response.status}`);
    }
    return { simulated: false };
  }
}

/** Mirrors frontend/src/lib/product.ts so alerts never fire for coming-soon items. */
function isProductAvailable(product: Product): boolean {
  const signalText = `${product.handle} ${product.title} ${product.tags.join(' ')}`;
  if (/coming[\s-]?soon/i.test(signalText)) return false;
  return product.availableForSale && product.variants.some((variant) => variant.availableForSale);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
