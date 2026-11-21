import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { AppConfig } from '../config/env';
import type {
  CommerceClient,
  ProductReview,
  ProductReviewsResult,
  ReviewProviderAssessment,
  ReviewSubmission,
  ReviewSubmissionResult,
} from '../types/domain';
import { truncate } from '../utils/html';
import { createReviewStore, type ReviewStore } from './reviewStore';

const providerReviewSchema = z.object({
  id: z.union([z.string(), z.number()]),
  author: z.string().min(1).max(160),
  rating: z.coerce.number().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(4000).optional(),
  text: z.string().max(4000).optional(),
  comment: z.string().max(4000).optional(),
  createdAt: z.string().max(80).optional(),
  date: z.string().max(80).optional(),
  verifiedPurchase: z.boolean().optional(),
});

const providerPayloadSchema = z.object({
  source: z.string().max(120).optional(),
  reviews: z.array(providerReviewSchema).max(100).default([]),
});

interface ProviderSignature {
  key: string;
  label: string;
  tokens: string[];
}

const SIGNATURES: ProviderSignature[] = [
  { key: 'judge_me', label: 'Judge.me', tokens: ['judge.me', 'judgeme', 'jdgm-'] },
  { key: 'loox', label: 'Loox', tokens: ['loox.io', 'loox.app', 'loox-rating'] },
  { key: 'stamped', label: 'Stamped.io', tokens: ['stamped.io', 'stamped-main-widget'] },
  { key: 'yotpo', label: 'Yotpo', tokens: ['yotpo.com', 'yotpo-widget'] },
  { key: 'okendo', label: 'Okendo', tokens: ['okendo.io', 'okendo-widget'] },
  {
    key: 'shopify_product_reviews',
    label: 'Shopify Product Reviews (legacy)',
    tokens: ['shopify-product-reviews', 'spr-container', 'spr-header'],
  },
];

const INTEGRATIONS: Record<
  string,
  { approach: string; credentials: string[]; notes: string[] }
> = {
  judge_me: {
    approach:
      'Use Judge.me’s REST API for rating aggregates and load their storefront widget script for the review UI; keep Shopify as commerce source of truth.',
    credentials: ['JUDGE_ME_SHOP_DOMAIN (e.g. benaorigins.de)', 'JUDGE_ME_API_TOKEN (private API token)'],
    notes: [
      'Widgets are rendered by Judge.me JavaScript; a headless React page must mount the widget container and call their public initialiser.',
      'Review data must not be copied into a product database; cache briefly server-side.',
    ],
  },
  loox: {
    approach: 'Loox API for review aggregates; Loox photo widgets on product pages.',
    credentials: ['LOOX_API_TOKEN', 'LOOX_STORE_ID'],
    notes: ['Confirm the plan includes API access; Loox widget requires their script on the storefront domain.'],
  },
  stamped: {
    approach: 'Stamped API for reviews; widget embed for star ratings and review lists.',
    credentials: ['STAMPED_PUBLIC_KEY', 'STAMPED_STORE_HASH'],
    notes: ['Stamped supports headless storefronts via their JS widget API.'],
  },
  yotpo: {
    approach: 'Yotpo reviews API for aggregates + Yotpo widget script.',
    credentials: ['YOTPO_APP_KEY', 'YOTPO_SECRET (only for server-side writes)'],
    notes: ['Yotpo’s free plan has limited API access; verify entitlements.'],
  },
  okendo: {
    approach: 'Okendo API for review aggregates; Okendo widget for the review UI.',
    credentials: ['OKENDO_SUBSCRIBER_ID', 'OKENDO_API_KEY'],
    notes: ['Okendo is Shopify-focused and supports headless via widget API.'],
  },
  shopify_product_reviews: {
    approach:
      'Legacy Shopify Product Reviews app cannot be used as a headless API. Migrate reviews to Judge.me/Loox/Okendo before launch.',
    credentials: [],
    notes: ['Do not scrape theme HTML for review content; export/migrate instead.'],
  },
  none: {
    approach: 'No reviews app detected. Decide whether reviews are in scope; if yes, install a provider with an API.',
    credentials: [],
    notes: ['Audit #19: social proof is not prominent; genuine reviews should be surfaced only when available.'],
  },
};

const ALTERNATIVES = [
  { provider: 'Judge.me', requires: 'API token + widget script', widgetsSupportStorefrontApi: 'Yes (widgets + REST API)' },
  { provider: 'Loox', requires: 'API token + widget script', widgetsSupportStorefrontApi: 'Yes (widgets + API)' },
  { provider: 'Okendo', requires: 'Subscriber ID + API key', widgetsSupportStorefrontApi: 'Yes (widgets + API)' },
  { provider: 'Stamped.io', requires: 'Public key + store hash', widgetsSupportStorefrontApi: 'Yes (widgets + API)' },
  { provider: 'Shopify Product Reviews', requires: 'Legacy app (deprecated for headless)', widgetsSupportStorefrontApi: 'No — migrate' },
];

/**
 * Reviews integration ASSESSMENT only. This intentionally does not scrape
 * review content and does not build review UI.
 */
export class ReviewsService {
  private readonly productCache = new Map<string, { expiresAt: number; value: ProductReviewsResult }>();

  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly store: ReviewStore = createReviewStore(),
  ) {}

  /**
   * Reads genuine reviews from a configured provider feed. Returns an empty,
   * explicitly labelled result when no feed is configured — never fake data.
   */
  async forProduct(
    handle: string,
    options: { refresh?: boolean } = {},
  ): Promise<ProductReviewsResult> {
    const checkedAt = new Date().toISOString();
    const submitted = await this.store.list(handle);
    const withSubmitted = (base: ProductReviewsResult): ProductReviewsResult => {
      if (submitted.length === 0) return base;
      const reviews = [...submitted, ...base.reviews].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const averageRating = Math.round(
        (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10,
      ) / 10;
      return {
        ...base,
        status: 'available',
        source: base.source ?? 'customer_reviews',
        reviews,
        summary: { count: reviews.length, averageRating },
        simulated: false,
        message:
          base.status === 'available'
            ? `${base.message} Includes customer-submitted reviews.`
            : 'Customer-submitted reviews for this product.',
        checkedAt,
      };
    };
    const empty = (status: ProductReviewsResult['status'], message: string, source: string | null = null) => ({
      handle,
      status,
      source,
      reviews: [] as ProductReview[],
      summary: { count: 0, averageRating: null },
      simulated: true,
      message,
      checkedAt,
    });

    const template = this.config.reviews.apiUrlTemplate;
    if (!template || this.config.reviews.provider === 'none') {
      return withSubmitted(
        empty(
          'not_configured',
          'No review feed is configured. Set REVIEWS_API_URL_TEMPLATE to surface genuine reviews.',
        ),
      );
    }

    const cacheKey = handle.toLowerCase();
    const cached = this.productCache.get(cacheKey);
    if (!options.refresh && cached && cached.expiresAt > Date.now()) {
      return withSubmitted(cached.value);
    }

    let url: URL;
    try {
      url = new URL(
        template
          .replaceAll('{handle}', encodeURIComponent(handle))
          .replaceAll('{HANDLE}', encodeURIComponent(handle)),
      );
      if (!/^https?:$/.test(url.protocol)) throw new Error('protocol');
    } catch {
      return withSubmitted(empty('unavailable', 'REVIEWS_API_URL_TEMPLATE is not a valid HTTP(S) URL.'));
    }

    try {
      const response = await this.fetchImpl(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'BeNaOriginsBackend/0.1 (reviews; read-only)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        return withSubmitted(empty('unavailable', `Review feed responded with HTTP ${response.status}.`));
      }
      const parsed = providerPayloadSchema.parse(await response.json());
      const reviews: ProductReview[] = parsed.reviews.map((review) => ({
        id: String(review.id),
        author: review.author,
        rating: Math.round(review.rating * 10) / 10,
        title: review.title,
        body: review.body ?? review.text ?? review.comment ?? '',
        createdAt: review.createdAt ?? review.date ?? checkedAt,
        verifiedPurchase: review.verifiedPurchase,
      }));
      const averageRating = reviews.length
        ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
        : null;
      const value: ProductReviewsResult = {
        handle,
        status: 'available',
        source: parsed.source ?? url.origin,
        reviews,
        summary: { count: reviews.length, averageRating },
        simulated: false,
        message:
          reviews.length === 0
            ? 'The configured review feed returned no reviews for this product.'
            : 'Genuine reviews from the configured provider feed.',
        checkedAt,
      };
      if (this.config.reviews.cacheTtlSeconds > 0) {
        this.productCache.set(cacheKey, {
          expiresAt: Date.now() + this.config.reviews.cacheTtlSeconds * 1000,
          value,
        });
      }
      return withSubmitted(value);
    } catch (error) {
      this.logger.warn(
        { handle, error: error instanceof Error ? error.message : 'unknown' },
        'review feed read failed',
      );
      return withSubmitted(empty('unavailable', 'The configured review feed could not be read.'));
    }
  }

  /** Accepts a public review, stores it, and emails a copy to the store owner. */
  async submit(handle: string, input: ReviewSubmission): Promise<ReviewSubmissionResult> {
    const receivedAt = new Date().toISOString();
    const review: ProductReview = {
      id: randomUUID(),
      author: input.author.trim(),
      rating: input.rating,
      body: input.body.trim(),
      createdAt: receivedAt,
      verifiedPurchase: false,
    };

    await this.store.add(handle, review);
    this.productCache.delete(handle.toLowerCase());

    const notification = await this.notifyOwner(handle, review, input.language);
    const simulated = notification.simulated;
    this.logger.info(
      {
        handle,
        reviewId: review.id,
        store: this.store.kind,
        notification: notification.provider,
        delivered: notification.delivered,
      },
      'customer review submitted',
    );

    return {
      handle,
      reference: review.id,
      review,
      status: simulated ? 'simulated' : 'received',
      provider: notification.provider,
      receivedAt,
      notification,
      message: simulated
        ? 'Thank you. Your review is published; the owner notification is simulated.'
        : 'Thank you. Your review is published and the store owner has been notified.',
      simulated,
    };
  }

  private async notifyOwner(
    handle: string,
    review: ProductReview,
    language?: string,
  ): Promise<ReviewSubmissionResult['notification']> {
    const apiKey = this.config.restock.resendApiKey;
    const from = this.config.restock.fromEmail;
    const provider = this.config.restock.provider;
    if (provider !== 'resend' || !apiKey || !from) {
      return {
        provider: 'mock',
        delivered: false,
        simulated: true,
        message: 'Owner email is simulated; configure RESTOCK_PROVIDER=resend with Resend credentials.',
      };
    }

    const to = this.config.reviews.notificationEmail;
    const productUrl = `${this.config.siteUrl.replace(/\/+$/, '')}/products/${encodeURIComponent(handle)}`;
    const heading = language === 'DE' ? 'Neue Produktbewertung' : language === 'FR' ? 'Nouvel avis produit' : 'New product review';
    const subject = `${heading}: ${handle} — ${review.rating}/5`;
    const lines = [
      heading,
      '',
      `Product: ${productUrl}`,
      `Author: ${review.author}`,
      `Rating: ${review.rating}/5`,
      '',
      review.body,
      '',
      `Review ID: ${review.id}`,
      `Submitted: ${review.createdAt}`,
    ];
    const html = [
      `<h2>${escapeHtml(heading)}</h2>`,
      `<p><a href="${escapeHtml(productUrl)}">${escapeHtml(handle)}</a></p>`,
      `<p><strong>${escapeHtml(review.author)}</strong> · ${review.rating}/5</p>`,
      `<p>${escapeHtml(review.body).replace(/\n/g, '<br />')}</p>`,
      `<p><small>Review ID: ${escapeHtml(review.id)} · ${escapeHtml(review.createdAt)}</small></p>`,
    ].join('');

    try {
      const response = await this.fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text: lines.join('\n'),
          html,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new Error(`Resend responded with HTTP ${response.status}`);
      }
      return {
        provider: 'resend',
        delivered: true,
        simulated: false,
        message: `Owner notified at ${to}.`,
      };
    } catch (error) {
      this.logger.warn(
        { handle, reviewId: review.id, error: error instanceof Error ? error.message : 'unknown' },
        'review owner notification failed',
      );
      return {
        provider: 'resend',
        delivered: false,
        simulated: true,
        message: 'The review was saved, but the owner notification could not be delivered.',
      };
    }
  }

  async assess(): Promise<ReviewProviderAssessment> {
    const override = this.config.reviews.provider;
    if (override !== 'auto') {
      const label = SIGNATURES.find((signature) => signature.key === override)?.label ??
        (override === 'none' ? 'None' : override);
      return this.buildAssessment({
        providerKey: override,
        providerLabel: label,
        detection: 'config_override',
        confidence: 'medium',
        evidence: [`REVIEWS_PROVIDER=${override} is set in the environment.`],
        installedSignals: [],
      });
    }

    const urls = await this.detectionUrls();
    const evidence: string[] = [];
    const matches = new Map<string, string[]>();

    for (const url of urls) {
      let html: string;
      try {
        const response = await this.fetchImpl(url, {
          headers: {
            'User-Agent': 'BeNaOriginsBackend/0.1 (reviews assessment; read-only)',
            Accept: 'text/html',
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
          evidence.push(`${url}: HTTP ${response.status}`);
          continue;
        }
        html = (await response.text()).slice(0, 400_000).toLowerCase();
      } catch (error) {
        evidence.push(`${url}: fetch failed (${error instanceof Error ? error.message : 'unknown'})`);
        continue;
      }

      for (const signature of SIGNATURES) {
        const found = signature.tokens.filter((token) => html.includes(token.toLowerCase()));
        if (found.length > 0) {
          const existing = matches.get(signature.key) ?? [];
          matches.set(signature.key, [...new Set([...existing, ...found])]);
          evidence.push(`${url}: ${signature.label} signature(s) ${found.join(', ')}`);
        }
      }
    }

    if (matches.size === 0) {
      evidence.push(
        urls.length === 0
          ? 'No public pages could be resolved for signature detection.'
          : 'No review-app signatures found on the sampled public pages.',
      );
      return this.buildAssessment({
        providerKey: 'none',
        providerLabel: 'None detected',
        detection: urls.length === 0 ? 'none_detected' : 'public_page_signature',
        confidence: 'low',
        evidence,
        installedSignals: [],
      });
    }

    const [bestKey, signals] = [...matches.entries()].sort((a, b) => b[1].length - a[1].length)[0]!;
    const label = SIGNATURES.find((signature) => signature.key === bestKey)?.label ?? bestKey;
    const confidence = signals.length >= 2 ? 'high' : 'medium';

    this.logger.info({ provider: bestKey, confidence }, 'reviews provider signature detected');

    return this.buildAssessment({
      providerKey: bestKey,
      providerLabel: label,
      detection: 'public_page_signature',
      confidence,
      evidence,
      installedSignals: signals,
    });
  }

  private async detectionUrls(): Promise<string[]> {
    const urls = new Set<string>();
    const base = this.config.siteUrl;
    urls.add(base);
    try {
      const page = await this.client.listProducts({ first: 1, sortKey: 'BEST_SELLING', reverse: false });
      const product = page.items[0];
      if (product) {
        urls.add(`${base}/products/${product.handle}`);
      }
    } catch {
      // Detection can still proceed with the home page.
    }
    return [...urls];
  }

  private buildAssessment(input: {
    providerKey: string;
    providerLabel: string;
    detection: ReviewProviderAssessment['detection'];
    confidence: ReviewProviderAssessment['confidence'];
    evidence: string[];
    installedSignals: string[];
  }): ReviewProviderAssessment {
    const integration = INTEGRATIONS[input.providerKey] ?? INTEGRATIONS.none!;
    return {
      detectedProvider: input.providerLabel,
      detection: input.detection,
      confidence: input.confidence,
      evidence: input.evidence.slice(0, 12).map((entry) => truncate(entry, 220)),
      installedSignals: input.installedSignals,
      status:
        input.detection === 'public_page_signature' && input.confidence === 'high'
          ? 'VERIFIED'
          : 'UNVERIFIED — needs admin confirmation',
      integration: {
        recommendedApproach: integration.approach,
        requiredCredentials: integration.credentials,
        endpointsToAddLater: [
          'GET /api/v1/reviews/summary — catalog-level rating coverage',
        ],
        notes: [
          ...integration.notes,
          'Detection cannot prove reviews are active, published or genuine. Confirm in Shopify Admin > Apps and sales channels.',
          'Product reviews are read from REVIEWS_API_URL_TEMPLATE; no ratings are invented.',
        ],
      },
      alternatives: ALTERNATIVES,
      checkedAt: new Date().toISOString(),
      dataSource: this.client.mode,
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
