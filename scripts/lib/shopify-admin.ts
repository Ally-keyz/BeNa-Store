/**
 * Shared Admin GraphQL helpers for the Phase 2 live-apply scripts.
 *
 * Environment variables (same names as the existing scripts in `scripts/`):
 *   SHOPIFY_STORE_DOMAIN            e.g. shop.myshopify.com
 *   SHOPIFY_ADMIN_API_ACCESS_TOKEN  Admin API access token (never logged)
 *   SHOPIFY_ADMIN_API_VERSION       defaults to 2026-10
 *   SHOPIFY_LIVE_APPLY=1            extra guard required together with --apply
 *
 * This module never decides to write. Each caller must explicitly opt in with
 * `--apply` AND the SHOPIFY_LIVE_APPLY=1 environment guard.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../../src/config/env';

export interface AdminContext {
  storeDomain: string;
  apiVersion: string;
  accessToken: string;
}

export interface CliArgs {
  flags: Set<string>;
  options: Map<string, string>;
}

export interface AdminUserError {
  field?: string[] | null;
  message: string;
  code?: string | null;
}

export interface AdminMoney {
  amount: string;
  currencyCode: string;
}

export interface AdminVariant {
  id: string;
  title: string;
  price: AdminMoney;
  compareAtPrice: AdminMoney | null;
}

export interface AdminProductMetafield {
  id: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
  compareDigest?: string | null;
}

export interface AdminProduct {
  id: string;
  handle: string;
  title: string;
  variants: AdminVariant[];
  metafields: AdminProductMetafield[];
}

export interface AdminRedirect {
  id: string;
  path: string;
  target: string;
}

export interface AdminMetafieldDefinition {
  id: string;
  namespace: string;
  key: string;
  name: string;
  type?: { name?: string | null } | null;
  access?: { storefront?: string | null } | null;
}

export interface FetchProductsResult {
  products: AdminProduct[];
  scanned: number;
  hasMore: boolean;
}

export interface GuardResult {
  mode: 'DRY-RUN' | 'APPLY';
  applyFlag: boolean;
  liveApplyEnv: string;
  allowed: boolean;
}

export const DEFAULT_REPORT_DIR = path.join('scripts', 'data', 'reports');
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PRODUCTS = 250;

export function parseArgs(argv: string[]): CliArgs {
  const flags = new Set<string>();
  const options = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index] ?? '';
    if (!entry.startsWith('--')) continue;
    const separator = entry.indexOf('=');
    if (separator > 2) {
      options.set(entry.slice(2, separator), entry.slice(separator + 1));
      continue;
    }
    const following = argv[index + 1];
    if (following !== undefined && !following.startsWith('--')) {
      options.set(entry.slice(2), following);
      index += 1;
      continue;
    }
    flags.add(entry.slice(2));
  }
  return { flags, options };
}

export function assertAllowedArgs(
  args: CliArgs,
  allowedFlags: string[],
  allowedOptions: string[],
  scriptName: string,
): void {
  const unknownFlags = [...args.flags].filter((flag) => !allowedFlags.includes(flag));
  const unknownOptions = [...args.options.keys()].filter(
    (option) => !allowedOptions.includes(option),
  );
  if (unknownFlags.length > 0 || unknownOptions.length > 0) {
    const parts: string[] = [];
    if (unknownFlags.length > 0) parts.push(`flags: ${unknownFlags.join(', ')}`);
    if (unknownOptions.length > 0) parts.push(`options: ${unknownOptions.join(', ')}`);
    throw new Error(`${scriptName}: unsupported ${parts.join('; ')}. Use --help for usage.`);
  }
}

/** Loads env via the repository's existing config loader (including .env). */
export function requireAdminContext(): AdminContext {
  const config = loadConfig();
  const missing: string[] = [];
  if (!config.shopify.storeDomain) missing.push('SHOPIFY_STORE_DOMAIN');
  if (!config.webhooks.adminAccessToken) missing.push('SHOPIFY_ADMIN_API_ACCESS_TOKEN');
  if (!config.webhooks.adminApiVersion) missing.push('SHOPIFY_ADMIN_API_VERSION');
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env and set the Admin API values before running this script.',
    );
  }
  return {
    storeDomain: config.shopify.storeDomain!,
    apiVersion: config.webhooks.adminApiVersion,
    accessToken: config.webhooks.adminAccessToken!,
  };
}

export function resolveGuard(args: CliArgs): GuardResult {
  // Ensure .env is loaded before reading the guard, matching requireAdminContext().
  loadConfig();
  const applyFlag = args.flags.has('apply');
  const liveApplyEnv = process.env.SHOPIFY_LIVE_APPLY ?? '';
  const envGuard = liveApplyEnv === '1';
  if (applyFlag && !envGuard) {
    throw new Error(
      'Refusing to apply: pass --apply AND set SHOPIFY_LIVE_APPLY=1. ' +
        'No Shopify write was attempted.',
    );
  }
  return {
    mode: applyFlag && envGuard ? 'APPLY' : 'DRY-RUN',
    applyFlag,
    liveApplyEnv: liveApplyEnv || '(unset)',
    allowed: applyFlag && envGuard,
  };
}

/** Sentinel token used only in dry-run contexts; never accepted for a network call. */
const DRY_RUN_ACCESS_TOKEN = '(dry-run-no-credentials)';

/**
 * Real Admin credentials are loaded only for an explicitly allowed live apply.
 * Dry-runs make no Shopify calls, so they work without secrets and remain
 * reviewable by the owner. `adminGraphql` refuses the dry-run sentinel as a
 * second line of defence if a caller ever tries to use it for a request.
 */
export function getAdminContext(guard: GuardResult): AdminContext {
  if (guard.allowed) return requireAdminContext();
  return {
    storeDomain: '(not required in dry-run)',
    apiVersion: '(not required in dry-run)',
    accessToken: DRY_RUN_ACCESS_TOKEN,
  };
}

export async function adminGraphql<T>(
  context: AdminContext,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  if (context.accessToken === DRY_RUN_ACCESS_TOKEN) {
    throw new Error('Refusing to call Shopify: this context is for dry-run only. No request was sent.');
  }
  const response = await fetch(
    `https://${context.storeDomain}/admin/api/${context.apiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': context.accessToken,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
    },
  );

  let payload: { data?: T; errors?: Array<{ message: string }> };
  try {
    payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  } catch {
    throw new Error(`Admin GraphQL returned a non-JSON response (HTTP ${response.status})`);
  }
  if (!response.ok || payload.errors?.length) {
    const detail =
      payload.errors?.map((error) => error.message).join('; ') ?? `HTTP ${response.status}`;
    throw new Error(`Admin GraphQL failed: ${detail}`);
  }
  if (!payload.data) throw new Error('Admin GraphQL response contained no data');
  return payload.data;
}

export function formatUserErrors(errors: AdminUserError[]): string {
  return errors
    .map((error) => {
      const field = error.field?.length ? `${error.field.join('.')}: ` : '';
      return `${field}${error.message}`;
    })
    .join('; ');
}

const PRODUCTS_QUERY = `#graphql
  query Phase2Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        handle
        title
        variants(first: 100) {
          nodes {
            id
            title
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
          }
        }
        metafields(first: 50, namespace: "custom") {
          nodes { id namespace key type value compareDigest }
        }
      }
    }
  }
`;

interface ProductsResponse {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: Array<{
      id: string;
      handle: string;
      title: string;
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          price: AdminMoney;
          compareAtPrice: AdminMoney | null;
        }>;
      };
      metafields?: {
        nodes: Array<{
          id: string;
          namespace: string;
          key: string;
          type: string;
          value: string;
          compareDigest?: string | null;
        }>;
      } | null;
    }>;
  };
}

/**
 * Read-only product scan. `handles` + `stopWhenFound` avoid scanning the whole
 * catalog when only explicitly mapped handles are needed.
 */
export async function fetchProducts(
  context: AdminContext,
  options: {
    handles?: Set<string>;
    maxProducts?: number;
    pageSize?: number;
    stopWhenFound?: boolean;
  } = {},
): Promise<FetchProductsResult> {
  const maxProducts = options.maxProducts ?? MAX_PRODUCTS;
  const pageSize = Math.min(options.pageSize ?? DEFAULT_PAGE_SIZE, maxProducts);
  const wanted = options.handles;
  const found = new Set<string>();
  const products: AdminProduct[] = [];
  let after: string | null = null;
  let scanned = 0;
  let hasMore = false;

  while (scanned < maxProducts) {
    const data: ProductsResponse = await adminGraphql<ProductsResponse>(
      context,
      PRODUCTS_QUERY,
      {
        first: Math.min(pageSize, maxProducts - scanned),
        after,
      },
    );
    const connection: ProductsResponse['products'] = data.products;
    for (const node of connection.nodes) {
      products.push({
        id: node.id,
        handle: node.handle,
        title: node.title,
        variants: node.variants.nodes,
        metafields: node.metafields?.nodes ?? [],
      });
      found.add(node.handle);
    }
    scanned += connection.nodes.length;
    hasMore = connection.pageInfo.hasNextPage;
    if (
      (options.stopWhenFound && wanted && [...wanted].every((handle) => found.has(handle))) ||
      !hasMore ||
      !connection.pageInfo.endCursor ||
      connection.nodes.length === 0
    ) {
      break;
    }
    after = connection.pageInfo.endCursor;
  }

  return { products, scanned, hasMore: hasMore && scanned >= maxProducts };
}

const URL_REDIRECTS_QUERY = `#graphql
  query Phase2UrlRedirects($first: Int!) {
    urlRedirects(first: $first) {
      nodes { id path target }
    }
  }
`;

interface UrlRedirectsResponse {
  urlRedirects: { nodes: AdminRedirect[] };
}

export async function fetchUrlRedirects(context: AdminContext, first = 250): Promise<AdminRedirect[]> {
  const data = await adminGraphql<UrlRedirectsResponse>(context, URL_REDIRECTS_QUERY, { first });
  return data.urlRedirects.nodes;
}

const METAFIELD_DEFINITIONS_QUERY = `#graphql
  query Phase2MetafieldDefinitions($ownerType: MetafieldOwnerType!, $namespace: String, $first: Int!) {
    metafieldDefinitions(ownerType: $ownerType, namespace: $namespace, first: $first) {
      nodes {
        id
        name
        namespace
        key
        type { name }
        access { storefront }
      }
    }
  }
`;

interface MetafieldDefinitionsResponse {
  metafieldDefinitions: { nodes: AdminMetafieldDefinition[] };
}

export async function fetchMetafieldDefinitions(
  context: AdminContext,
  namespace: string,
  first = 50,
): Promise<AdminMetafieldDefinition[]> {
  const data = await adminGraphql<MetafieldDefinitionsResponse>(
    context,
    METAFIELD_DEFINITIONS_QUERY,
    { ownerType: 'PRODUCT', namespace, first },
  );
  return data.metafieldDefinitions.nodes;
}

export function moneyToDisplay(money: AdminMoney | null): string {
  return money ? `${money.amount} ${money.currencyCode}` : 'null';
}

export function parseMoneyAmount(money: AdminMoney | null): number | null {
  if (!money) return null;
  const amount = Number.parseFloat(money.amount);
  return Number.isFinite(amount) ? amount : null;
}

export function readJsonFile<T>(relativePath: string): T {
  const absolute = path.resolve(process.cwd(), relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolute, 'utf8')) as T;
  } catch (error) {
    throw new Error(`Cannot read JSON file ${relativePath}: ${errorMessage(error)}`);
  }
}

export function writeJsonReport(relativeOrAbsolutePath: string, report: unknown): void {
  const absolute = path.resolve(process.cwd(), relativeOrAbsolutePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

export function defaultReportPath(prefix: string): string {
  return path.join(DEFAULT_REPORT_DIR, `${prefix}-${new Date().toISOString().slice(0, 10)}.json`);
}

export function positiveIntOption(
  options: Map<string, string>,
  name: string,
  fallback: number,
): number {
  const raw = options.get(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive integer (received "${raw}")`);
  }
  return parsed;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function assertionError(message: string): never {
  throw new Error(message);
}
