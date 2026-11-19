import type { ApiErrorBody } from '@/types/api';

/** Normalized error thrown by the API client for every failed request. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | undefined;
  readonly details: unknown;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    requestId?: string;
    details?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
    this.details = params.details;
  }

  static fromBody(body: ApiErrorBody | undefined, status: number): ApiError {
    return new ApiError({
      code: body?.code ?? 'INTERNAL_ERROR',
      message: body?.message ?? `Request failed (${status})`,
      status,
      requestId: body?.requestId,
      details: body?.details,
    });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Map a backend error code to an i18n key. UI code should render
 * `t(errorMessageKey(err.code))` so shoppers never see raw server text.
 */
export function errorMessageKey(code: string | undefined): string {
  switch (code) {
    case 'NOT_FOUND':
    case 'VALIDATION_ERROR':
    case 'RATE_LIMITED':
    case 'UPSTREAM_UNAVAILABLE':
    case 'UPSTREAM_ERROR':
    case 'NOT_CONFIGURED':
    case 'FEATURE_DISABLED':
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
    case 'INTERNAL_ERROR':
    case 'BAD_REQUEST':
    case 'CONFLICT':
    case 'METHOD_NOT_ALLOWED':
      return `errors.${code}`;
    case 'NETWORK_ERROR':
      return 'errors.network';
    default:
      return 'errors.generic';
  }
}
