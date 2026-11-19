export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface AuditIssue {
  /** Stable machine-readable code, e.g. COMING_SOON_CONTRADICTION. */
  code: string;
  title: string;
  severity: AuditSeverity;
  /** Reference to the October 2026 audit finding, e.g. "#9". */
  auditRef: string | null;
  message: string;
  evidence: string[];
  suggestion: string;
}

export type AuditGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface ProductAudit {
  productId: string;
  handle: string;
  title: string;
  url: string;
  isFood: boolean;
  score: number;
  grade: AuditGrade;
  issues: AuditIssue[];
  issueCounts: Record<AuditSeverity, number>;
  /** False when no token/metafield exposure: food checks are partial. */
  metafieldsAvailable: boolean;
  checkedAt: string;
}

export interface CatalogAudit {
  generatedAt: string;
  dataSource: 'shopify' | 'fixture';
  scannedProducts: number;
  scanLimit: number;
  scanLimitReached: boolean;
  cache: { hit: boolean; ttlSeconds: number };
  summary: {
    products: number;
    averageScore: number;
    gradeDistribution: Record<AuditGrade, number>;
    issueCounts: Record<AuditSeverity, number>;
    topIssues: Array<{ code: string; count: number; severity: AuditSeverity; title: string }>;
  };
  products: ProductAudit[];
  catalogIssues: AuditIssue[];
  warnings: string[];
}

export interface ShippingFinding {
  code: string;
  severity: AuditSeverity;
  message: string;
  evidence: string[];
  auditRef: string | null;
}

export interface ShippingInfo {
  policy: {
    title: string;
    url: string | null;
    summary: string;
    euroAmounts: string[];
  } | null;
  markets: {
    availableCountries: Array<{ isoCode: string; name: string; currency: string }>;
    advertisedCountries: string[];
    advertisedButUnavailable: string[];
    availableButNotAdvertised: string[];
  };
  claims: {
    worldwide: boolean;
    evidence: string | null;
    mismatch: boolean;
  };
  guidance: {
    hasUsableRateTable: boolean;
    rateExamples: string[];
    gaps: string[];
  };
  cartEstimate: {
    cartId: string;
    countryCode: string | null;
    deliveryGroups: Array<{
      id: string;
      groupType: string;
      options: Array<{ title: string | null; amount: string; currencyCode: string; method: string }>;
    }>;
  } | null;
  findings: ShippingFinding[];
  limitations: string[];
  generatedAt: string;
}
