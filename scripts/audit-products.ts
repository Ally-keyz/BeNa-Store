/**
 * Bulk product-information completeness report.
 * READ-ONLY: never mutates Shopify products, prices, inventory or collections.
 *
 * Usage:
 *   npm run audit:report
 *   npm run audit:report -- --limit=500 --output=reports/audit.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config/env';
import { createLogger } from '../src/utils/logger';
import { createCommerceClient } from '../src/integrations/shopify';
import { AuditService } from '../src/services/audit.service';
import type { CatalogAudit } from '../src/types/audit';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((entry) => entry.startsWith(prefix));
  return found?.slice(prefix.length);
}

function toMarkdown(report: CatalogAudit): string {
  const lines: string[] = [];
  lines.push('# BeNa Origins â€” product information completeness report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Data source: **${report.dataSource.toUpperCase()}**`);
  lines.push(`Scanned products: ${report.scannedProducts} / limit ${report.scanLimit}`);
  lines.push(`Average score: **${report.summary.averageScore}/100**`);
  lines.push('');
  lines.push('> Read-only report. Legal items are risk flags, not legal conclusions.');
  lines.push('');
  if (report.warnings.length > 0) {
    lines.push('## Warnings');
    for (const warning of report.warnings) lines.push(`- ${warning}`);
    lines.push('');
  }
  lines.push('## Severity totals');
  lines.push('');
  lines.push('| Critical | High | Medium | Low | Info |');
  lines.push('| --- | --- | --- | --- | --- |');
  lines.push(
    `| ${report.summary.issueCounts.critical} | ${report.summary.issueCounts.high} | ${report.summary.issueCounts.medium} | ${report.summary.issueCounts.low} | ${report.summary.issueCounts.info} |`,
  );
  lines.push('');
  lines.push('## Products (worst first)');
  lines.push('');
  lines.push('| Score | Grade | Product | Handle | Issues (H/M/L) |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const product of report.products) {
    lines.push(
      `| ${product.score} | ${product.grade} | ${product.title.replace(/\|/g, '\\|')} | /products/${product.handle} | ${product.issueCounts.high}/${product.issueCounts.medium}/${product.issueCounts.low} |`,
    );
  }
  lines.push('');
  lines.push('## Itemized issues');
  for (const product of report.products) {
    if (product.issues.length === 0) continue;
    lines.push('');
    lines.push(`### ${product.title} (/products/${product.handle}) â€” ${product.score}/100`);
    for (const issue of product.issues) {
      lines.push(
        `- **${issue.severity.toUpperCase()}** [${issue.auditRef ?? 'n/a'}] ${issue.title} â€” ${issue.message}`,
      );
      for (const evidence of issue.evidence.slice(0, 4)) lines.push(`  - Evidence: ${evidence}`);
      lines.push(`  - Fix: ${issue.suggestion}`);
    }
  }
  if (report.catalogIssues.length > 0) {
    lines.push('');
    lines.push('## Catalog-level issues');
    for (const issue of report.catalogIssues) {
      lines.push(`- **${issue.severity.toUpperCase()}** [${issue.auditRef ?? 'n/a'}] ${issue.message}`);
      for (const evidence of issue.evidence) lines.push(`  - ${evidence}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const { client, dataSource } = createCommerceClient(config, logger);
  const limit = Number.parseInt(arg('limit') ?? '', 10) || config.audit.scanLimit;
  const output = arg('output') ?? path.join('reports', `audit-${new Date().toISOString().slice(0, 10)}.json`);

  const service = new AuditService(client, config, logger);
  const report = await service.catalog({ limit, refresh: true });

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2), 'utf8');
  const markdownPath = output.replace(/\.json$/i, '.md');
  fs.writeFileSync(markdownPath, toMarkdown(report), 'utf8');

  console.log('');
  console.log(`Data source      : ${dataSource.toUpperCase()}${dataSource === 'fixture' ? ' (MOCK DATA)' : ''}`);
  console.log(`Products scanned : ${report.scannedProducts}`);
  console.log(`Average score    : ${report.summary.averageScore}/100`);
  console.log(
    `Severities       : critical=${report.summary.issueCounts.critical} high=${report.summary.issueCounts.high} medium=${report.summary.issueCounts.medium} low=${report.summary.issueCounts.low} info=${report.summary.issueCounts.info}`,
  );
  console.log(`JSON report      : ${path.resolve(output)}`);
  console.log(`Markdown report  : ${path.resolve(markdownPath)}`);
  console.log('');
  console.log('Top issues:');
  for (const issue of report.summary.topIssues.slice(0, 10)) {
    console.log(`  - ${issue.count}x [${issue.severity}] ${issue.code}: ${issue.title}`);
  }
  if (dataSource === 'fixture') {
    console.log('');
    console.log('NOTE: no Shopify credentials in this environment â€” the report is generated from fixtures.');
  }
}

void main().catch((error: unknown) => {
  console.error('Audit report failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});


