import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { Logger } from 'pino';
import { AppError } from '../utils/errors';
import { ERROR_CODES, type ApiFailure } from '../types/api';

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ApiFailure = {
    success: false,
    error: {
      code: ERROR_CODES.NOT_FOUND,
      message: `No route matches ${req.method} ${req.path}`,
      requestId: (res.locals.requestId as string) ?? 'unknown',
    },
  };
  res.status(404).json(body);
};

function zodDetails(error: ZodError): Array<{ path: string; message: string; code: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const requestIdValue = (res.locals.requestId as string) ?? req.id ?? 'unknown';

    if (error instanceof ZodError) {
      const body: ApiFailure = {
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Request validation failed',
          details: zodDetails(error),
          requestId: requestIdValue,
        },
      };
      res.status(400).json(body);
      return;
    }

    if (error instanceof AppError) {
      logger.warn(
        { requestId: requestIdValue, code: error.code, status: error.statusCode, message: error.message },
        'handled application error',
      );
      const body: ApiFailure = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
          requestId: requestIdValue,
        },
      };
      res.status(error.statusCode).json(body);
      return;
    }

    // express-rate-limit throws an object with `status` instead of Error.
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as { status?: number }).status === 429
    ) {
      const body: ApiFailure = {
        success: false,
        error: {
          code: ERROR_CODES.RATE_LIMITED,
          message: 'Too many requests. Please retry later.',
          requestId: requestIdValue,
        },
      };
      res.status(429).json(body);
      return;
    }

    // Body parser / HTTP errors carry a numeric status but are not AppErrors.
    const httpStatus = (() => {
      const candidate = error as { status?: unknown; statusCode?: unknown };
      if (typeof candidate.status === 'number') return candidate.status;
      if (typeof candidate.statusCode === 'number') return candidate.statusCode;
      return null;
    })();
    if (httpStatus !== null && httpStatus >= 400 && httpStatus < 500) {
      const body: ApiFailure = {
        success: false,
        error: {
          code: httpStatus === 429 ? ERROR_CODES.RATE_LIMITED : ERROR_CODES.BAD_REQUEST,
          message:
            httpStatus === 413
              ? 'Request body is too large'
              : httpStatus === 429
                ? 'Too many requests. Please retry later.'
                : 'Invalid request body or parameters',
          requestId: requestIdValue,
        },
      };
      res.status(httpStatus).json(body);
      return;
    }

    logger.error({ requestId: requestIdValue, err: error }, 'unhandled error');
    const body: ApiFailure = {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'An unexpected error occurred.',
        requestId: requestIdValue,
      },
    };
    res.status(500).json(body);
  };
}
