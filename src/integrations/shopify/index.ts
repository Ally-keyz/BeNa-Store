import type { AppConfig } from '../../config/env';
import type { CommerceClient } from '../../types/domain';
import type { Logger } from 'pino';
import { FixtureCommerceClient } from './fixtureClient';
import { StorefrontCommerceClient } from './storefrontClient';

export interface CommerceClientSetup {
  client: CommerceClient;
  dataSource: 'shopify' | 'fixture';
  reason: string;
}

/**
 * Select the commerce client. Fixture mode is explicit and visible in every
 * response (`meta.dataSource`) so mocks can never be mistaken for live data.
 */
export function createCommerceClient(config: AppConfig, logger: Logger): CommerceClientSetup {
  if (config.shopify.useFixtures) {
    const reason =
      config.shopify.mockMode === 'true'
        ? 'SHOPIFY_MOCK_MODE=true'
        : 'SHOPIFY_MOCK_MODE=auto and no Storefront credentials configured';
    logger.warn({ reason }, 'Running in FIXTURE mode — responses are mocks, not live Shopify data');
    return { client: new FixtureCommerceClient(), dataSource: 'fixture', reason };
  }

  if (!config.shopify.storeDomain) {
    throw new Error('Live mode requires SHOPIFY_STORE_DOMAIN');
  }

  return {
    client: new StorefrontCommerceClient({
      storeDomain: config.shopify.storeDomain,
      apiVersion: config.shopify.apiVersion,
      privateToken: config.shopify.privateToken,
      publicToken: config.shopify.publicToken,
      siteUrl: config.siteUrl,
      metafields: config.metafields,
      logger,
    }),
    dataSource: 'shopify',
    reason: 'live Storefront API',
  };
}

export { FixtureCommerceClient, StorefrontCommerceClient };
export { ShopifyGraphqlError } from './graphqlClient';
