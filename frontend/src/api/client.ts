import { env, IS_DEV } from '@/config';
import type { ApiFailure, ApiMeta, ApiSuccess } from '@/types/api';
import { ApiError } from './errors';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export interface ApiResult<T> {
  data: T;
  meta: ApiMeta;
}

function buildUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  const base = env.apiBaseUrl.replace(/\/+$/, '');
  const url = `${base}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

/**
 * Single fetch wrapper for the whole app.
 *
 * Understands the backend envelope `{ success, data, meta, error? }`,
 * throws a typed `ApiError` on failure, and surfaces `meta.warnings` in dev
 * (fixture mode, degraded token scopes, etc.).
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiResult<T>> {
  const url = buildUrl(path, options.query);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    credentials: options.credentials ?? 'omit',
    signal: options.signal,
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'The API could not be reached.',
      status: 0,
    });
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok || (isFailure(payload) && payload.success === false)) {
    const body = isFailure(payload) ? payload.error : undefined;
    throw ApiError.fromBody(body, response.status);
  }

  if (!isSuccess<T>(payload)) {
    throw new ApiError({
      code: 'INTERNAL_ERROR',
      message: 'Unexpected API response shape.',
      status: response.status,
    });
  }

  if (IS_DEV && payload.meta?.warnings?.length) {
    // Visible only in development. Never treated as fatal.
    console.info(`[api] ${url}`, payload.meta.warnings);
  }

  return { data: payload.data, meta: payload.meta };
}

function isFailure(value: unknown): value is ApiFailure {
  return typeof value === 'object' && value !== null && 'success' in value && (value as ApiFailure).success === false;
}

function isSuccess<T>(value: unknown): value is ApiSuccess<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as ApiSuccess<T>).success === true &&
    'data' in value
  );
}

/** Convenience: build the absolute URL for navigations (e.g. auth login). */
export function endpointUrl(path: string): string {
  const base = env.apiBaseUrl.replace(/\/+$/, '');
  return `${base}${path}`;
}
