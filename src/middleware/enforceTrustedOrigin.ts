import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env';
import { forbidden } from '../utils/errors';

function normalize(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Defense-in-depth Origin check for state-changing browser routes.
 * Requests without an Origin header (server-to-server, tests) continue,
 * but must still present the CSRF token.
 */
export function enforceTrustedOrigin(config: AppConfig): RequestHandler {
  const allowed = new Set(
    [...config.corsOrigins, config.auth.jsOrigin, config.frontendUrl].map(normalize),
  );
  return (req, _res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      next();
      return;
    }
    const origin = req.header('origin');
    if (!origin) {
      next();
      return;
    }
    if (!allowed.has(normalize(origin))) {
      next(forbidden(`Origin ${origin} is not allowed`));
      return;
    }
    next();
  };
}
