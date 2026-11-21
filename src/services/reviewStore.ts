import type { ProductReview } from '../types/domain';

/**
 * Customer-submitted reviews are kept in process memory only.
 *
 * The storefront has no database/Redis dependency, so submissions survive for
 * the lifetime of the backend process and are merged into the public review
 * feed. The trade-off is that they are lost on restart; a durable store would
 * be needed before treating this as permanent review history.
 */
export interface ReviewStore {
  readonly kind: 'memory';
  add(productHandle: string, review: ProductReview): Promise<void>;
  list(productHandle: string): Promise<ProductReview[]>;
}

const MAX_REVIEWS_PER_PRODUCT = 200;
const MAX_REVIEWS_TOTAL = 10_000;

export class MemoryReviewStore implements ReviewStore {
  readonly kind = 'memory' as const;
  private readonly byProduct = new Map<string, ProductReview[]>();
  private total = 0;

  async add(productHandle: string, review: ProductReview): Promise<void> {
    const key = productHandle.trim().toLowerCase();
    const existing = this.byProduct.get(key) ?? [];
    existing.push(review);
    while (existing.length > MAX_REVIEWS_PER_PRODUCT) {
      existing.shift();
      this.total -= 1;
    }
    this.byProduct.set(key, existing);
    this.total += 1;

    while (this.total > MAX_REVIEWS_TOTAL) {
      const oldestKey = this.byProduct.keys().next().value as string | undefined;
      if (!oldestKey) break;
      const entries = this.byProduct.get(oldestKey);
      entries?.shift();
      this.total -= 1;
      if (!entries?.length) this.byProduct.delete(oldestKey);
    }
  }

  async list(productHandle: string): Promise<ProductReview[]> {
    const entries = this.byProduct.get(productHandle.trim().toLowerCase()) ?? [];
    return [...entries].reverse();
  }
}

export function createReviewStore(): ReviewStore {
  return new MemoryReviewStore();
}
