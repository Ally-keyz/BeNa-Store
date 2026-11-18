import type { RequestHandler } from 'express';
import { asyncHandler } from '../utils/http';
import { getValidated } from '../middleware/validate';
import { success } from '../utils/response';
import type { Container } from '../container';
import { notFound } from '../utils/errors';
import type { z } from 'zod';
import type {
  collectionDetailQuery,
  listCollectionsQuery,
  listProductsQuery,
  productByHandle,
  searchQuery,
  suggestionsQuery,
} from '../schemas/requests';
export function baseMeta(container: Container, extraWarnings: string[] = []) {
  const warnings = [...new Set([...container.warnings, ...extraWarnings])];
  return {
    dataSource: container.dataSource,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export function catalogController(container: Container): Record<string, RequestHandler> {
  return {
    listProducts: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof listProductsQuery> }>(res);
      const products = await container.services.products.list(query);
      res.json(
        success(res, products.items, {
          ...baseMeta(container, container.services.products.warnings()),
          pageInfo: products.pageInfo,
        }),
      );
    }),

    getProduct: asyncHandler(async (_req, res) => {
      const { params, query } = getValidated<{
        params: z.infer<typeof productByHandle>;
        query: z.infer<typeof productByHandle>;
      }>(res);
      const product = await container.services.products.byHandle(params.handle, query);
      res.json(
        success(res, product, baseMeta(container, container.services.products.warnings())),
      );
    }),

    listCollections: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof listCollectionsQuery> }>(res);
      const collections = await container.services.collections.list(query);
      res.json(
        success(res, collections.items, {
          ...baseMeta(container, container.services.collections.warnings()),
          pageInfo: collections.pageInfo,
        }),
      );
    }),

    getCollection: asyncHandler(async (_req, res) => {
      const { params, query } = getValidated<{
        params: { handle: string };
        query: z.infer<typeof collectionDetailQuery>;
      }>(res);
      const collection = await container.services.collections.byHandle(params.handle, query);
      res.json(
        success(
          res,
          { ...collection, products: collection.products.items },
          {
            ...baseMeta(container, container.services.collections.warnings()),
            pageInfo: collection.products.pageInfo,
          },
        ),
      );
    }),

    search: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof searchQuery> }>(res);
      const result = await container.services.search.search({
        query: query.q,
        first: query.first,
        after: query.after,
        country: query.country,
        language: query.language,
      });
      res.json(
        success(
          res,
          {
            query: query.q,
            products: result.items,
          },
          {
            ...baseMeta(container, container.services.search.warnings()),
            pageInfo: result.pageInfo,
          },
        ),
      );
    }),

    suggest: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof suggestionsQuery> }>(res);
      const result = await container.services.search.predictive({
        query: query.q,
        first: query.limit,
        types: ['product', 'collection', 'page', 'query'],
        unavailableProducts: query.unavailableProducts,
        country: query.country,
        language: query.language,
      });
      res.json(
        success(res, result, baseMeta(container, container.services.search.warnings())),
      );
    }),
  };
}

export function insightsController(container: Container): Record<string, RequestHandler> {
  return {
    auditCatalog: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{
        query: { limit?: number; refresh?: boolean; country?: string; language?: string };
      }>(res);
      const report = await container.services.audit.catalog(query);
      res.json(
        success(res, report, {
          ...baseMeta(container, report.warnings),
          extra: { readOnly: true },
        }),
      );
    }),

    auditProduct: asyncHandler(async (_req, res) => {
      const { params, query } = getValidated<{
        params: { handle: string };
        query: { country?: string; language?: string };
      }>(res);
      const report = await container.services.audit.product(params.handle, query);
      res.json(
        success(res, report, {
          ...baseMeta(container, [
            'Single-product report: duplicate-title detection requires the full catalog report.',
          ]),
          extra: { readOnly: true },
        }),
      );
    }),

    seoProduct: asyncHandler(async (_req, res) => {
      const { params, query } = getValidated<{
        params: { handle: string };
        query: { country?: string; language?: string };
      }>(res);
      const metadata = await container.services.seo.productMetadata(params.handle, query);
      res.json(success(res, metadata, baseMeta(container)));
    }),

    seoCollection: asyncHandler(async (_req, res) => {
      const { params, query } = getValidated<{
        params: { handle: string };
        query: { country?: string; language?: string };
      }>(res);
      const metadata = await container.services.seo.collectionMetadata(params.handle, query);
      res.json(success(res, metadata, baseMeta(container)));
    }),

    seoPage: asyncHandler(async (_req, res) => {
      const { params } = getValidated<{ params: { handle: string } }>(res);
      const metadata = await container.services.seo.pageMetadata(params.handle);
      res.json(success(res, metadata, baseMeta(container)));
    }),

    sitemap: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: { limit: number } }>(res);
      const data = await container.services.seo.sitemap(query.limit);
      res.json(success(res, data, baseMeta(container)));
    }),

    sitemapXml: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: { limit: number } }>(res);
      const data = await container.services.seo.sitemap(query.limit);
      res.type('application/xml').send(container.services.seo.sitemapXml(data));
    }),

    robots: asyncHandler(async (_req, res) => {
      res.json(success(res, container.services.seo.robots(), baseMeta(container)));
    }),

    robotsTxt: asyncHandler(async (_req, res) => {
      res.type('text/plain').send(container.services.seo.robotsTxt(container.services.seo.robots()));
    }),
  };
}

export function assertExists<T>(value: T | null | undefined, resource: string, key: string): T {
  if (value === null || value === undefined) throw notFound(resource, key);
  return value;
}
