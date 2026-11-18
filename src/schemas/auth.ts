import { z } from 'zod';
import { countrySchema, paginationQuery } from './common';

export const loginQuery = z.object({
  /** Same-origin relative path only; validated again server-side. */
  returnTo: z.string().max(512).optional(),
  locale: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2}(?:-[a-zA-Z]{2})?$/, 'locale must look like en or de-DE')
    .optional(),
  country: countrySchema.optional(),
  loginHint: z.email().max(254).optional(),
});

export const callbackQuery = z.object({
  code: z.string().min(1).max(4096).optional(),
  state: z.string().min(1).max(1024).optional(),
  error: z.string().max(120).optional(),
  error_description: z.string().max(500).optional(),
});

export const accountOrdersQuery = paginationQuery;
export const accountAddressesQuery = paginationQuery;

export const associateCartBody = z.object({
  cartId: z
    .string()
    .trim()
    .min(10)
    .max(600)
    .startsWith('gid://shopify/Cart/', 'cartId must be a Shopify cart GID'),
});
