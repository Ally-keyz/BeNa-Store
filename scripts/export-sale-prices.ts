/**
 * BeNa Origins - READ-ONLY sale-price evidence export (Admin GraphQL).
 *
 * USAGE (run from the repo root):
 *   npm run sale-prices:export
 *   npm run sale-prices:export -- --output=scripts/data/reports/sale-prices.csv
 *   npm run sale-prices:export -- --max-products=500
 *
 * Environment (same names as the existing scripts in `scripts/`):
 *   SHOPIFY_STORE_DOMAIN             e.g. shop.myshopify.com
 *   SHOPIFY_ADMIN_API_ACCESS_TOKEN   Admin API token; script fails clearly if absent
 *   SHOPIFY_ADMIN_API_VERSION        defaults to 2026-10
 *
 * This script performs READ-ONLY GraphQL queries. It never sends a mutation,
 * ignores --apply if passed, and needs no live-apply guard. The CSV marks every
 * row as requiring manual verification of the 30-day prior price: the API
 * cannot prove German price-history compliance.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  assertAllowedArgs,
  errorMessage,
  fetchProducts,
  moneyToDisplay,
  parseArgs,
  parseMoneyAmount,
  positiveIntOption,
  requireAdminContext,
  type AdminProduct,
  type AdminVariant,
} from './lib/shopify-admin';

const DEFAULT_OUTPUT = path.join('scripts', 'data', 'reports', 'sale-prices.csv');
const MANUAL_EVIDENCE =
  'YES - 30-day low must be verified manually (price history is not available via the Admin API)';

const HELP = `BeNa Origins - export sale prices (READ-ONLY)

Usage:
  npm run sale-prices:export
  npm run sale-prices:export -- --output=scripts/data/reports/sale-prices.csv
  npm run sale-prices:export -- --max-products=250

Options:
  --help              Show this help
  --output=<path>     CSV output path (default: scripts/data/reports/sale-prices.csv)
  --max-products=<n>  Read limit (default 250)
  --apply             Accepted but ignored; this script never writes to Shopify

Required environment:
  SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_API_ACCESS_TOKEN
  Optional: SHOPIFY_ADMIN_API_VERSION (default 2026-10)
`;

interface CsvRow {
  handle: string;
  title: string;
  price: string;
  compareAt: string;
  validSale: string;
  manualEvidenceRequired: string;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function buildRow(product: AdminProduct, variant: AdminVariant): CsvRow {
  const price = parseMoneyAmount(variant.price);
  const compareAt = parseMoneyAmount(variant.compareAtPrice);
  const validSale = price !== null && compareAt !== null && compareAt > price;
  return {
    handle: product.handle,
    title: product.title,
    price: moneyToDisplay(variant.price),
    compareAt: moneyToDisplay(variant.compareAtPrice),
    validSale: validSale ? 'true' : 'false',
    manualEvidenceRequired: MANUAL_EVIDENCE,
  };
}

function toCsv(rows: CsvRow[]): string {
  const header = 'handle,title,price,compareAt,validSale,manualEvidenceRequired';
  const lines = rows.map((row) =>
    [
      row.handle,
      row.title,
      row.price,
      row.compareAt,
      row.validSale,
      row.manualEvidenceRequired,
    ]
      .map(csvCell)
      .join(','),
  );
  return `${[header, ...lines].join('\r\n')}\r\n`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.has('help')) {
    console.log(HELP);
    return;
  }
  assertAllowedArgs(args, ['help', 'apply'], ['output', 'max-products'], 'export-sale-prices');

  const context = requireAdminContext();
  const maxProducts = positiveIntOption(args.options, 'max-products', 250);
  const output = args.options.get('output') ?? DEFAULT_OUTPUT;

  const scan = await fetchProducts(context, { maxProducts });
  const rows: CsvRow[] = [];
  for (const product of scan.products) {
    for (const variant of product.variants) rows.push(buildRow(product, variant));
  }

  const absolute = path.resolve(process.cwd(), output);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, toCsv(rows), 'utf8');

  const validSales = rows.filter((row) => row.validSale === 'true').length;
  console.log('READ-ONLY export complete. No Shopify mutations were sent.');
  if (args.flags.has('apply')) {
    console.log('Note: --apply was passed but is ignored by this read-only script.');
  }
  console.log(`Products read       : ${scan.scanned}`);
  console.log(`Variant rows        : ${rows.length}`);
  console.log(`Valid sale rows     : ${validSales}`);
  console.log(`Catalog truncated   : ${scan.hasMore ? 'yes (raise --max-products)' : 'no'}`);
  console.log(`CSV                 : ${absolute}`);
  console.log(`Manual check        : ${MANUAL_EVIDENCE}`);
}

void main().catch((error: unknown) => {
  console.error('export-sale-prices failed:', errorMessage(error));
  process.exit(1);
});
