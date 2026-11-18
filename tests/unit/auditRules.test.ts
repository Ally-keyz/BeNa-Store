import { describe, expect, it } from 'vitest';
import { fixtureProducts } from '../../src/fixtures/mock/data';
import { evaluateProduct, isFoodProduct } from '../../src/services/auditRules';
import type { Product } from '../../src/types/domain';

const options = {
  minImages: 3,
  foodKeywords: [
    'coffee',
    'juice',
    'syrup',
    'biscuit',
    'margarine',
    'oil',
    'flour',
    'rice',
    'beans',
    'tea',
    'chocolate',
    'snack',
    'food',
    'spice',
    'sauce',
    'drink',
  ],
  metafieldsAvailable: true,
};

function byHandle(handle: string): Product {
  const product = fixtureProducts.find((entry) => entry.handle === handle);
  if (!product) throw new Error(`Fixture not found: ${handle}`);
  return product;
}

function codes(handle: string, extra: Partial<typeof options> = {}): string[] {
  return evaluateProduct(byHandle(handle), { ...options, ...extra }).issues.map(
    (issue) => issue.code,
  );
}

describe('audit rules', () => {
  it('detects the Coming Soon / purchasable contradiction (audit #9) and generic handle (#11)', () => {
    const result = evaluateProduct(byHandle('coming-soon'), {
      ...options,
      duplicateTitleHandles: ['coming-soon-1'],
    });
    const issueCodes = result.issues.map((issue) => issue.code);
    expect(issueCodes).toContain('COMING_SOON_CONTRADICTION');
    expect(issueCodes).toContain('GENERIC_HANDLE');
    expect(issueCodes).toContain('DUPLICATE_TITLE');
    expect(issueCodes).toContain('FEW_IMAGES');
    expect(issueCodes).toContain('MISSING_ALT_TEXT');
    expect(result.issues.find((issue) => issue.code === 'COMING_SOON_CONTRADICTION')?.auditRef).toBe(
      '#9',
    );
    expect(result.score).toBeLessThan(60);
  });

  it('flags ambiguous preparation instructions (#12) and inconsistent units (#14)', () => {
    const resultCodes = codes('agashya-juice-syrup');
    expect(resultCodes).toContain('PREPARATION_AMBIGUOUS');
    expect(resultCodes).toContain('INCONSISTENT_UNITS');
    expect(resultCodes).toContain('SALE_PRICE_VERIFICATION_REQUIRED');
    expect(resultCodes).toContain('MISSING_UNIT_PRICE');
  });

  it('flags compare-at price 0.00 (#15) and unemphasized allergens (#4)', () => {
    const resultCodes = codes('blueband-margarine');
    expect(resultCodes).toContain('COMPARE_AT_INVALID');
    expect(resultCodes).toContain('ALLERGENS_NOT_EMPHASIZED');
    expect(resultCodes).toContain('MISSING_FOOD_INFORMATION');
  });

  it('flags missing unit price and food information for biscuits', () => {
    const result = evaluateProduct(byHandle('akarabo-biscuits'), options);
    const resultCodes = result.issues.map((issue) => issue.code);
    expect(resultCodes).toContain('ALLERGENS_NOT_EMPHASIZED');
    expect(resultCodes).toContain('MISSING_FOOD_INFORMATION');
    expect(resultCodes).toContain('MISSING_UNIT_PRICE');
    expect(result.issueCounts.high).toBeGreaterThanOrEqual(2);
  });

  it('scores a compliant product highly and still flags sale-price verification (#5)', () => {
    const result = evaluateProduct(byHandle('rwanda-coffee-250g'), options);
    const resultCodes = result.issues.map((issue) => issue.code);
    expect(resultCodes).toContain('SALE_PRICE_VERIFICATION_REQUIRED');
    expect(resultCodes).not.toContain('MISSING_UNIT_PRICE');
    expect(resultCodes).not.toContain('MISSING_FOOD_INFORMATION');
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe('A');
    expect(result.isFood).toBe(true);
  });

  it('marks food metafields as unverified (not missing) without token access', () => {
    const result = evaluateProduct(byHandle('akabanga-chill-oil'), {
      ...options,
      metafieldsAvailable: false,
    });
    const resultCodes = result.issues.map((issue) => issue.code);
    expect(resultCodes).toContain('FOOD_INFORMATION_UNVERIFIED');
    expect(resultCodes).not.toContain('MISSING_FOOD_INFORMATION');
    const unverified = result.issues.find((issue) => issue.code === 'FOOD_INFORMATION_UNVERIFIED');
    expect(unverified?.severity).toBe('info');
  });

  it('detects food products heuristically and ignores crafts', () => {
    expect(isFoodProduct(byHandle('rwanda-coffee-250g'), options.foodKeywords)).toBe(true);
    expect(isFoodProduct(byHandle('coming-soon'), options.foodKeywords)).toBe(false);
  });
});

