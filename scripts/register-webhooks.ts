/**
 * Shopify webhook subscription helper.
 *
 * DRY-RUN BY DEFAULT. It only calls Shopify when BOTH:
 *   - you pass --apply
 *   - SHOPIFY_WEBHOOKS_APPLY=true is set in the environment
 *
 * Do NOT run against production without the owner's approval.
 */
import { loadConfig } from '../src/config/env';

const TOPIC_ENUM: Record<string, string> = {
  'orders/create': 'ORDERS_CREATE',
  'orders/updated': 'ORDERS_UPDATED',
  'orders/fulfilled': 'ORDERS_FULFILLED',
  'fulfillments/create': 'FULFILLMENTS_CREATE',
  'products/update': 'PRODUCTS_UPDATE',
  'inventory_levels/update': 'INVENTORY_LEVELS_UPDATE',
  'app/uninstalled': 'APP_UNINSTALLED',
};

interface WebhookSubscriptionNode {
  id: string;
  topic: string;
  endpoint: { __typename: string; callbackUrl?: string };
}

async function adminGraphql(
  storeDomain: string,
  apiVersion: string,
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<unknown> {
  const response = await fetch(`https://${storeDomain}/admin/api/${apiVersion}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = (await response.json()) as {
    data?: unknown;
    errors?: Array<{ message: string }>;
  };
  if (!response.ok || payload.errors?.length) {
    throw new Error(
      payload.errors?.map((error) => error.message).join('; ') ?? `HTTP ${response.status}`,
    );
  }
  return payload.data;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const applyRequested = process.argv.includes('--apply');
  const apply = applyRequested && config.webhooks.apply;

  const callbackUrl = config.webhooks.publicBaseUrl
    ? `${config.webhooks.publicBaseUrl}/webhooks/shopify`
    : null;

  console.log('BeNa Origins â€” Shopify webhook registration');
  console.log('==========================================');
  console.log(`Mode            : ${apply ? 'APPLY (will call Shopify)' : 'DRY-RUN (no calls)'}`);
  console.log(`Store domain    : ${config.shopify.storeDomain ?? 'MISSING'}`);
  console.log(`Admin API       : ${config.webhooks.adminApiVersion}`);
  console.log(`Callback URL    : ${callbackUrl ?? 'MISSING (PUBLIC_WEBHOOK_BASE_URL)'}`);
  console.log(`Admin token     : ${config.webhooks.adminAccessToken ? 'present (redacted)' : 'MISSING'}`);
  console.log(`HMAC secret     : ${config.webhooks.secret ? 'present (redacted)' : 'MISSING'}`);
  console.log(`Topics          : ${config.webhooks.topics.join(', ') || '(none configured)'}`);
  console.log('');

  const topics = config.webhooks.topics.map((topic) => topic.toLowerCase());
  const unknown = topics.filter((topic) => !TOPIC_ENUM[topic]);
  if (unknown.length > 0) {
    console.error(`Unsupported topic(s): ${unknown.join(', ')}`);
    process.exit(1);
  }

  const missing: string[] = [];
  if (!config.shopify.storeDomain) missing.push('SHOPIFY_STORE_DOMAIN');
  if (!callbackUrl) missing.push('PUBLIC_WEBHOOK_BASE_URL (public HTTPS URL)');
  if (!config.webhooks.secret) missing.push('SHOPIFY_WEBHOOK_SECRET');
  if (!config.webhooks.adminAccessToken) missing.push('SHOPIFY_ADMIN_API_ACCESS_TOKEN');

  if (missing.length > 0) {
    console.log('Missing configuration:');
    for (const item of missing) console.log(`  - ${item}`);
    console.log('');
    console.log('Dry-run payloads that would be sent:');
    for (const topic of topics) {
      console.log(
        JSON.stringify({
          mutation: 'webhookSubscriptionCreate',
          variables: {
            topic: TOPIC_ENUM[topic],
            webhookSubscription: { callbackUrl, format: 'JSON' },
          },
        }),
      );
    }
    console.log('');
    console.log('Nothing was changed. Add the missing values and re-run with --apply when approved.');
    return;
  }

  const listQuery = `#graphql
    query WebhookSubscriptions {
      webhookSubscriptions(first: 50) {
        edges {
          node {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint { callbackUrl }
            }
          }
        }
      }
    }
  `;

  if (!apply) {
    console.log('Existing subscriptions (read-only lookup) would be checked before creating.');
    console.log('Dry-run complete. No Shopify calls were made.');
    console.log('To apply (ONLY with owner approval): --apply with SHOPIFY_WEBHOOKS_APPLY=true');
    return;
  }

  const existingData = (await adminGraphql(
    config.shopify.storeDomain!,
    config.webhooks.adminApiVersion,
    config.webhooks.adminAccessToken!,
    listQuery,
  )) as {
    webhookSubscriptions: { edges: Array<{ node: WebhookSubscriptionNode }> };
  };

  const existing = existingData.webhookSubscriptions.edges.map((edge) => edge.node);
  const createMutation = `#graphql
    mutation CreateWebhook($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
      webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
        webhookSubscription { id topic }
        userErrors { field message }
      }
    }
  `;

  for (const topic of topics) {
    const enumTopic = TOPIC_ENUM[topic]!;
    const already = existing.find(
      (node) => node.topic === enumTopic && node.endpoint.callbackUrl === callbackUrl,
    );
    if (already) {
      console.log(`skip  ${topic} (already subscribed: ${already.id})`);
      continue;
    }

    const result = (await adminGraphql(
      config.shopify.storeDomain!,
      config.webhooks.adminApiVersion,
      config.webhooks.adminAccessToken!,
      createMutation,
      {
        topic: enumTopic,
        webhookSubscription: { callbackUrl, format: 'JSON' },
      },
    )) as {
      webhookSubscriptionCreate: {
        webhookSubscription: { id: string } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    };

    const errors = result.webhookSubscriptionCreate.userErrors;
    if (errors.length > 0) {
      console.error(`error ${topic}: ${errors.map((error) => error.message).join('; ')}`);
    } else {
      console.log(`created ${topic} -> ${result.webhookSubscriptionCreate.webhookSubscription?.id}`);
    }
  }
}

void main().catch((error: unknown) => {
  console.error('Webhook registration failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});


