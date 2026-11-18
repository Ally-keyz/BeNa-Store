import { createHash, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import { forbidden, notConfigured, unauthorized } from '../utils/errors';

export interface RequireAdminOptions {
  /** Roles accepted. Defaults to ["admin"]. */
  roles?: string[];
}

function hashKey(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

function safeEqualHex(candidate: string, expectedHex: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const left = hashKey(candidate);
  const right = Buffer.from(expectedHex, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

/**
 * Layer 2 admin authentication.
 *
 * Credentials are either:
 *  - X-Admin-Key (or legacy X-Admin-Token) compared against a SHA-256 hash
 *  - Authorization: Bearer <HS256 JWT> with an admin role
 *
 * Missing/invalid credentials → 401; valid identity without a required role → 403.
 * If no admin credentials are configured, admin routes fail closed with 503.
 */
export function requireAdmin(
  config: AppConfig,
  logger: Logger,
  options: RequireAdminOptions = {},
): RequestHandler {
  const requiredRoles = options.roles ?? ['admin'];

  return (req, _res, next) => {
    if (!config.admin.configured) {
      next(notConfigured('Admin authentication is not configured on this server'));
      return;
    }

    const adminKey = req.header('x-admin-key') ?? req.header('x-admin-token');
    if (adminKey) {
      if (!config.admin.keyHash || !safeEqualHex(adminKey, config.admin.keyHash)) {
        logger.warn({ requestId: req.id, method: 'api_key' }, 'admin authentication failed');
        next(unauthorized('Invalid admin credentials'));
        return;
      }
      req.admin = { sub: 'api-key', roles: ['admin'], method: 'api_key' };
      next();
      return;
    }

    const token = extractBearer(req.header('authorization'));
    if (!token || !config.admin.jwtSecret) {
      next(unauthorized('Admin credentials required'));
      return;
    }

    try {
      const payload = jwt.verify(token, config.admin.jwtSecret, {
        algorithms: ['HS256'],
      }) as { sub?: string; role?: string; roles?: string[] };
      if (!payload.sub) {
        next(unauthorized('Invalid admin token'));
        return;
      }
      const roles = Array.isArray(payload.roles)
        ? payload.roles
        : payload.role
          ? [payload.role]
          : [];
      if (!requiredRoles.some((role) => roles.includes(role))) {
        logger.warn(
          { requestId: req.id, method: 'jwt', sub: payload.sub },
          'admin token lacks required role',
        );
        next(forbidden('Admin role required'));
        return;
      }
      req.admin = { sub: payload.sub, roles, method: 'jwt' };
      next();
    } catch {
      logger.warn({ requestId: req.id, method: 'jwt' }, 'admin JWT rejected');
      next(unauthorized('Invalid or expired admin token'));
    }
  };
}
