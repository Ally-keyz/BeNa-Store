import { z } from 'zod';
import {
  booleanQuery,
  handleParams,
  marketContextQuery,
  paginationQuery,
} from './common';
import { MAX_CART_LINES, MAX_LINE_QUANTITY } from '../config/constants';

// -------------------------------------------------------------- products ---

export const listProductsQuery = paginationQuery
  .extend({
    query: z.string().trim().max(200).optional(),
    sortKey: z
      .enum([
        'BEST_SELLING',
        'CREATED_AT',
        'ID',
        'PRICE',
        'RELEVANCE',
        'TITLE',
        'UPDATED_AT',
        'VENDOR',
      ])
      .optional(),
    reverse: booleanQuery.optional(),
  })
  .merge(marketContextQuery);

export const productByHandle = handleParams.merge(marketContextQuery);

// ----------------------------------------------------------- collections ---

export const listCollectionsQuery = paginationQuery
  .merge(marketContextQuery)
  .extend({
    query: z.string().trim().max(200).optional(),
    sortKey: z.enum(['HANDLE', 'ID', 'RELEVANCE', 'TITLE', 'UPDATED_AT']).optional(),
    reverse: booleanQuery.optional(),
  });

export const collectionByHandle = handleParams
  .merge(marketContextQuery)
  .extend({
    first: z.coerce.number().int().min(1).max(100).default(20),
    after: z.string().trim().min(1).max(1024).optional(),
    sortKey: z
      .enum([
        'COLLECTION_DEFAULT',
        'BEST_SELLING',
        'CREATED',
        'ID',
        'MANUAL',
        'PRICE',
        'RELEVANCE',
        'TITLE',
      ])
      .optional(),
    reverse: booleanQuery.optional(),
  });

/** Collection detail query params only (no `handle`, which lives in the path). */
export const collectionDetailQuery = collectionByHandle.omit({ handle: true });

// ---------------------------------------------------------------- search ---

export const searchQuery = paginationQuery
  .merge(marketContextQuery)
  .extend({
    q: z.string().trim().min(1, 'q is required').max(200),
  });

export const suggestionsQuery = marketContextQuery
  .extend({
    q: z.string().trim().min(1, 'q is required').max(120),
    limit: z.coerce.number().int().min(1).max(10).default(8),
    unavailableProducts: z.enum(['LAST', 'SHOW', 'HIDE']).optional(),
  });

// ------------------------------------------------------------------ cart ---

const cartLineInput = z.object({
  merchandiseId: z
    .string()
    .trim()
    .min(10)
    .max(600)
    .startsWith('gid://shopify/ProductVariant/', 'merchandiseId must be a product variant GID'),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QUANTITY),
  attributes: z
    .array(z.object({ key: z.string().trim().min(1).max(100), value: z.string().max(500) }))
    .max(20)
    .optional(),
});

const buyerIdentity = z.object({
  email: z.email().max(254).optional(),
  phone: z.string().trim().min(3).max(32).optional(),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
  customerAccessToken: z.string().trim().min(10).max(2000).optional(),
});

export const createCartBody = z.object({
  lines: z.array(cartLineInput).min(1).max(MAX_CART_LINES).optional(),
  buyerIdentity: buyerIdentity.optional(),
  discountCodes: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  note: z.string().trim().max(500).optional(),
  attributes: z
    .array(z.object({ key: z.string().trim().min(1).max(100), value: z.string().max(500) }))
    .max(20)
    .optional(),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
  language: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
});

export const addCartLinesBody = z.object({
  lines: z.array(cartLineInput).min(1).max(MAX_CART_LINES),
});

export const updateCartLinesBody = z.object({
  lines: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .min(10)
          .max(600)
          .startsWith('gid://shopify/CartLine/', 'line id must be a Shopify cart line GID'),
        quantity: z.coerce.number().int().min(0).max(MAX_LINE_QUANTITY),
        merchandiseId: z
          .string()
          .trim()
          .startsWith('gid://shopify/ProductVariant/')
          .max(600)
          .optional(),
      }),
    )
    .min(1)
    .max(MAX_CART_LINES),
});

export const removeCartLinesBody = z.object({
  lineIds: z
    .array(
      z
        .string()
        .trim()
        .min(10)
        .max(600)
        .startsWith('gid://shopify/CartLine/', 'line id must be a Shopify cart line GID'),
    )
    .min(1)
    .max(MAX_CART_LINES),
});

export const updateBuyerIdentityBody = z.object({
  buyerIdentity: buyerIdentity,
});

export const updateDiscountCodesBody = z.object({
  discountCodes: z.array(z.string().trim().min(1).max(64)).max(20),
});

// ------------------------------------------------------- localization etc --

export const localizationQuery = marketContextQuery;

export const shippingQuery = marketContextQuery.extend({
  cartId: z.string().trim().max(600).startsWith('gid://shopify/Cart/').optional(),
});

// ------------------------------------------------------------- newsletter --

export const newsletterBody = z.object({
  email: z.email('A valid email address is required').max(254),
  marketingConsent: z.boolean(),
  source: z.string().trim().min(1).max(80).optional(),
  language: z.string().trim().length(2).optional(),
});

// ------------------------------------------------------------ withdrawal ---

export const withdrawalBody = z.object({
  orderNumber: z.string().trim().min(1).max(80),
  email: z.email('A valid email address is required').max(254),
  fullName: z.string().trim().min(2).max(160),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
  orderedOn: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'orderedOn must be YYYY-MM-DD')
    .optional(),
  itemDescription: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(1000).optional(),
  declaration: z.literal(true, {
    error: 'You must confirm the withdrawal declaration before submitting.',
  }),
  language: z.string().trim().length(2).optional(),
});

// ---------------------------------------------------------- reviews/facets ---

export const productReviewsParams = handleParams;
export const productReviewsQuery = marketContextQuery.extend({ refresh: booleanQuery.optional() });
export const catalogFacetsQuery = marketContextQuery.extend({ refresh: booleanQuery.optional() });

// ---------------------------------------------------------- audit + seo ---

export const auditCatalogQuery = marketContextQuery.extend({
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  refresh: booleanQuery.optional(),
});

export const auditProductParams = handleParams.merge(marketContextQuery);

export const sitemapQuery = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(250),
});

// ---------------------------------------------------------------- ai ----

export const aiSuggestParams = handleParams;

export const aiSuggestQuery = marketContextQuery.extend({
  refresh: booleanQuery.optional(),
});
