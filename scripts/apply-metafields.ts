/**
 * BeNa Origins - ProductMetafields definitions and values (Admin GraphQL).
 *
 * USAGE (run from the repo root):
 *   npm run metafields:apply                         # DRY-RUN: print plan, zero Shopify writes
 *   npm run metafields:apply -- --output=path.json   # DRY-RUN: also write the plan to a file
 *   SHOPIFY_LIVE_APPLY=1 npm run metafields:apply -- --apply
 *
 * Live apply requires BOTH `--apply` AND `SHOPIFY_LIVE_APPLY=1`.
 *
 * Environment (same names as the existing scripts in `scripts/`):
 *   SHOPIFY_STORE_DOMAIN             e.g. shop.myshopify.com
 *   SHOPIFY_ADMIN_API_ACCESS_TOKEN   Admin API token; script fails clearly if absent
 *   SHOPIFY_ADMIN_API_VERSION        defaults to 2026-10
 *   SHOPIFY_LIVE_APPLY=1             additional live-apply guard
 *
 * Values come only from scripts/data/metafields.json. Every shipped value is a
 * placeholder marked `status: "placeholder"` and is skipped. Nothing is invented.
 * Definitions use namespace `custom`, keys nutrition/ingredients/allergens/
 * origin/preparation and Storefront access PUBLIC_READ.
 */
import type { ProductMetafields } from '../src/types/domain';
import {
  adminGraphql,
  assertAllowedArgs,
  defaultReportPath,
  errorMessage,
  fetchMetafieldDefinitions,
  fetchProducts,
  formatUserErrors,
  getAdminContext,
  parseArgs,
  positiveIntOption,
  readJsonFile,
  resolveGuard,
  writeJsonReport,
  type AdminContext,
  type AdminUserError,
  type GuardResult,
} from './lib/shopify-admin';

const DATA_FILE = 'scripts/data/metafields.json';
const NAMESPACE = 'custom';
const METAFIELD_TYPE = 'single_line_text_field';
const METAFIELD_KEYS = [
  'nutrition',
  'ingredients',
  'allergens',
  'origin',
  'preparation',
] as const satisfies readonly (keyof ProductMetafields)[];

const HELP = `BeNa Origins - apply food metafields (dry-run by default)

Usage:
  npm run metafields:apply
  npm run metafields:apply -- --output=scripts/data/reports/metafields.json
  SHOPIFY_LIVE_APPLY=1 npm run metafields:apply -- --apply --max-products=100

Required environment:
  SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_API_ACCESS_TOKEN
  Optional: SHOPIFY_ADMIN_API_VERSION (default 2026-10)
  Live apply also requires: SHOPIFY_LIVE_APPLY=1

Data file:
  scripts/data/metafields.json - placeholders are skipped until status is
  changed to "verified" and the value is replaced with owner-verified facts.
`;

interface MetafieldEntry {
  namespace: string;
  key: string;
  type: string;
  status: string;
  value: string;
}

interface VerifiedValue {
  handle: string;
  field: MetafieldEntry;
}

interface MetafieldsData {
  readme: string;
  verifiedValues: VerifiedValue[];
  skipped: Array<{ handle: string; key: string; reason: string; status: string }>;
  productHandles: string[];
}

interface Intent {
  id: string;
  kind: 'metafieldDefinition.ensure' | 'metafieldsSet.value';
  reason: string;
  mutation: string;
  variables: Record<string, unknown>;
  idempotency: string;
}

interface Skip {
  id: string;
  reason: string;
}

interface ApplyResult {
  id: string;
  status: 'applied' | 'skipped' | 'failed' | 'error';
  mutation: string;
  variables: Record<string, unknown>;
  detail: string;
}

interface MetafieldsReport {
  script: 'apply-metafields';
  generatedAt: string;
  mode: GuardResult['mode'];
  guards: {
    applyFlag: boolean;
    SHOPIFY_LIVE_APPLY: string;
    bothGuardsPresent: boolean;
  };
  environment: {
    storeDomain: string;
    adminApiVersion: string;
    adminToken: string;
  };
  dataFile: string;
  dataSummary: {
    productHandles: number;
    verifiedValues: number;
    skippedPlaceholders: number;
  };
  namespaces: { namespace: string; keys: string[]; storefrontAccess: 'PUBLIC_READ' };
  intents: Intent[];
  skipped: Skip[];
  warnings: string[];
  results?: ApplyResult[];
}

const CREATE_DEFINITION = `#graphql
  mutation Phase2CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id namespace key type { name } access { storefront } }
      userErrors { field message code }
    }
  }
`;

const UPDATE_DEFINITION_ACCESS = `#graphql
  mutation Phase2UpdateMetafieldDefinitionAccess($definition: MetafieldDefinitionUpdateInput!) {
    metafieldDefinitionUpdate(definition: $definition) {
      updatedDefinition { id namespace key type { name } access { storefront } }
      userErrors { field message code }
    }
  }
`;

const METAFIELDS_SET = `#graphql
  mutation Phase2SetMetafield($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key type value }
      userErrors { field message code }
    }
  }
`;

const DEFINITION_META: Record<(typeof METAFIELD_KEYS)[number], { name: string; description: string }> = {
  nutrition: {
    name: 'Nutrition',
    description: 'Owner-verified nutrition declaration. Do not publish unverified values.',
  },
  ingredients: {
    name: 'Ingredients',
    description: 'Owner-verified ingredient list. Do not publish unverified values.',
  },
  allergens: {
    name: 'Allergens',
    description: 'Owner-verified EU allergen declaration. Do not publish unverified values.',
  },
  origin: {
    name: 'Origin',
    description: 'Owner-verified country/region of origin. Do not publish unverified values.',
  },
  preparation: {
    name: 'Preparation',
    description: 'Owner-verified preparation instructions. Do not publish unverified values.',
  },
};

const PLACEHOLDER_PATTERN = /placeholder|owner-verified .* required|do not publish|TODO/i;
const UNRESOLVED_ID = (handle: string): string => `<gid://shopify/Product/FROM_HANDLE:${handle}>`;

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value);
}

function asMetafieldEntry(raw: unknown, handle: string, key: string): MetafieldEntry {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${DATA_FILE}: ${handle}.${key} must be an object`);
  }
  const entry = raw as Record<string, unknown>;
  const namespace = typeof entry.namespace === 'string' ? entry.namespace : '';
  const entryKey = typeof entry.key === 'string' ? entry.key : '';
  const type = typeof entry.type === 'string' ? entry.type : '';
  const status = typeof entry.status === 'string' ? entry.status : '';
  const value = typeof entry.value === 'string' ? entry.value : '';
  if (!namespace || !entryKey || !type || !value) {
    throw new Error(`${DATA_FILE}: ${handle}.${key} needs namespace, key, type and value strings`);
  }
  if (namespace !== NAMESPACE || entryKey !== key || type !== METAFIELD_TYPE) {
    throw new Error(
      `${DATA_FILE}: ${handle}.${key} must use namespace "${NAMESPACE}", key "${key}" and type "${METAFIELD_TYPE}"`,
    );
  }
  return { namespace, key: entryKey, type, status, value };
}

function loadData(): MetafieldsData {
  const raw = readJsonFile<Record<string, unknown>>(DATA_FILE);
  const readme = typeof raw._README === 'string' ? raw._README : '';
  if (!readme) throw new Error(`${DATA_FILE} must contain a string _README field`);

  const verifiedValues: VerifiedValue[] = [];
  const skipped: MetafieldsData['skipped'] = [];
  const productHandles: string[] = [];

  for (const [handle, rawProduct] of Object.entries(raw)) {
    if (handle.startsWith('_')) continue;
    productHandles.push(handle);
    if (!rawProduct || typeof rawProduct !== 'object') {
      throw new Error(`${DATA_FILE}: product "${handle}" must be an object`);
    }
    const product = rawProduct as Record<string, unknown>;
    for (const key of METAFIELD_KEYS) {
      if (!(key in product)) continue;
      const field = asMetafieldEntry(product[key], handle, key);
      if (field.status !== 'verified') {
        skipped.push({
          handle,
          key,
          reason: `status is "${field.status || '(missing)'}" - not owner-verified`,
          status: field.status,
        });
        continue;
      }
      if (isPlaceholder(field.value)) {
        skipped.push({
          handle,
          key,
          reason: 'value still contains a placeholder marker',
          status: field.status,
        });
        continue;
      }
      verifiedValues.push({ handle, field });
    }
  }

  if (productHandles.length === 0) {
    throw new Error(`${DATA_FILE} must contain at least one product handle key`);
  }
  return { readme, verifiedValues, skipped, productHandles };
}

function buildPlan(
  data: MetafieldsData,
  context: AdminContext,
  guard: GuardResult,
): MetafieldsReport {
  const intents: Intent[] = [];

  for (const key of METAFIELD_KEYS) {
    const meta = DEFINITION_META[key];
    intents.push({
      id: `definition:${key}`,
      kind: 'metafieldDefinition.ensure',
      reason: `Ensure ProductMetafields.${key} is a Storefront-accessible custom metafield definition.`,
      mutation: `${CREATE_DEFINITION}\n${UPDATE_DEFINITION_ACCESS}`,
      variables: {
        _create: {
          definition: {
            name: meta.name,
            namespace: NAMESPACE,
            key,
            description: meta.description,
            type: METAFIELD_TYPE,
            ownerType: 'PRODUCT',
            access: { storefront: 'PUBLIC_READ' },
          },
        },
        _updateAccessIfNeeded: {
          definition: {
            namespace: NAMESPACE,
            key,
            ownerType: 'PRODUCT',
            access: { storefront: 'PUBLIC_READ' },
          },
        },
      },
      idempotency:
        'Skip when the definition exists with Storefront access PUBLIC_READ; update access only when needed; never change an existing type.',
    });
  }

  for (const value of data.verifiedValues) {
    const { field, handle } = value;
    intents.push({
      id: `value:${handle}:${field.key}`,
      kind: 'metafieldsSet.value',
      reason: 'Publish only the owner-verified value present in scripts/data/metafields.json.',
      mutation: METAFIELDS_SET,
      variables: {
        metafields: [
          {
            key: field.key,
            namespace: field.namespace,
            ownerId: UNRESOLVED_ID(handle),
            type: field.type,
            value: field.value,
            compareDigest: null,
          },
        ],
      },
      idempotency:
        'Skip when the current metafield already has the same type and value; compareDigest is used for compare-and-set when available.',
    });
  }

  return {
    script: 'apply-metafields',
    generatedAt: new Date().toISOString(),
    mode: guard.mode,
    guards: {
      applyFlag: guard.applyFlag,
      SHOPIFY_LIVE_APPLY: guard.liveApplyEnv,
      bothGuardsPresent: guard.allowed,
    },
    environment: {
      storeDomain: context.storeDomain,
      adminApiVersion: context.apiVersion,
      adminToken: guard.allowed ? 'present (redacted)' : 'not supplied (dry-run)',
    },
    dataFile: DATA_FILE,
    dataSummary: {
      productHandles: data.productHandles.length,
      verifiedValues: data.verifiedValues.length,
      skippedPlaceholders: data.skipped.length,
    },
    namespaces: {
      namespace: NAMESPACE,
      keys: [...METAFIELD_KEYS],
      storefrontAccess: 'PUBLIC_READ',
    },
    intents,
    skipped: data.skipped.map((item) => ({
      id: `value:${item.handle}:${item.key}`,
      reason: item.reason,
    })),
    warnings: [
      'All shipped values are placeholders; no product claims will be published until the owner replaces them and sets status to "verified".',
      'Definitions are schema only and do not publish product claims, so they may be created while values remain placeholders.',
    ],
  };
}

function extractUserErrors(data: unknown): AdminUserError[] {
  if (!data || typeof data !== 'object') return [];
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const candidate = value as { userErrors?: unknown };
    if (Array.isArray(candidate.userErrors)) return candidate.userErrors as AdminUserError[];
  }
  return [];
}

async function executeIntent(
  context: AdminContext,
  id: string,
  mutation: string,
  variables: Record<string, unknown>,
): Promise<ApplyResult> {
  console.log(`[${id}] ${JSON.stringify(variables)}`);
  try {
    const data = await adminGraphql<unknown>(context, mutation, variables);
    const errors = extractUserErrors(data);
    if (errors.length > 0) {
      const detail = formatUserErrors(errors);
      console.error(`[${id}] FAILED: ${detail}`);
      return { id, status: 'failed', mutation, variables, detail };
    }
    console.log(`[${id}] OK`);
    return { id, status: 'applied', mutation, variables, detail: 'Shopify accepted the mutation' };
  } catch (error) {
    const detail = errorMessage(error);
    console.error(`[${id}] ERROR: ${detail}`);
    return { id, status: 'error', mutation, variables, detail };
  }
}

async function applyPlan(
  context: AdminContext,
  data: MetafieldsData,
  report: MetafieldsReport,
  maxProducts: number,
): Promise<void> {
  const results: ApplyResult[] = [];
  const definitions = await fetchMetafieldDefinitions(context, NAMESPACE);
  const definitionsByKey = new Map(definitions.map((definition) => [definition.key, definition]));
  const scan = await fetchProducts(context, {
    handles: new Set(data.productHandles),
    maxProducts,
    stopWhenFound: true,
  });
  const productsByHandle = new Map(scan.products.map((product) => [product.handle, product]));

  if (scan.hasMore) {
    report.warnings.push(
      `Product scan stopped at ${scan.scanned} products; some configured handles may not have been resolved.`,
    );
  }

  for (const intent of report.intents) {
    if (intent.kind === 'metafieldDefinition.ensure') {
      const key = intent.id.split(':')[1] as (typeof METAFIELD_KEYS)[number];
      const existing = definitionsByKey.get(key);

      if (!existing) {
        const variables = (intent.variables._create as Record<string, unknown>);
        results.push(await executeIntent(context, intent.id, CREATE_DEFINITION, variables));
        continue;
      }

      if (existing.type?.name && existing.type.name !== METAFIELD_TYPE) {
        const detail = `Definition ${key} has type ${existing.type.name}; expected ${METAFIELD_TYPE}. Type cannot be changed by this script.`;
        report.warnings.push(detail);
        report.skipped.push({ id: intent.id, reason: detail });
        results.push({ id: intent.id, status: 'skipped', mutation: intent.kind, variables: intent.variables, detail });
        console.log(`[${intent.id}] SKIP: ${detail}`);
        continue;
      }

      if (existing.access?.storefront === 'PUBLIC_READ') {
        const detail = `Definition ${key} already exists with Storefront access PUBLIC_READ`;
        report.skipped.push({ id: intent.id, reason: detail });
        results.push({ id: intent.id, status: 'skipped', mutation: intent.kind, variables: intent.variables, detail });
        console.log(`[${intent.id}] SKIP: ${detail}`);
        continue;
      }

      const variables = (intent.variables._updateAccessIfNeeded as Record<string, unknown>);
      results.push(await executeIntent(context, intent.id, UPDATE_DEFINITION_ACCESS, variables));
      continue;
    }

    const product = productsByHandle.get(intent.id.startsWith('value:') ? intent.id.split(':')[1] ?? '' : '');
    if (!product) {
      const detail = `No live product found for handle ${intent.id.split(':')[1]}`;
      report.skipped.push({ id: intent.id, reason: detail });
      results.push({ id: intent.id, status: 'skipped', mutation: intent.kind, variables: intent.variables, detail });
      console.log(`[${intent.id}] SKIP: ${detail}`);
      continue;
    }
    const desired = (intent.variables.metafields as Array<Record<string, unknown>>)[0];
    if (!desired) {
      const detail = 'Metafield input is empty';
      results.push({ id: intent.id, status: 'failed', mutation: intent.kind, variables: intent.variables, detail });
      continue;
    }
    const existing = product.metafields.find(
      (metafield) => metafield.namespace === desired.namespace && metafield.key === desired.key,
    );
    if (existing !== undefined && existing.value === desired.value && existing.type === desired.type) {
      const detail = `${desired.namespace}.${desired.key} already has the verified value`;
      report.skipped.push({ id: intent.id, reason: detail });
      results.push({ id: intent.id, status: 'skipped', mutation: intent.kind, variables: intent.variables, detail });
      console.log(`[${intent.id}] SKIP: ${detail}`);
      continue;
    }
    intent.variables = {
      metafields: [{ ...desired, ownerId: product.id, compareDigest: existing?.compareDigest ?? null }],
    };
    results.push(await executeIntent(context, intent.id, METAFIELDS_SET, intent.variables));
  }

  report.results = results;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.has('help')) {
    console.log(HELP);
    return;
  }
  assertAllowedArgs(args, ['apply', 'help'], ['output', 'max-products'], 'apply-metafields');

  const guard = resolveGuard(args);
  const context = getAdminContext(guard);
  const maxProducts = positiveIntOption(args.options, 'max-products', 100);
  const data = loadData();
  const report = buildPlan(data, context, guard);

  if (guard.allowed) {
    await applyPlan(context, data, report, maxProducts);
  }

  const output = args.options.get('output') ?? defaultReportPath('metafields');
  writeJsonReport(output, report);
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nMode: ${report.mode}. Shopify writes: ${report.mode === 'APPLY' ? 'attempted (see results)' : 'NONE'}.`);
  console.log(`Report: ${output}`);

  if (report.results?.some((result) => result.status === 'failed' || result.status === 'error')) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error('apply-metafields failed:', errorMessage(error));
  process.exit(1);
});
