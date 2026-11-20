/**
 * Read-only review of the owner-supplied Shopify product snapshot.
 *
 * USAGE (run from the repo root):
 *   npm run catalog:inventory
 *   npm run catalog:inventory -- --output=scripts/data/reports/catalog-inventory.json
 *
 * This script NEVER calls Shopify and NEVER proposes handle-based mutations:
 * the snapshot contains product titles but no Shopify handles. It only reports
 * data-quality findings and safe title-normalization candidates for review.
 */
import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.join('scripts', 'data', 'catalog-inventory.json');
const DEFAULT_OUTPUT = path.join('scripts', 'data', 'reports', 'catalog-inventory.json');

interface InventoryProduct {
  title: string;
  status: string;
  inventory: number;
  variants?: number;
  category: string | null;
  vendor: string;
  note?: string;
}

interface InventoryData {
  _README?: string;
  source: Record<string, unknown>;
  products: InventoryProduct[];
}

interface ReviewReport {
  script: 'analyze-catalog-inventory';
  generatedAt: string;
  source: Record<string, unknown>;
  summary: {
    products: number;
    byStatus: Record<string, number>;
    activeOutOfStock: number;
    draftWithStock: number;
    unlistedWithStock: number;
    negativeInventory: number;
    missingCategory: number;
    duplicateTitleGroups: number;
    comingSoonTitles: number;
    titleNormalizationCandidates: number;
  };
  findings: {
    activeOutOfStock: InventoryProduct[];
    draftWithStock: InventoryProduct[];
    unlistedWithStock: InventoryProduct[];
    negativeInventory: InventoryProduct[];
    missingCategory: InventoryProduct[];
    duplicateTitles: Array<{ key: string; products: InventoryProduct[] }>;
    comingSoonTitles: InventoryProduct[];
    titleNormalizationCandidates: Array<{ current: string; suggested: string }>;
  };
  warnings: string[];
}

const HELP = `Catalog inventory review (read-only)

Usage:
  npm run catalog:inventory
  npm run catalog:inventory -- --output=scripts/data/reports/catalog-inventory.json

No Shopify credentials and no --apply flag are accepted. The snapshot has no
product handles, so this tool cannot and does not generate live mutations.
`;

function stripEmoji(value: string): string {
  return value.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
}

function duplicateKey(title: string): string {
  return stripEmoji(title)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function suggestTitle(title: string): string {
  let suggested = title.replace(/\s+/g, ' ').trim();
  // Protect the compound word before applying generic punctuation spacing.
  const protectedToken = '__BENA_TSHIRT__';
  suggested = suggested.replace(/t-shirt/gi, protectedToken);
  suggested = suggested.replace(/(?<=\w)-(?=\w)/g, ' - ');
  suggested = suggested.replace(/(?<=\w)\/(?=\w)/g, ' / ');
  suggested = suggested.replace(/(?<=\w)([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/gu, ' $1');
  suggested = suggested.replace(/([^\s(])\(/g, '$1 (');
  suggested = suggested.replaceAll(protectedToken, 'T-Shirt');
  return suggested.replace(/\s{2,}/g, ' ').trim();
}

function buildReport(data: InventoryData): ReviewReport {
  const products = data.products;
  const byStatus: Record<string, number> = {};
  for (const item of products) byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;

  const duplicateMap = new Map<string, InventoryProduct[]>();
  for (const item of products) {
    const key = duplicateKey(item.title);
    const group = duplicateMap.get(key) ?? [];
    group.push(item);
    duplicateMap.set(key, group);
  }
  const duplicateTitles = [...duplicateMap.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, products: group }));

  const candidates = products
    .map((item) => ({ current: item.title, suggested: suggestTitle(item.title) }))
    .filter((item) => item.suggested !== item.current);

  const findings: ReviewReport['findings'] = {
    activeOutOfStock: products.filter((item) => item.status === 'Active' && item.inventory <= 0),
    draftWithStock: products.filter((item) => item.status === 'Draft' && item.inventory > 0),
    unlistedWithStock: products.filter((item) => item.status === 'Unlisted' && item.inventory > 0),
    negativeInventory: products.filter((item) => item.inventory < 0),
    missingCategory: products.filter((item) => !item.category),
    duplicateTitles,
    comingSoonTitles: products.filter((item) => /coming[\s-]*soon/i.test(item.title)),
    titleNormalizationCandidates: candidates,
  };

  return {
    script: 'analyze-catalog-inventory',
    generatedAt: new Date().toISOString(),
    source: data.source,
    summary: {
      products: products.length,
      byStatus,
      activeOutOfStock: findings.activeOutOfStock.length,
      draftWithStock: findings.draftWithStock.length,
      unlistedWithStock: findings.unlistedWithStock.length,
      negativeInventory: findings.negativeInventory.length,
      missingCategory: findings.missingCategory.length,
      duplicateTitleGroups: duplicateTitles.length,
      comingSoonTitles: findings.comingSoonTitles.length,
      titleNormalizationCandidates: candidates.length,
    },
    findings,
    warnings: [
      'The snapshot contains no Shopify product handles. All suggestions are review-only; no live mutations are generated.',
      '"Coming Soon" titles are retained: removing that label from genuinely unavailable products would be misleading.',
      'Negative inventory is a data-integrity signal; verify the stock count in Shopify before changing anything.',
    ],
  };
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    process.stdout.write(HELP);
    return;
  }
  const blocked = argv.filter((arg) => arg === '--apply' || arg.startsWith('--apply='));
  if (blocked.length > 0) {
    throw new Error('This read-only report does not accept --apply. No Shopify writes are supported.');
  }
  const outputArg = argv.find((arg) => arg.startsWith('--output='));
  const outputPath = outputArg?.slice('--output='.length) || DEFAULT_OUTPUT;

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) as InventoryData;
  if (!Array.isArray(data.products)) throw new Error(`${DATA_FILE} has no products array`);

  const report = buildReport(data);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`\nReport written to ${outputPath}\n`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
