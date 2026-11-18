/**
 * Read-only live smoke test. No cart mutations, no order creation.
 * In fixture mode it clearly reports that nothing live was tested.
 */
import { loadConfig } from '../src/config/env';
import { createLogger } from '../src/utils/logger';
import { createCommerceClient } from '../src/integrations/shopify';
import { ProductsService } from '../src/services/catalog.service';
import { PoliciesService } from '../src/services/policies.service';
import { ShippingService } from '../src/services/shipping.service';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ ...config, logLevel: 'silent' });
  const { client, dataSource } = createCommerceClient(config, logger);

  if (dataSource === 'fixture') {
    console.log('FIXTURE MODE â€” no live Shopify calls were made.');
    console.log('Set SHOPIFY_STORE_DOMAIN + SHOPIFY_STOREFRONT_PRIVATE_TOKEN and SHOPIFY_MOCK_MODE=false.');
    return;
  }

  console.log(`Live smoke test against ${config.shopify.storeDomain} (Storefront ${config.shopify.apiVersion})`);
  const productsService = new ProductsService(client, config);

  const ping = await client.ping();
  console.log(`- shopify ping: ${ping.ok ? 'OK' : 'FAILED'} (${ping.latencyMs}ms) ${ping.detail ?? ''}`);

  try {
    const products = await productsService.list({ first: 3, sortKey: 'TITLE', reverse: false });
    console.log(`- products: OK (${products.items.length} returned, next=${products.pageInfo.hasNextPage})`);
    const first = products.items[0];
    if (first) {
      const detail = await productsService.byHandle(first.handle);
      console.log(`- product detail: OK (${detail.handle}, ${detail.variants.length} variants)`);
      console.log(
        `- metafields: ${client.capabilities.metafields ? `available (nutrition=${Boolean(detail.metafields.nutrition)})` : 'UNAVAILABLE (no token)'}`,
      );
    }
  } catch (error) {
    console.log(`- products: FAILED â€” ${error instanceof Error ? error.message : 'unknown'}`);
  }

  try {
    const collections = await client.listCollections({ first: 3 });
    console.log(`- collections: OK (${collections.items.length} returned)`);
  } catch (error) {
    console.log(`- collections: FAILED â€” ${error instanceof Error ? error.message : 'unknown'}`);
  }

  try {
    const localization = await client.getLocalization({ country: 'DE', language: 'EN' });
    console.log(`- localization: OK (${localization.availableCountries.length} countries)`);
  } catch (error) {
    console.log(`- localization: FAILED â€” ${error instanceof Error ? error.message : 'unknown'}`);
  }

  try {
    const policies = await new PoliciesService(client).get();
    const present = Object.entries(policies.policies)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key);
    console.log(`- policies: OK (${present.join(', ') || 'none'})`);
  } catch (error) {
    console.log(`- policies: FAILED â€” ${error instanceof Error ? error.message : 'unknown'}`);
  }

  try {
    const shipping = await new ShippingService(client, config).get({ country: 'DE' });
    console.log(
      `- shipping: OK (worldwideClaim=${shipping.claims.worldwide}, mismatch=${shipping.claims.mismatch}, rateTable=${shipping.guidance.hasUsableRateTable})`,
    );
  } catch (error) {
    console.log(`- shipping: FAILED â€” ${error instanceof Error ? error.message : 'unknown'}`);
  }
}

void main().catch((error: unknown) => {
  console.error('Smoke test error:', error instanceof Error ? error.message : error);
  process.exit(1);
});


