/**
 * BeNa Origins - Phase 2 catalog cleanup (Admin GraphQL).
 *
 * USAGE (run from the repo root):
 *   npm run catalog:fixes                         # DRY-RUN: print plan, zero Shopify writes
 *   npm run catalog:fixes -- --output=path.json   # DRY-RUN: also write the plan to a file
 *   SHOPIFY_LIVE_APPLY=1 npm run catalog:fixes -- --apply
 *
 * Live apply requires BOTH `--apply` AND `SHOPIFY_LIVE_APPLY=1`.
 *
 * Environment (same names as the existing scripts in `scripts/`):
 *   SHOPIFY_STORE_DOMAIN             e.g. shop.myshopify.com
 *   SHOPIFY_ADMIN_API_ACCESS_TOKEN   Admin API token; script fails clearly if absent
 *   SHOPIFY_ADMIN_API_VERSION        defaults to 2026-10
 *   SHOPIFY_LIVE_APPLY=1             additional live-apply guard
 *
 * This script never changes `price`. It only clears compare-at values that are
 * less than or equal to the current price. All copy/handle changes come from
 * scripts/data/catalog-fixes.json; placeholder values are skipped.
 */
import {
  adminGraphql,
  assertAllowedArgs,
  defaultReportPath,
  errorMessage,
  fetchProducts,
  fetchUrlRedirects,
  formatUserErrors,
  getAdminContext,
  moneyToDisplay,
  parseArgs,
  parseMoneyAmount,
  positiveIntOption,
  readJsonFile,
  resolveGuard,
  writeJsonReport,
  type AdminContext,
  type AdminUserError,
  type GuardResult,
} from './lib/shopify-admin';

const DATA_FILE = 'scripts/data/catalog-fixes.json';

const HELP = `BeNa Origins - catalog fixes (dry-run by default)

Usage:
  npm run catalog:fixes
  npm run catalog:fixes -- --output=scripts/data/reports/catalog-fixes.json
  SHOPIFY_LIVE_APPLY=1 npm run catalog:fixes -- --apply --max-products=250

Flags/options:
  --help              Show this help
  --apply             Allow writes (requires SHOPIFY_LIVE_APPLY=1)
  --output=<path>     Write the JSON plan/results to a file
  --max-products=<n>  Compare-at scan limit (default 250)

Required environment:
  SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_API_ACCESS_TOKEN
  Optional: SHOPIFY_ADMIN_API_VERSION (default 2026-10)
  Live apply also requires: SHOPIFY_LIVE_APPLY=1
`;

interface TitleNormalization {
  handle: string;
  normalizedTitle: string;
  reason: string;
}

interface HandleRedirect {
  currentHandle: string;
  newHandle: string;
  path: string;
  target: string;
  reason: string;
}

interface PreparationCopy {
  handle: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
  candidateCopyNotForPublishing?: string;
  requiresOwnerVerification: boolean;
  sourceLimitations?: string;
  reason: string;
}

interface CatalogFixesData {
  _README?: string;
  titleNormalizations: TitleNormalization[];
  handleRedirects: HandleRedirect[];
  preparation: PreparationCopy;
}

interface Intent {
  id: string;
  kind:
    | 'productUpdate.title'
    | 'productUpdate.handle'
    | 'urlRedirectCreate'
    | 'metafieldsSet.preparation'
    | 'productVariantsBulkUpdate.clearCompareAt';
  reason: string;
  mutation: string;
  variables: Record<string, unknown>;
  idempotency: string;
  priceChange: 'none';
  targetHandle?: string;
  path?: string;
}

interface Skip {
  id: string;
  reason: string;
  details?: Record<string, unknown>;
}

interface ApplyResult {
  id: string;
  status: 'applied' | 'skipped' | 'failed' | 'error';
  mutation: string;
  variables: Record<string, unknown>;
  detail: string;
}

interface CatalogReport {
  script: 'apply-catalog-fixes';
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
    titleNormalizations: number;
    handleRedirects: number;
    preparationStatus: 'verified' | 'placeholder-skipped';
  };
  intents: Intent[];
  skipped: Skip[];
  warnings: string[];
  results?: ApplyResult[];
}

const PRODUCT_UPDATE = `#graphql
  mutation Phase2ProductUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id title handle }
      userErrors { field message }
    }
  }
`;

const URL_REDIRECT_CREATE = `#graphql
  mutation Phase2UrlRedirectCreate($urlRedirect: UrlRedirectInput!) {
    urlRedirectCreate(urlRedirect: $urlRedirect) {
      urlRedirect { id path target }
      userErrors { field message }
    }
  }
`;

const METAFIELDS_SET = `#graphql
  mutation Phase2MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key type value }
      userErrors { field message code }
    }
  }
`;

const CLEAR_COMPARE_AT = `#graphql
  mutation Phase2ClearCompareAt($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id compareAtPrice { amount currencyCode } }
      userErrors { field message }
    }
  }
`;

const PLACEHOLDER_PATTERN = /placeholder|owner-verified|verify before|TODO/i;
const UNRESOLVED_ID = (handle: string): string => `<gid://shopify/Product/FROM_HANDLE:${handle}>`;

function containsComingSoon(value: string): boolean {
  return /coming[\s\-_]*soon/i.test(value);
}

function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value);
}

function requireNonEmpty(value: string | undefined, label: string): string {
  if (!value || value.trim().length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function validateData(data: CatalogFixesData): void {
  if (!Array.isArray(data.titleNormalizations) || !Array.isArray(data.handleRedirects) || !data.preparation) {
    throw new Error(`${DATA_FILE} is missing titleNormalizations, handleRedirects or preparation`);
  }
  for (const entry of data.titleNormalizations) {
    requireNonEmpty(entry.handle, 'titleNormalizations[].handle');
    requireNonEmpty(entry.normalizedTitle, 'titleNormalizations[].normalizedTitle');
    if (containsComingSoon(entry.normalizedTitle)) {
      throw new Error(`Normalized title for ${entry.handle} still contains "coming soon"`);
    }
  }
  for (const entry of data.handleRedirects) {
    requireNonEmpty(entry.currentHandle, 'handleRedirects[].currentHandle');
    requireNonEmpty(entry.newHandle, 'handleRedirects[].newHandle');
    if (!entry.path?.startsWith('/') || !entry.target?.startsWith('/')) {
      throw new Error(`Redirect for ${entry.currentHandle} must use relative paths starting with "/"`);
    }
    if (containsComingSoon(entry.newHandle) || containsComingSoon(entry.target)) {
      throw new Error(`New handle/target for ${entry.currentHandle} still contains "coming soon"`);
    }
  }
  const preparation = data.preparation;
  requireNonEmpty(preparation.handle, 'preparation.handle');
  requireNonEmpty(preparation.namespace, 'preparation.namespace');
  requireNonEmpty(preparation.key, 'preparation.key');
  requireNonEmpty(preparation.type, 'preparation.type');
  requireNonEmpty(preparation.value, 'preparation.value');
  if (preparation.namespace !== 'custom' || preparation.key !== 'preparation') {
    throw new Error('preparation must use namespace "custom" and key "preparation"');
  }
}

function buildPlan(
  data: CatalogFixesData,
  context: AdminContext,
  guard: GuardResult,
  maxProducts: number,
): CatalogReport {
  const intents: Intent[] = [];
  const skipped: Skip[] = [];
  const warnings: string[] = [];

  for (const entry of data.titleNormalizations) {
    intents.push({
      id: `title:${entry.handle}`,
      kind: 'productUpdate.title',
      reason: entry.reason,
      mutation: PRODUCT_UPDATE,
      variables: {
        product: { id: UNRESOLVED_ID(entry.handle), title: entry.normalizedTitle },
      },
      idempotency: 'Skip when the live product title already equals normalizedTitle.',
      priceChange: 'none',
      targetHandle: entry.handle,
    });
  }

  for (const entry of data.handleRedirects) {
    intents.push({
      id: `handle:${entry.currentHandle}`,
      kind: 'productUpdate.handle',
      reason: entry.reason,
      mutation: PRODUCT_UPDATE,
      variables: {
        product: { id: UNRESOLVED_ID(entry.currentHandle), handle: entry.newHandle },
      },
      idempotency:
        'Skip when the current handle is absent (already renamed), the new handle is taken by another product, or the product already uses newHandle.',
      priceChange: 'none',
      targetHandle: entry.currentHandle,
    });
    intents.push({
      id: `redirect:${entry.currentHandle}`,
      kind: 'urlRedirectCreate',
      reason: entry.reason,
      mutation: URL_REDIRECT_CREATE,
      variables: { urlRedirect: { path: entry.path, target: entry.target } },
      idempotency:
        'Skip when a redirect with the same path and target exists; report a conflict if the path exists with a different target. Checked after the handle update.',
      priceChange: 'none',
      path: entry.path,
    });
  }

  const preparation = data.preparation;
  const preparationBlocked =
    preparation.requiresOwnerVerification || isPlaceholderValue(preparation.value);
  if (preparationBlocked) {
    skipped.push({
      id: 'preparation:agashya',
      reason:
        'Agashya preparation copy is an explicit placeholder. Replace value with owner-verified label copy and set requiresOwnerVerification=false before it can be published.',
      details: {
        handle: preparation.handle,
        sourceLimitations: preparation.sourceLimitations ?? null,
        candidateCopyNotForPublishing: preparation.candidateCopyNotForPublishing ?? null,
      },
    });
  } else {
    intents.push({
      id: `preparation:${preparation.handle}`,
      kind: 'metafieldsSet.preparation',
      reason: preparation.reason,
      mutation: METAFIELDS_SET,
      variables: {
        metafields: [
          {
            key: preparation.key,
            namespace: preparation.namespace,
            ownerId: UNRESOLVED_ID(preparation.handle),
            type: preparation.type,
            value: preparation.value,
            compareDigest: null,
          },
        ],
      },
      idempotency:
        'Skip when the current custom.preparation metafield already has the same type and value; compareDigest is used for compare-and-set when available.',
      priceChange: 'none',
      targetHandle: preparation.handle,
    });
  }

  intents.push({
    id: 'compare-at:invalid',
    kind: 'productVariantsBulkUpdate.clearCompareAt',
    reason:
      'Audit finding #15: clear compare-at prices that are zero or not higher than the selling price.',
    mutation: CLEAR_COMPARE_AT,
    variables: {
      _resolvedAtApplyTime: {
        productId: '<product id>',
        variants: [{ id: '<variant id>', compareAtPrice: null }],
      },
    },
    idempotency:
      'Only variants with a non-null compareAtPrice <= price are selected; already-clean variants are never sent.',
    priceChange: 'none',
  });

  warnings.push(
    'Dry-run uses the local data file only: no Shopify reads or writes are performed. Live state, IDs and invalid compare-at variants are discovered only in --apply mode.',
  );
  if (maxProducts < 250) {
    warnings.push(`--max-products=${maxProducts}: compare-at cleanup may not cover the full catalog.`);
  }

  return {
    script: 'apply-catalog-fixes',
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
      titleNormalizations: data.titleNormalizations.length,
      handleRedirects: data.handleRedirects.length,
      preparationStatus: preparationBlocked ? 'placeholder-skipped' : 'verified',
    },
    intents,
    skipped,
    warnings,
  };
}

function extractUserErrors(data: unknown): AdminUserError[] {
  if (!data || typeof data !== 'object') return [];
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const candidate = value as { userErrors?: unknown };
    if (Array.isArray(candidate.userErrors)) {
      return candidate.userErrors as AdminUserError[];
    }
  }
  return [];
}

async function executeIntent(
  context: AdminContext,
  intent: Intent,
): Promise<ApplyResult> {
  console.log(`[${intent.id}] ${intent.kind} -> ${JSON.stringify(intent.variables)}`);
  try {
    const data = await adminGraphql<unknown>(context, intent.mutation, intent.variables);
    const errors = extractUserErrors(data);
    if (errors.length > 0) {
      const detail = formatUserErrors(errors);
      console.error(`[${intent.id}] FAILED: ${detail}`);
      return {
        id: intent.id,
        status: 'failed',
        mutation: intent.kind,
        variables: intent.variables,
        detail,
      };
    }
    const detail = 'Shopify accepted the mutation';
    console.log(`[${intent.id}] OK: ${detail}`);
    return {
      id: intent.id,
      status: 'applied',
      mutation: intent.kind,
      variables: intent.variables,
      detail,
    };
  } catch (error) {
    const detail = errorMessage(error);
    console.error(`[${intent.id}] ERROR: ${detail}`);
    return {
      id: intent.id,
      status: 'error',
      mutation: intent.kind,
      variables: intent.variables,
      detail,
    };
  }
}

function skipWith(
  report: CatalogReport,
  results: ApplyResult[],
  intent: Intent,
  reason: string,
  detail: string,
): void {
  report.skipped.push({ id: intent.id, reason, details: { mutation: intent.kind } });
  results.push({
    id: intent.id,
    status: 'skipped',
    mutation: intent.kind,
    variables: intent.variables,
    detail,
  });
  console.log(`[${intent.id}] SKIP: ${detail}`);
}

async function applyPlan(
  context: AdminContext,
  data: CatalogFixesData,
  report: CatalogReport,
  maxProducts: number,
): Promise<void> {
  const results: ApplyResult[] = [];
  const scan = await fetchProducts(context, { maxProducts });
  const productsByHandle = new Map(scan.products.map((product) => [product.handle, product]));

  if (scan.hasMore) {
    report.warnings.push(
      `Product scan stopped at ${scan.scanned} products; compare-at cleanup did not inspect the rest of the catalog. Raise --max-products.`,
    );
  }

  for (const intent of report.intents) {
    if (intent.kind === 'productUpdate.title') {
      const product = productsByHandle.get(intent.targetHandle ?? '');
      if (!product) {
        skipWith(report, results, intent, 'Product handle not found', `No live product with handle ${intent.targetHandle}`);
        continue;
      }
      const desiredTitle = (intent.variables.product as { title: string }).title;
      if (product.title === desiredTitle) {
        skipWith(report, results, intent, 'Idempotent', `Title already equals "${desiredTitle}"`);
        continue;
      }
      intent.variables = { product: { id: product.id, title: desiredTitle } };
      results.push(await executeIntent(context, intent));
      continue;
    }

    if (intent.kind === 'productUpdate.handle') {
      const entry = data.handleRedirects.find((item) => item.currentHandle === intent.targetHandle);
      if (!entry) {
        skipWith(report, results, intent, 'Missing mapping', `No redirect mapping for ${intent.targetHandle}`);
        continue;
      }
      const current = productsByHandle.get(entry.currentHandle);
      const newOwner = productsByHandle.get(entry.newHandle);
      if (!current && newOwner) {
        skipWith(report, results, intent, 'Idempotent', `Handle already renamed to ${entry.newHandle}`);
        continue;
      }
      if (!current) {
        skipWith(report, results, intent, 'Product not found', `No live product with handle ${entry.currentHandle}`);
        continue;
      }
      if (newOwner && newOwner.id !== current.id) {
        skipWith(report, results, intent, 'Conflict', `New handle ${entry.newHandle} belongs to another product`);
        continue;
      }
      if (current.handle === entry.newHandle) {
        skipWith(report, results, intent, 'Idempotent', `Product already uses handle ${entry.newHandle}`);
        continue;
      }
      intent.variables = { product: { id: current.id, handle: entry.newHandle } };
      results.push(await executeIntent(context, intent));
      continue;
    }

    if (intent.kind === 'urlRedirectCreate') {
      // Re-read redirects: Shopify can create one automatically when a handle changes.
      const currentRedirects = await fetchUrlRedirects(context);
      const existing = currentRedirects.find((redirect) => redirect.path === intent.path);
      const entry = data.handleRedirects.find((item) => item.path === intent.path);
      if (existing && entry && existing.target === entry.target) {
        skipWith(report, results, intent, 'Idempotent', `Redirect ${entry.path} -> ${entry.target} already exists`);
        continue;
      }
      if (existing) {
        skipWith(report, results, intent, 'Conflict', `Redirect path ${intent.path} already targets ${existing.target}`);
        continue;
      }
      results.push(await executeIntent(context, intent));
      continue;
    }

    if (intent.kind === 'metafieldsSet.preparation') {
      const product = productsByHandle.get(intent.targetHandle ?? '');
      if (!product) {
        skipWith(report, results, intent, 'Product not found', `No live product with handle ${intent.targetHandle}`);
        continue;
      }
      const desired = (intent.variables.metafields as Array<Record<string, unknown>>)[0];
      if (!desired) {
        skipWith(report, results, intent, 'Invalid intent', 'Preparation metafield input is empty');
        continue;
      }
      const existing = product.metafields.find(
        (metafield) =>
          metafield.namespace === desired.namespace && metafield.key === desired.key,
      );
      if (existing !== undefined && existing.value === desired.value && existing.type === desired.type) {
        skipWith(report, results, intent, 'Idempotent', 'custom.preparation already has the verified value');
        continue;
      }
      intent.variables = {
        metafields: [{ ...desired, ownerId: product.id, compareDigest: existing?.compareDigest ?? null }],
      };
      results.push(await executeIntent(context, intent));
      continue;
    }

    // The compare-at intent is handled after static intents because it is
    // discovered from the live catalog rather than from the data file.
  }

  for (const product of scan.products) {
    const invalidVariants = product.variants.filter((variant) => {
      if (!variant.compareAtPrice) return false;
      const price = parseMoneyAmount(variant.price);
      const compareAt = parseMoneyAmount(variant.compareAtPrice);
      if (price === null || compareAt === null) return false;
      return compareAt <= price;
    });
    if (invalidVariants.length === 0) continue;

    const variables = {
      productId: product.id,
      variants: invalidVariants.map((variant) => ({
        id: variant.id,
        compareAtPrice: null,
      })),
    };
    const intent: Intent = {
      id: `compare-at:${product.handle}`,
      kind: 'productVariantsBulkUpdate.clearCompareAt',
      reason: `Clearing invalid compare-at for ${invalidVariants.length} variant(s); price is not sent.`,
      mutation: CLEAR_COMPARE_AT,
      variables,
      idempotency: 'Only non-null compare-at values <= price were selected.',
      priceChange: 'none',
      targetHandle: product.handle,
    };
    report.intents.push(intent);
    console.log(
      `[${intent.id}] invalid compare-at: ${invalidVariants
        .map((variant) => `${variant.title}: ${moneyToDisplay(variant.compareAtPrice)} <= ${moneyToDisplay(variant.price)}`)
        .join('; ')}`,
    );
    results.push(await executeIntent(context, intent));
  }

  report.results = results;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.has('help')) {
    console.log(HELP);
    return;
  }
  assertAllowedArgs(args, ['apply', 'help'], ['output', 'max-products'], 'apply-catalog-fixes');

  const guard = resolveGuard(args);
  const context = getAdminContext(guard);
  const maxProducts = positiveIntOption(args.options, 'max-products', 250);
  const data = readJsonFile<CatalogFixesData>(DATA_FILE);
  validateData(data);

  const report = buildPlan(data, context, guard, maxProducts);
  if (guard.allowed) {
    await applyPlan(context, data, report, maxProducts);
  }

  const output = args.options.get('output') ?? defaultReportPath('catalog-fixes');
  writeJsonReport(output, report);
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nMode: ${report.mode}. Shopify writes: ${report.mode === 'APPLY' ? 'attempted (see results)' : 'NONE'}.`);
  console.log(`Report: ${output}`);

  if (report.results?.some((result) => result.status === 'failed' || result.status === 'error')) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error('apply-catalog-fixes failed:', errorMessage(error));
  process.exit(1);
});
