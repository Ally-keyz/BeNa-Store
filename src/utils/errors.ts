import { ERROR_CODES, type ErrorCode } from '../types/api';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  readonly expose: boolean;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: unknown,
    options?: { expose?: boolean },
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.expose = options?.expose ?? true;
    Error.captureStackTrace(this, AppError);
  }
}

export const badRequest = (message: string, details?: unknown): AppError =>
  new AppError(400, ERROR_CODES.BAD_REQUEST, message, details);

export const validationError = (message: string, details?: unknown): AppError =>
  new AppError(400, ERROR_CODES.VALIDATION_ERROR, message, details);

export const unauthorized = (message = 'Authentication required'): AppError =>
  new AppError(401, ERROR_CODES.UNAUTHORIZED, message);

export const forbidden = (message = 'Not allowed'): AppError =>
  new AppError(403, ERROR_CODES.FORBIDDEN, message);

export const notFound = (resource = 'Resource', key?: string): AppError =>
  new AppError(
    404,
    ERROR_CODES.NOT_FOUND,
    key ? `${resource} "${key}" was not found` : `${resource} was not found`,
  );

export const notConfigured = (message: string): AppError =>
  new AppError(503, ERROR_CODES.NOT_CONFIGURED, message);

export const featureDisabled = (message: string): AppError =>
  new AppError(503, ERROR_CODES.FEATURE_DISABLED, message);

export const upstreamError = (message: string, details?: unknown): AppError =>
  new AppError(502, ERROR_CODES.UPSTREAM_ERROR, message, details);

export const upstreamUnavailable = (message: string): AppError =>
  new AppError(503, ERROR_CODES.UPSTREAM_UNAVAILABLE, message);
