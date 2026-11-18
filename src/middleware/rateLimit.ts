import rateLimit from 'express-rate-limit';
import { ERROR_CODES, type ApiFailure } from '../types/api';
import type { AppConfig } from '../config/env';

function limitHandler(message: string) {
  return (
    _req: import('express').Request,
    res: import('express').Response,
    _next: import('express').NextFunction,
    options: { statusCode?: number },
  ) => {
    const body: ApiFailure = {
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message,
        requestId: (res.locals.requestId as string) ?? 'unknown',
      },
    };
    res.status(options.statusCode ?? 429).json(body);
  };
}

export function rateLimiters(config: AppConfig) {
  const base = {
    windowMs: config.rateLimits.windowMs,
    standardHeaders: 'draft-7' as const,
    legacyHeaders: false,
    skip: () => config.isTest,
  };
  return {
    global: rateLimit({
      ...base,
      limit: config.rateLimits.globalMax,
      handler: limitHandler('Too many requests. Please retry later.'),
    }),
    cart: rateLimit({
      ...base,
      limit: config.rateLimits.cartMax,
      handler: limitHandler('Too many cart operations. Please retry later.'),
    }),
    newsletter: rateLimit({
      ...base,
      limit: config.rateLimits.newsletterMax,
      handler: limitHandler('Too many subscription attempts. Please retry later.'),
    }),
    webhooks: rateLimit({
      ...base,
      limit: config.rateLimits.webhookMax,
      handler: limitHandler('Webhook rate limit exceeded.'),
    }),
    auth: rateLimit({
      ...base,
      limit: config.rateLimits.authMax,
      handler: limitHandler('Too many authentication attempts. Please retry later.'),
    }),
  };
}
