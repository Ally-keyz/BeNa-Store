import type { Product, ProductVariant } from '../types/domain';
import type { AuditGrade, AuditIssue, AuditSeverity, ProductAudit } from '../types/audit';
import { AUDIT_ISSUE_WEIGHTS } from '../config/constants';
import {
  isEmphasizedInHtml,
  normalizeForComparison,
  sentenceContaining,
  stripHtml,
  truncate,
} from '../utils/html';
import { toAmount } from '../utils/money';

export interface AuditRuleOptions {
  minImages: number;
  foodKeywords: string[];
  metafieldsAvailable: boolean;
  /** Handles of other products sharing a normalized title (catalog check). */
  duplicateTitleHandles?: string[];
}

const ALLERGEN_KEYWORDS = [
  'wheat',
  'weizen',
  'gluten',
  'milk',
  'milch',
  'butter',
  'egg',
  'eggs',
  'ei',
  'eier',
  'soy',
  'soja',
  'nut',
  'nuts',
  'nüsse',
  'peanut',
  'erdnuss',
  'sesame',
  'sesam',
  'mustard',
  'senf',
  'celery',
  'sellerie',
  'fish',
  'fisch',
  'crustacean',
  'krebstier',
  'lupin',
  'lupine',
  'sulphite',
  'sulfite',
  'lactose',
  'laktose',
];

const GENERIC_HANDLE = /^(coming-soon(-\d+)?|product(-\d+)?|item(-\d+)?|test(-\d+)?|untitled(-.*)?|shop(-\d+)?)$/i;

const PREP_TRIGGER = /(concentrate|konzentrat|syrup|sirup|powder|pulver|instant|mix|mixing|dilute|zubereit|anrühr)/i;
const PREP_ACTION = /(mix|dilute|stir|prepare|preparation|brew|cook|serve|zubereiten|anrühren|vermischen|kochen|brühen|servieren)/i;
const MEASUREMENT = /(\d+(?:[.,]\d+)?)\s?(ml|mL|Ml|ML|l|L|cl|g|G|gr|kg|Kg|KG|mg|tasse|cup|teelöffel|esslöffel|tbsp|tsp)\b/;
const LIQUID = /(water|wasser|milk|milch|juice|saft|oil|öl|yogurt|joghurt|tea|tee|coffee|kaffee|soda|sprudel)/i;
const CANONICAL_UNITS = new Set(['ml', 'mL', 'l', 'L', 'cl', 'g', 'kg', 'mg']);

function issue(
  code: string,
  title: string,
  severity: AuditSeverity,
  auditRef: string | null,
  message: string,
  evidence: string[],
  suggestion: string,
): AuditIssue {
  return { code, title, severity, auditRef, message, evidence, suggestion };
}

export function isFoodProduct(product: Product, foodKeywords: string[]): boolean {
  const haystack = normalizeForComparison(
    `${product.productType} ${product.tags.join(' ')} ${product.title} ${product.description}`,
  );
  if (!haystack) return false;
  return foodKeywords.some((keyword) => {
    const normalized = keyword.trim().toLowerCase();
    return normalized.length > 0 && haystack.includes(normalized);
  });
}

function checkComingSoon(product: Product, issues: AuditIssue[]): void {
  const haystack = `${product.title} ${product.tags.join(' ')} ${product.description}`;
  const match = /\bcoming[\s-]?soon\b/i.exec(haystack);
  if (!match) return;
  const purchasable =
    product.availableForSale || product.variants.some((variant) => variant.availableForSale);
  if (!purchasable) return;

  issues.push(
    issue(
      'COMING_SOON_CONTRADICTION',
      '"Coming Soon" while purchasable',
      'high',
      '#9',
      'The product is labelled "Coming Soon" but is available for sale / add-to-cart.',
      [
        `Matched "${match[0]}" in title/tags/description.`,
        `availableForSale=${String(product.availableForSale)}; variants available=${String(
          product.variants.filter((variant) => variant.availableForSale).length,
        )}/${product.variants.length}.`,
      ],
      'Either unpublish/disable purchasing until launch, or remove the "Coming Soon" wording and stale launch copy.',
    ),
  );
}

function checkStaleLaunchCopy(product: Product, issues: AuditIssue[], comingSoonFound: boolean): void {
  if (comingSoonFound || !product.availableForSale) return;
  const text = `${product.title} ${product.description}`;
  const match = /\bsoon\b/i.exec(text);
  if (!match) return;
  issues.push(
    issue(
      'STALE_LAUNCH_COPY',
      'Launch copy still says "soon"',
      'low',
      '#13',
      'Purchasable product copy still uses "soon" wording, suggesting outdated launch messaging.',
      [sentenceContaining(text, 'soon') ?? 'Matched "soon" in product copy.'],
      'Refresh the product story with an active purchase call-to-action.',
    ),
  );
}

function checkGenericHandle(product: Product, issues: AuditIssue[]): void {
  if (!GENERIC_HANDLE.test(product.handle)) return;
  issues.push(
    issue(
      'GENERIC_HANDLE',
      'Generic product handle',
      'high',
      '#11',
      `The handle "${product.handle}" is not descriptive and undermines product URLs.`,
      [`/products/${product.handle}`],
      'Rename the handle to a descriptive slug and add a Shopify URL redirect for the old URL.',
    ),
  );
}

function checkDuplicateTitle(issues: AuditIssue[], duplicateHandles?: string[]): void {
  if (!duplicateHandles || duplicateHandles.length === 0) return;
  issues.push(
    issue(
      'DUPLICATE_TITLE',
      'Duplicate product title',
      'medium',
      '#10',
      'Another product uses the same normalized title, obscuring the difference between products.',
      duplicateHandles.map((handle) => `/products/${handle}`),
      'Differentiate the titles (colorway/size) or merge the products as variants.',
    ),
  );
}

function checkNamingAndUnits(product: Product, issues: AuditIssue[]): void {
  const sources = [product.title, stripHtml(product.description)];
  const anomalies: string[] = [];
  const tokenFamilies = new Map<string, Set<string>>();

  const regex = /(\d+(?:[.,]\d+)?)\s?(ml|mL|Ml|ML|l|L|cl|Cl|CL|g|G|gr|Gr|kg|Kg|KG|mg|Mg)\b/g;
  for (const source of sources) {
    for (const match of source.matchAll(regex)) {
      const unit = match[2]!;
      if (!CANONICAL_UNITS.has(unit)) {
        const normalizedFamily = unit.toLowerCase().replace('gr', 'g');
        anomalies.push(`"${match[0]}" (unusual casing for ${normalizedFamily})`);
      }
      const family = unit.toLowerCase().replace('gr', 'g');
      const set = tokenFamilies.get(family) ?? new Set<string>();
      set.add(unit);
      tokenFamilies.set(family, set);
    }
  }

  for (const [family, variants] of tokenFamilies) {
    if (variants.size > 1) {
      anomalies.push(`Unit "${family}" appears as ${[...variants].join(', ')} in the same product.`);
    }
  }

  if (anomalies.length === 0) return;
  issues.push(
    issue(
      'INCONSISTENT_UNITS',
      'Inconsistent naming/units',
      anomalies.length >= 2 ? 'medium' : 'low',
      '#14',
      'Product naming uses inconsistent unit casing/formatting (e.g. "100Ml", "1Kg").',
      [...new Set(anomalies)].slice(0, 6),
      'Apply a product-copy style guide: one casing per unit, a space between number and unit, e.g. "100 ml", "1 kg".',
    ),
  );
}

function checkCompareAtPrices(product: Product, issues: AuditIssue[]): void {
  const invalid: string[] = [];
  const sale: string[] = [];
  const examine = (variant: ProductVariant) => {
    if (!variant.compareAtPrice) return;
    const compare = toAmount(variant.compareAtPrice);
    const price = toAmount(variant.price);
    const label = `${variant.title}: price ${variant.price.amount} ${variant.price.currencyCode}, compare-at ${variant.compareAtPrice.amount}`;
    if (compare === 0) {
      invalid.push(`${label} (compare-at is 0.00)`);
    } else if (compare <= price) {
      invalid.push(`${label} (compare-at is not above the selling price)`);
    } else {
      sale.push(label);
    }
  };
  product.variants.forEach(examine);

  if (invalid.length > 0) {
    issues.push(
      issue(
        'COMPARE_AT_INVALID',
        'Invalid compare-at price',
        'high',
        '#15',
        'A compare-at price is 0.00 or not higher than the selling price, producing a misleading strike-through price.',
        invalid,
        'Correct or remove the compare-at price. Do not display a comparison price that is not above the current price.',
      ),
    );
  }

  if (sale.length > 0) {
    issues.push(
      issue(
        'SALE_PRICE_VERIFICATION_REQUIRED',
        'Sale price needs 30-day prior-price verification',
        'low',
        '#5',
        'A sale price is present. The Storefront API cannot prove the price history, so German prior-price rules cannot be verified from API data.',
        sale.slice(0, 6),
        'Verify the 30-day lowest prior price for each sale variant before displaying the comparison; retain price-history evidence.',
      ),
    );
  }
}

function checkUnitPrice(product: Product, issues: AuditIssue[], isFood: boolean): void {
  if (!isFood) return;
  const missingUnit = product.variants.filter((variant) => !variant.unitPrice);
  const missingMeasurement = product.variants.filter(
    (variant) => variant.unitPrice && !variant.unitPriceMeasurement,
  );

  if (missingUnit.length === product.variants.length && product.variants.length > 0) {
    issues.push(
      issue(
        'MISSING_UNIT_PRICE',
        'Missing unit price on a food item',
        'high',
        '#2',
        'Food products must show a unit price (€/kg or €/l). No variant exposes unitPrice.',
        product.variants.map((variant) => `${variant.title}: unitPrice=null`),
        'Configure unit price and unit price measurement on each applicable variant in Shopify.',
      ),
    );
  } else if (missingUnit.length > 0) {
    issues.push(
      issue(
        'MISSING_UNIT_PRICE_VARIANTS',
        'Unit price missing on some variants',
        'medium',
        '#2',
        'Only part of the variants expose a unit price.',
        missingUnit.map((variant) => `${variant.title}: unitPrice=null`),
        'Configure unit price for every applicable variant so all price displays are compliant.',
      ),
    );
  }

  if (missingMeasurement.length > 0) {
    issues.push(
      issue(
        'UNIT_PRICE_MEASUREMENT_MISSING',
        'Unit price measurement incomplete',
        'medium',
        '#2',
        'unitPrice exists but unitPriceMeasurement is missing, so €/kg or €/l cannot be displayed reliably.',
        missingMeasurement.map((variant) => `${variant.title}: unitPriceMeasurement=null`),
        'Set the measurement reference (e.g. 1 kg / 1 l) for the variant unit price.',
      ),
    );
  }
}

function checkFoodInformation(
  product: Product,
  issues: AuditIssue[],
  isFood: boolean,
  metafieldsAvailable: boolean,
): void {
  if (!isFood) return;
  const text = stripHtml(product.descriptionHtml || product.description).toLowerCase();
  const missing: string[] = [];
  if (!product.metafields.nutrition && !/(nutrition|nährwert|nahrungswert|energy|energie|kcal|kj)/i.test(text)) {
    missing.push('nutrition declaration');
  }
  if (!product.metafields.ingredients && !/(ingredients|zutaten)/i.test(text)) {
    missing.push('ingredients');
  }
  if (!product.metafields.origin && !/(origin|herkunft|ursprung|made in|hergestellt)/i.test(text)) {
    missing.push('origin');
  }

  if (missing.length > 0) {
    if (metafieldsAvailable) {
      issues.push(
        issue(
          'MISSING_FOOD_INFORMATION',
          'Mandatory food information missing',
          'high',
          '#3',
          'Mandatory pre-purchase food information is missing from exposed metafields and the description.',
          missing,
          'Expose nutrition, ingredients and origin metafields to the Storefront API and render them on the product page. Verify against packaging and EU distance-selling requirements.',
        ),
      );
    } else {
      issues.push(
        issue(
          'FOOD_INFORMATION_UNVERIFIED',
          'Food information could not be verified',
          'info',
          '#3',
          'No Storefront token/metafield exposure: nutrition, ingredients and origin cannot be verified from the API.',
          [...missing, 'Storefront metafields unavailable'],
          'Provide a Storefront private token and expose the food metafield definitions to report this reliably.',
        ),
      );
    }
  }

  // Allergen emphasis (audit #4). Risk flag only.
  const allergenMetafield = product.metafields.allergens?.value;
  const foundKeywords = ALLERGEN_KEYWORDS.filter((keyword) =>
    new RegExp(`\\b${keyword}\\b`, 'i').test(text),
  );
  const mentionsAllergenSection = /(allergen|allergie|enthält|contains)/i.test(text);

  if (!allergenMetafield && foundKeywords.length > 0) {
    const emphasized = foundKeywords.filter((keyword) =>
      isEmphasizedInHtml(product.descriptionHtml, keyword),
    );
    if (emphasized.length === 0) {
      issues.push(
        issue(
          'ALLERGENS_NOT_EMPHASIZED',
          'Allergens are not emphasized',
          'medium',
          '#4',
          'Allergen ingredients appear as plain text without consistent emphasis (bold/highlight/allergen section).',
          foundKeywords.slice(0, 6).map((keyword) => `${keyword}: ${sentenceContaining(text, keyword) ?? keyword}`),
          'Emphasize allergens consistently (e.g. bold the allergen terms and add a dedicated allergens block). Legal review recommended.',
        ),
      );
    }
  } else if (!allergenMetafield && foundKeywords.length === 0) {
    if (!mentionsAllergenSection) {
      issues.push(
        issue(
          'ALLERGENS_MISSING',
          'Allergen information missing',
          metafieldsAvailable ? 'medium' : 'info',
          '#3',
          metafieldsAvailable
            ? 'No allergen metafield and no allergen statement were found for this food product.'
            : 'Allergen information could not be verified without metafield access.',
          metafieldsAvailable ? ['No allergens metafield', 'No allergen statement in description'] : [],
          'Add a complete allergens declaration (EU 14 allergens) and expose it via a metafield.',
        ),
      );
    } else {
      issues.push(
        issue(
          'ALLERGEN_STATEMENT_NOT_VERIFIABLE',
          'Allergen statement is not verifiable',
          'low',
          '#4',
          'The description mentions allergens but does not name them, so the declaration cannot be verified.',
          [sentenceContaining(text, 'allergen') ?? 'Allergen section detected'],
          'State each allergen explicitly or declare "none" with verified sourcing information.',
        ),
      );
    }
  }
}

function checkPreparation(product: Product, issues: AuditIssue[], isFood: boolean): void {
  if (!isFood) return;
  if (product.metafields.preparation?.value) return;

  const text = stripHtml(product.descriptionHtml || product.description);
  const trigger = PREP_TRIGGER.test(`${product.title} ${product.productType} ${text}`);
  if (!trigger) return;

  const hasAction = PREP_ACTION.test(text);
  const hasMeasurement = MEASUREMENT.test(text);
  const hasLiquid = LIQUID.test(text);
  const saysMixWith = /mix\s+(it\s+)?with/i.test(text);

  if (saysMixWith && !hasLiquid) {
    issues.push(
      issue(
        'PREPARATION_AMBIGUOUS',
        'Preparation instructions are ambiguous',
        'high',
        '#12',
        'The product says to mix "with" a quantity but does not name the liquid or explain preparation.',
        [sentenceContaining(text, 'mix') ?? truncate(text, 160)],
        'Name the liquid (e.g. water, milk), state the exact dilution and serving directions, and clarify whether the product is a concentrate or syrup.',
      ),
      );
    return;
  }

  if (!hasAction || !hasMeasurement) {
    issues.push(
      issue(
        'PREPARATION_MISSING',
        'Preparation instructions incomplete',
        'medium',
        '#12',
        'This product appears to require preparation, but the description lacks clear action + quantity + liquid information.',
        [
          `actionKeyword=${String(hasAction)}; measurement=${String(hasMeasurement)}; liquidNamed=${String(hasLiquid)}`,
          truncate(text, 160),
        ],
        'Add exact preparation steps (concentrate type, dilution ratio, liquid, serving size).',
      ),
    );
  }
}

function checkImages(product: Product, issues: AuditIssue[], minImages: number): void {
  if (product.images.length === 0) {
    issues.push(
      issue(
        'NO_IMAGES',
        'No product images',
        'high',
        'catalog-standard',
        'The product has no images, preventing customers from evaluating it.',
        [],
        'Upload high-quality product photography, including alt text.',
      ),
    );
    return;
  }

  if (product.images.length < minImages) {
    issues.push(
      issue(
        'FEW_IMAGES',
        'Fewer images than the catalog standard',
        'medium',
        'catalog-standard',
        `The product has ${product.images.length} image(s); the standard is at least ${minImages}.`,
        product.images.map((image) => image.url),
        'Add product photography from multiple angles and in context.',
      ),
    );
  }

  const missingAlt = product.images.filter((image) => !image.altText || image.altText.trim() === '');
  if (missingAlt.length > 0) {
    issues.push(
      issue(
        'MISSING_ALT_TEXT',
        'Missing image alt text',
        'low',
        'catalog-standard',
        `${missingAlt.length} of ${product.images.length} image(s) have no alt text.`,
        missingAlt.slice(0, 5).map((image) => image.url),
        'Add descriptive alt text to every product image (accessibility and SEO).',
      ),
    );
  }
}

function gradeFor(score: number): AuditGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

const SEVERITIES: AuditSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];

function emptyCounts(): Record<AuditSeverity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

export function evaluateProduct(product: Product, options: AuditRuleOptions): ProductAudit {
  const issues: AuditIssue[] = [];
  const food = isFoodProduct(product, options.foodKeywords);

  checkComingSoon(product, issues);
  const comingSoonFound = issues.some((entry) => entry.code === 'COMING_SOON_CONTRADICTION');
  checkStaleLaunchCopy(product, issues, comingSoonFound);
  checkDuplicateTitle(issues, options.duplicateTitleHandles);
  checkGenericHandle(product, issues);
  checkNamingAndUnits(product, issues);
  checkCompareAtPrices(product, issues);
  checkUnitPrice(product, issues, food);
  checkFoodInformation(product, issues, food, options.metafieldsAvailable);
  checkPreparation(product, issues, food);
  checkImages(product, issues, options.minImages);

  const issueCounts = emptyCounts();
  for (const entry of issues) issueCounts[entry.severity] += 1;

  const penalty = issues.reduce(
    (total, entry) => total + AUDIT_ISSUE_WEIGHTS[entry.severity],
    0,
  );
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    productId: product.id,
    handle: product.handle,
    title: product.title,
    url: product.url,
    isFood: food,
    score,
    grade: gradeFor(score),
    issues: issues.sort(
      (a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity),
    ),
    issueCounts,
    metafieldsAvailable: options.metafieldsAvailable,
    checkedAt: new Date().toISOString(),
  };
}

export { SEVERITIES as AUDIT_SEVERITIES, emptyCounts as emptyIssueCounts, gradeFor };
