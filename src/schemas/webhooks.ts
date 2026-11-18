import { z } from 'zod';

const numericId = z.union([z.number().int().nonnegative(), z.string().min(1)]);

export const ordersWebhookSchema = z
  .object({
    id: numericId,
    name: z.string().optional(),
    financial_status: z.string().nullable().optional(),
    fulfillment_status: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const fulfillmentsWebhookSchema = z
  .object({
    id: numericId,
    order_id: numericId,
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const productsWebhookSchema = z
  .object({
    id: numericId,
    handle: z.string().min(1),
    title: z.string().optional(),
    updated_at: z.string().optional(),
    published_at: z.string().nullable().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const inventoryLevelWebhookSchema = z
  .object({
    inventory_item_id: numericId,
    location_id: numericId,
    available: z.number().int(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const appUninstalledWebhookSchema = z
  .object({
    id: numericId.optional(),
    domain: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();
