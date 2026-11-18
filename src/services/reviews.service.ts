import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type { CommerceClient, ReviewProviderAssessment } from '../types/domain';
import { truncate } from '../utils/html';

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
  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

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
          'GET /api/v1/reviews/product/:handle — aggregate rating + recent reviews',
          'GET /api/v1/reviews/summary — catalog-level rating coverage',
        ],
        notes: [
          ...integration.notes,
          'Detection cannot prove reviews are active, published or genuine. Confirm in Shopify Admin > Apps and sales channels.',
        ],
      },
      alternatives: ALTERNATIVES,
      checkedAt: new Date().toISOString(),
      dataSource: this.client.mode,
    };
  }
}
