import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../config/constants';

export const countrySchema = z
  .string()
  .trim()
  .length(2, 'country must be a 2-letter ISO code')
  .transform((value) => value.toUpperCase());

export const languageSchema = z
  .string()
  .trim()
  .length(2, 'language must be a 2-letter ISO code')
  .transform((value) => value.toUpperCase());

export const marketContextQuery = z.object({
  country: countrySchema.optional(),
  language: languageSchema.optional(),
});

export const paginationQuery = z.object({
  first: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  after: z.string().trim().min(1).max(1024).optional(),
});

export const booleanQuery = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
    if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  }
  return value;
}, z.boolean());

export const handleParams = z.object({
  handle: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9][a-z0-9._-]*$/i, 'handle contains invalid characters'),
});

export const cartIdParams = z.object({
  cartId: z
    .string()
    .trim()
    .min(10)
    .max(600)
    .startsWith('gid://shopify/Cart/', 'cartId must be a Shopify cart GID'),
});

export const cartLineId = z
  .string()
  .trim()
  .min(10)
  .max(600)
  .startsWith('gid://shopify/CartLine/', 'line id must be a Shopify cart line GID');

export const variantGid = z
  .string()
  .trim()
  .min(10)
  .max(600)
  .startsWith('gid://shopify/ProductVariant/', 'merchandiseId must be a product variant GID');

export const emptyQuery = z.object({});
