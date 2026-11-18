import type { RequestHandler } from 'express';
import type { PageInfo, Paginated } from '../types/domain';
import type { PaginationMeta } from '../types/api';

export function toPaginationMeta(pageInfo: PageInfo | undefined): PaginationMeta | undefined {
  if (!pageInfo) return undefined;
  return {
    hasNextPage: Boolean(pageInfo.hasNextPage),
    hasPreviousPage: Boolean(pageInfo.hasPreviousPage),
    startCursor: pageInfo.startCursor ?? null,
    endCursor: pageInfo.endCursor ?? null,
  };
}

export function paginate<T>(items: T[], pageInfo: PageInfo): Paginated<T> {
  return { items, pageInfo };
}

export const emptyPageInfo: PageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

/** Express 5 forwards rejected promises, but this keeps intent explicit. */
export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}
