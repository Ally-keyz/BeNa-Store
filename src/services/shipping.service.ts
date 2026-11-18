import type { AppConfig } from '../config/env';
import type { CommerceClient, MarketContext } from '../types/domain';
import type { ShippingFinding, ShippingInfo } from '../types/audit';
import { notFound } from '../utils/errors';
import {
  extractEuroAmounts,
  sentenceContaining,
  stripHtml,
} from '../utils/html';

const WORLDWIDE_THRESHOLD = 150;

/**
 * Shipping information derived from Shopify policies + localization/markets.
 *
 * The Storefront API does not expose a standalone shipping-rate table. Exact
 * rates require a cart with buyer identity (cart.deliveryGroups), which this
 * endpoint supports optionally via ?cartId=.
 */
export class ShippingService {
  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
  ) {}

  async get(
    params: { country?: string; language?: string; cartId?: string },
  ): Promise<ShippingInfo> {
    const ctx: MarketContext = { country: params.country, language: params.language };
    const [localization, bundle] = await Promise.all([
      this.client.getLocalization(ctx),
      this.client.getPolicies(),
    ]);

    const shippingPolicy = bundle.policies.shipping;
    const policyText = stripHtml(shippingPolicy?.body ?? '');
    const euroAmounts = extractEuroAmounts(policyText);
    const hasTable = /<table/i.test(shippingPolicy?.body ?? '');
    const hasPerCountryRate = /(germany|deutschland|\bEU\b|europe|international)[^\n€]{0,60}(€|EUR)/i.test(
      policyText,
    );
    const hasUsableRateTable =
      hasTable || (euroAmounts.length >= 3 && hasPerCountryRate);

    const worldwideClaimText = /(worldwide|weltweit|world-wide)/i.exec(policyText);
    const worldwide = this.config.shipping.worldwideClaim || Boolean(worldwideClaimText);
    const claimEvidence = worldwideClaimText
      ? sentenceContaining(policyText, worldwideClaimText[0]) ?? worldwideClaimText[0]
      : this.config.shipping.worldwideClaim
        ? 'SHIPPING_WORLDWIDE_CLAIM=true (configuration assumption)'
        : null;

    const available = localization.availableCountries.map((country) => ({
      isoCode: country.isoCode,
      name: country.name,
      currency: country.currency.isoCode,
    }));
    const availableCodes = new Set(available.map((country) => country.isoCode));
    const advertised = this.config.shipping.advertisedCountries;

    const advertisedButUnavailable = advertised.filter((code) => !availableCodes.has(code));
    const availableButNotAdvertised = available
      .map((country) => country.isoCode)
      .filter((code) => !advertised.includes(code));

    const mismatch = worldwide && available.length < WORLDWIDE_THRESHOLD;

    const findings: ShippingFinding[] = [];

    if (!shippingPolicy) {
      findings.push({
        code: 'SHIPPING_POLICY_MISSING',
        severity: 'high',
        message: 'No shipping policy is published in Shopify.',
        evidence: [],
        auditRef: '#8',
      });
    }

    if (mismatch) {
      findings.push({
        code: 'WORLDWIDE_CLAIM_MISMATCH',
        severity: 'high',
        message: `Shipping is described as worldwide, but Shopify exposes only ${available.length} purchasable countries/regions.`,
        evidence: [
          claimEvidence ?? 'Worldwide claim assumed from configuration',
          `Available: ${available.map((country) => country.isoCode).join(', ') || 'none'}`,
          advertisedButUnavailable.length > 0
            ? `Advertised but unavailable: ${advertisedButUnavailable.join(', ')}`
            : 'No advertised country is missing (country list itself is limited).',
        ],
        auditRef: '#7',
      });
    }

    if (advertisedButUnavailable.length > 0) {
      findings.push({
        code: 'ADVERTISED_COUNTRY_UNAVAILABLE',
        severity: 'medium',
        message: 'The region selector/advertised list includes countries that Shopify does not expose as purchasable.',
        evidence: [advertisedButUnavailable.join(', ')],
        auditRef: '#7',
      });
    }

    if (!hasUsableRateTable) {
      findings.push({
        code: 'MISSING_RATE_GUIDANCE',
        severity: 'medium',
        message:
          'The shipping policy does not provide a usable public rate table or explanatory examples for international shipping.',
        evidence: [
          euroAmounts.length > 0
            ? `Detected amounts: ${euroAmounts.join(', ')}`
            : 'No euro amounts detected in the shipping policy.',
          hasPerCountryRate
            ? 'At most one country-specific amount detected.'
            : 'No country-specific rate lines detected.',
        ],
        auditRef: '#8',
      });
    }

    let cartEstimate: ShippingInfo['cartEstimate'] = null;
    if (params.cartId) {
      const cart = await this.client.getCart(params.cartId);
      if (!cart) throw notFound('Cart', params.cartId);
      cartEstimate = {
        cartId: cart.id,
        countryCode: cart.buyerIdentity.countryCode,
        deliveryGroups: cart.deliveryGroups.map((group) => ({
          id: group.id,
          groupType: group.groupType,
          options: group.deliveryOptions.map((option) => ({
            title: option.title,
            amount: option.estimatedCost.amount,
            currencyCode: option.estimatedCost.currencyCode,
            method: option.deliveryMethodType,
          })),
        })),
      };
      if (cartEstimate.deliveryGroups.length === 0) {
        findings.push({
          code: 'CART_HAS_NO_DELIVERY_OPTIONS',
          severity: 'info',
          message:
            'The cart has no delivery options yet. Set the buyer identity (country/address) to obtain Shopify shipping estimates.',
          evidence: [],
          auditRef: '#8',
        });
      }
    }

    const limitations = [
      'Storefront API exposes no standalone shipping-rate table. Exact rates require a cart with buyer identity (cart.deliveryGroups.deliveryOptions).',
      'Carrier-calculated rates require cart.deliveryGroups(withCarrierRates: true) + @defer and are not enabled in this phase.',
      'Market handles are not exposed by the Storefront API; countries/currencies are derived from localization.availableCountries. Full market configuration requires Admin API read_markets.',
      'Legal shipping-claim decisions require human review; this endpoint reports observations only.',
    ];
    if (this.config.shopify.useFixtures) {
      limitations.push('FIXTURE MODE: shipping policy and markets are mocked.');
    }

    return {
      policy: shippingPolicy
        ? {
            title: shippingPolicy.title,
            url: shippingPolicy.url,
            summary: policyText.slice(0, 600),
            euroAmounts,
          }
        : null,
      markets: {
        availableCountries: available,
        advertisedCountries: advertised,
        advertisedButUnavailable,
        availableButNotAdvertised,
      },
      claims: { worldwide, evidence: claimEvidence, mismatch },
      guidance: {
        hasUsableRateTable,
        rateExamples: euroAmounts,
        gaps: hasUsableRateTable
          ? []
          : ['No usable public rate table', 'International weight-based pricing is not explained'],
      },
      cartEstimate,
      findings,
      limitations,
      generatedAt: new Date().toISOString(),
    };
  }
}
