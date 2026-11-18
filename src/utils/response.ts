import type { Response } from 'express';
import type { ApiMeta, ApiSuccess } from '../types/api';
import type { PageInfo } from '../types/domain';
import { toPaginationMeta } from './http';

export function requestIdOf(res: Response): string {
  return (res.locals.requestId as string | undefined) ?? 'unknown';
}

export function success<T>(
  res: Response,
  data: T,
  meta: Partial<ApiMeta> & { pageInfo?: PageInfo } = {},
): ApiSuccess<T> {
  const { pageInfo, ...rest } = meta;
  const body: ApiSuccess<T> = {
    success: true,
    data,
    meta: {
      requestId: requestIdOf(res),
      generatedAt: new Date().toISOString(),
      ...rest,
      ...(pageInfo ? { pagination: toPaginationMeta(pageInfo) } : {}),
    },
  };
  return body;
}

export function sendSuccess<T>(res: Response, data: T, meta: ApiMeta | Record<string, unknown> = {}): void {
  const body = success(res, data, meta as Partial<ApiMeta>);
  res.status(200).json(body);
}

export function sendCreated<T>(res: Response, data: T, meta: Record<string, unknown> = {}): void {
  res.status(201).json(success(res, data, meta as Partial<ApiMeta>));
}
