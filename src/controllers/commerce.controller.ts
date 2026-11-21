import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { asyncHandler } from '../utils/http';
import { getValidated } from '../middleware/validate';
import { sendCreated, success } from '../utils/response';
import type { Container } from '../container';
import { baseMeta } from './catalog.controller';
import type {
  addCartLinesBody,
  createCartBody,
  removeCartLinesBody,
  updateBuyerIdentityBody,
  updateCartLinesBody,
  updateDiscountCodesBody,
  withdrawalBody,
  catalogFacetsQuery,
  productReviewsParams,
  productReviewsQuery,
  restockSubscribeBody,
} from '../schemas/requests';

export function cartController(container: Container): Record<string, RequestHandler> {
  const cart = container.services.cart;

  return {
    create: asyncHandler(async (_req, res) => {
      const { body } = getValidated<{ body: z.infer<typeof createCartBody> }>(res);
      const created = await cart.create(body);
      sendCreated(res, created, baseMeta(container));
    }),

    get: asyncHandler(async (_req, res) => {
      const { params } = getValidated<{ params: { cartId: string } }>(res);
      res.json(success(res, await cart.get(params.cartId), baseMeta(container)));
    }),

    addLines: asyncHandler(async (_req, res) => {
      const { params, body } = getValidated<{
        params: { cartId: string };
        body: z.infer<typeof addCartLinesBody>;
      }>(res);
      res.json(
        success(res, await cart.addLines(params.cartId, body.lines), baseMeta(container)),
      );
    }),

    updateLines: asyncHandler(async (_req, res) => {
      const { params, body } = getValidated<{
        params: { cartId: string };
        body: z.infer<typeof updateCartLinesBody>;
      }>(res);
      res.json(
        success(res, await cart.updateLines(params.cartId, body.lines), baseMeta(container)),
      );
    }),

    removeLines: asyncHandler(async (_req, res) => {
      const { params, body } = getValidated<{
        params: { cartId: string };
        body: z.infer<typeof removeCartLinesBody>;
      }>(res);
      res.json(
        success(res, await cart.removeLines(params.cartId, body.lineIds), baseMeta(container)),
      );
    }),

    updateBuyerIdentity: asyncHandler(async (_req, res) => {
      const { params, body } = getValidated<{
        params: { cartId: string };
        body: z.infer<typeof updateBuyerIdentityBody>;
      }>(res);
      res.json(
        success(
          res,
          await cart.updateBuyerIdentity(params.cartId, body.buyerIdentity),
          baseMeta(container),
        ),
      );
    }),

    updateDiscountCodes: asyncHandler(async (_req, res) => {
      const { params, body } = getValidated<{
        params: { cartId: string };
        body: z.infer<typeof updateDiscountCodesBody>;
      }>(res);
      res.json(
        success(
          res,
          await cart.updateDiscountCodes(params.cartId, body.discountCodes),
          baseMeta(container),
        ),
      );
    }),
  };
}

export function contentController(container: Container): Record<string, RequestHandler> {
  return {
    localization: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{
        query: { country?: string; language?: string };
      }>(res);
      const data = await container.services.localization.get(query);
      res.json(
        success(res, data, baseMeta(container, container.services.localization.warnings())),
      );
    }),

    shipping: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{
        query: { country?: string; language?: string; cartId?: string };
      }>(res);
      const data = await container.services.shipping.get(query);
      res.json(success(res, data, baseMeta(container)));
    }),

    policies: asyncHandler(async (_req, res) => {
      const data = await container.services.policies.get();
      res.json(
        success(res, data, {
          ...baseMeta(container),
          gaps: data.gaps,
        }),
      );
    }),
  };
}

export function communicationsController(container: Container): Record<string, RequestHandler> {
  return {
    newsletter: asyncHandler(async (_req, res) => {
      const { body } = getValidated<{
        body: {
          email: string;
          marketingConsent: boolean;
          source?: string;
          language?: string;
        };
      }>(res);
      const result = await container.services.newsletter.subscribe(body);
      sendCreated(res, result, baseMeta(container));
    }),

    restockSubscribe: asyncHandler(async (_req, res) => {
      const { body } = getValidated<{ body: z.infer<typeof restockSubscribeBody> }>(res);
      const result = await container.services.restock.subscribe(body);
      sendCreated(res, result, baseMeta(container));
    }),

    reviewsAssessment: asyncHandler(async (_req, res) => {
      const assessment = await container.services.reviews.assess();
      res.json(success(res, assessment, baseMeta(container)));
    }),

    productReviews: asyncHandler(async (_req, res) => {
      const { params, query } = getValidated<{
        params: z.infer<typeof productReviewsParams>;
        query: z.infer<typeof productReviewsQuery>;
      }>(res);
      const reviews = await container.services.reviews.forProduct(params.handle, {
        refresh: query.refresh,
      });
      res.json(success(res, reviews, baseMeta(container)));
    }),

    withdrawal: asyncHandler(async (_req, res) => {
      const { body } = getValidated<{ body: z.infer<typeof withdrawalBody> }>(res);
      const result = await container.services.withdrawal.submit(body);
      sendCreated(res, result, baseMeta(container));
    }),

    facets: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof catalogFacetsQuery> }>(res);
      const facets = await container.services.facets.get(query, { refresh: query.refresh });
      res.json(success(res, facets, baseMeta(container)));
    }),
  };
}

export function healthController(container: Container): Record<string, RequestHandler> {
  return {
    liveness: asyncHandler(async (_req, res) => {
      res.json(success(res, container.services.health.liveness(), baseMeta(container)));
    }),

    readiness: asyncHandler(async (_req, res) => {
      const result = await container.services.health.readiness();
      const status = result.status === 'error' ? 503 : 200;
      res.status(status).json(success(res, result, baseMeta(container)));
    }),
  };
}
