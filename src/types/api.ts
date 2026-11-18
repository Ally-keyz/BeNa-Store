/** Envelope and error contracts shared by every endpoint. */

export interface PaginationMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

export interface ApiMeta {
  requestId: string;
  generatedAt: string;
  dataSource?: 'shopify' | 'fixture' | 'computed' | 'derived';
  pagination?: PaginationMeta;
  warnings?: string[];
  [key: string]: unknown;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFLICT: 'CONFLICT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
