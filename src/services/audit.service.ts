import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type { CommerceClient, MarketContext, Product } from '../types/domain';
import type {
  AuditGrade,
  AuditIssue,
  AuditSeverity,
  CatalogAudit,
  ProductAudit,
} from '../types/audit';
import { normalizeForComparison } from '../utils/html';
import { evaluateProduct } from './auditRules';
import { notFound } from '../utils/errors';

interface CacheEntry {
  at: number;
  data: CatalogAudit;
}

interface CatalogAuditParams extends MarketContext {
  limit?: number;
  refresh?: boolean;
}

/**
 * Bulk product-information completeness reporting.
 * Read-only: no product, price, inventory or collection data is ever changed.
 */
export class AuditService {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private readonly client: CommerceClient,
    private readonly config: AppConfig,
    private readonly logger: Logger,
  ) {}

  async catalog(params: CatalogAuditParams = {}): Promise<CatalogAudit> {
    const limit = Math.min(
      Math.max(params.limit ?? this.config.audit.scanLimit, 1),
      this.config.audit.scanLimit,
    );
    const key = `${params.country ?? ''}|${params.language ?? ''}|${limit}`;
    const ttl = this.config.audit.cacheTtlSeconds;

    if (!params.refresh && ttl > 0) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.at < ttl * 1000) {
        return { ...cached.data, cache: { hit: true, ttlSeconds: ttl } };
      }
    }

    const { products, truncated } = await this.fetchProducts(limit, params);
    const warnings: string[] = [];

    if (!this.client.capabilities.metafields) {
      warnings.push(
        'Storefront token missing or metafields not exposed: nutrition, ingredients, allergens and origin are unverified, not confirmed missing.',
      );
    } else if (
      products.length > 0 &&
      products.every(
        (product) =>
          !product.metafields.nutrition &&
          !product.metafields.ingredients &&
          !product.metafields.allergens &&
          !product.metafields.origin &&
          !product.metafields.preparation,
      )
    ) {
      warnings.push(
        'A token is configured but no food metafield values were returned. Confirm that the definitions (nutrition, ingredients, allergens, origin, preparation) are exposed to the Storefront API and that the namespace/key match SHOPIFY_METAFIELD_* settings.',
      );
    }
    if (truncated) {
      warnings.push(
        `Scan limited to ${limit} products (AUDIT_PRODUCT_SCAN_LIMIT). Duplicate-title detection may be incomplete.`,
      );
    }
    if (this.config.shopify.useFixtures) {
      warnings.push('FIXTURE MODE: audit runs against hand-authored mock products, not live Shopify data.');
    }

    const titleGroups = new Map<string, Product[]>();
    for (const product of products) {
      const normalized = normalizeForComparison(product.title);
      const group = titleGroups.get(normalized) ?? [];
      group.push(product);
      titleGroups.set(normalized, group);
    }

    const catalogIssues: AuditIssue[] = [];
    for (const [normalizedTitle, group] of titleGroups.entries()) {
      if (group.length < 2) continue;
      catalogIssues.push({
        code: 'DUPLICATE_TITLE_GROUP',
        title: 'Duplicate product titles in catalog',
        severity: 'medium',
        auditRef: '#10',
        message: `${group.length} products share the normalized title "${normalizedTitle}".`,
        evidence: group.map((product) => `/products/${product.handle} — "${product.title}"`),
        suggestion:
          'Differentiate titles by colorway/variant or merge the products into one product with variants.',
      });
    }

    const audits = products.map((product) => {
      const normalized = normalizeForComparison(product.title);
      const duplicates = (titleGroups.get(normalized) ?? [])
        .filter((entry) => entry.id !== product.id)
        .map((entry) => entry.handle);
      return evaluateProduct(product, {
        minImages: this.config.audit.minImages,
        foodKeywords: this.config.audit.foodKeywords,
        metafieldsAvailable: this.client.capabilities.metafields,
        duplicateTitleHandles: duplicates,
      });
    });

    const issueCounts: Record<AuditSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    const gradeDistribution: Record<AuditGrade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    const issueCodeCounts = new Map<string, { count: number; severity: AuditSeverity; title: string }>();

    for (const audit of audits) {
      for (const severity of Object.keys(issueCounts) as AuditSeverity[]) {
        issueCounts[severity] += audit.issueCounts[severity];
      }
      gradeDistribution[audit.grade] += 1;
      for (const issue of audit.issues) {
        const existing = issueCodeCounts.get(issue.code) ?? {
          count: 0,
          severity: issue.severity,
          title: issue.title,
        };
        existing.count += 1;
        issueCodeCounts.set(issue.code, existing);
      }
    }

    const averageScore =
      audits.length === 0
        ? 0
        : Math.round((audits.reduce((sum, audit) => sum + audit.score, 0) / audits.length) * 10) / 10;

    const data: CatalogAudit = {
      generatedAt: new Date().toISOString(),
      dataSource: this.client.mode,
      scannedProducts: audits.length,
      scanLimit: limit,
      scanLimitReached: truncated,
      cache: { hit: false, ttlSeconds: ttl },
      summary: {
        products: audits.length,
        averageScore,
        gradeDistribution,
        issueCounts,
        topIssues: [...issueCodeCounts.entries()]
          .map(([code, value]) => ({ code, ...value }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15),
      },
      products: audits.sort((a, b) => a.score - b.score),
      catalogIssues,
      warnings,
    };

    if (ttl > 0) {
      this.cache.set(key, { at: Date.now(), data });
      this.logger.debug({ key, products: audits.length }, 'audit report cached');
    }

    return data;
  }

  async product(handle: string, ctx?: MarketContext): Promise<ProductAudit> {
    const product = await this.client.getProductByHandle(handle, ctx);
    if (!product) throw notFound('Product', handle);
    return evaluateProduct(product, {
      minImages: this.config.audit.minImages,
      foodKeywords: this.config.audit.foodKeywords,
      metafieldsAvailable: this.client.capabilities.metafields,
    });
  }

  private async fetchProducts(
    limit: number,
    params: MarketContext,
  ): Promise<{ products: Product[]; truncated: boolean }> {
    const products: Product[] = [];
    let after: string | undefined;
    let truncated = false;

    while (products.length < limit) {
      const page = await this.client.listProducts({
        first: Math.min(100, limit - products.length),
        after,
        includeMetafields: true,
        sortKey: 'TITLE',
        reverse: false,
        country: params.country,
        language: params.language,
      });
      products.push(...page.items);
      if (products.length >= limit) {
        truncated = page.pageInfo.hasNextPage;
        break;
      }
      if (!page.pageInfo.hasNextPage) break;
      if (!page.pageInfo.endCursor) {
        truncated = true;
        break;
      }
      after = page.pageInfo.endCursor;
    }

    return { products, truncated };
  }
}
