import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { asyncHandler } from '../utils/http';
import { getValidated } from '../middleware/validate';
import { success } from '../utils/response';
import type { Container } from '../container';
import { baseMeta } from './catalog.controller';
import { featureDisabled, validationError } from '../utils/errors';
import { AppError } from '../utils/errors';
import {
  clearOAuthStateCookie,
  clearSessionCookie,
  readOAuthStateCookie,
  writeOAuthStateCookie,
  writeSessionCookie,
} from '../services/customerAuth/sessionStore';
import type { accountAddressesQuery, accountOrdersQuery, loginQuery, callbackQuery, associateCartBody } from '../schemas/auth';

function accountErrorHandler(res: import('express').Response, container: Container, error: unknown): never {
  if (error instanceof AppError && error.statusCode === 401) {
    clearSessionCookie(res, container.config.auth);
  }
  throw error;
}

export function authController(container: Container): Record<string, RequestHandler> {
  const auth = container.services.customerAuth;
  const config = container.config;

  return {
    login: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof loginQuery> }>(res);
      const result = await auth.beginLogin(query);
      writeOAuthStateCookie(res, result.state, config.auth);
      res.redirect(302, result.url);
    }),

    callback: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof callbackQuery> }>(res);
      if (!config.auth.enabled) {
        throw featureDisabled(
          'Customer accounts are disabled (AUTH_CUSTOMER_ACCOUNTS_ENABLED=false)',
        );
      }
      if (query.error) {
        clearOAuthStateCookie(res, config.auth);
        // Never reflect arbitrary provider text into a URL without bounds.
        const safeError = encodeURIComponent(query.error.slice(0, 80));
        res.redirect(302, `${config.frontendUrl}/account/login?error=${safeError}`);
        return;
      }
      if (!query.code || !query.state) {
        throw validationError('Missing OAuth code or state');
      }
      const boundState = readOAuthStateCookie(_req, config.auth);
      if (!boundState || boundState !== query.state) {
        throw validationError('OAuth state cookie missing or invalid');
      }
      clearOAuthStateCookie(res, config.auth);
      const result = await auth.handleCallback(query.code, query.state);
      writeSessionCookie(res, result.sessionId, config.auth);
      res.redirect(302, new URL(result.returnTo, `${config.frontendUrl}/`).toString());
    }),

    logout: asyncHandler(async (_req, res) => {
      if (!config.auth.enabled) {
        throw featureDisabled(
          'Customer accounts are disabled (AUTH_CUSTOMER_ACCOUNTS_ENABLED=false)',
        );
      }
      const session = await auth.readSession(_req.headers.cookie);
      if (session) auth.verifyCsrf(session, _req.header('x-csrf-token'));
      const redirectUrl = await auth.logout(session?.id ?? null);
      clearSessionCookie(res, config.auth);
      if (_req.header('accept')?.includes('application/json')) {
        res.json(success(res, { loggedOut: true, redirectUrl }, baseMeta(container)));
        return;
      }
      res.redirect(303, redirectUrl);
    }),

    session: asyncHandler(async (_req, res) => {
      const status = await auth.getStatus(_req.headers.cookie);
      res.json(success(res, status, baseMeta(container)));
    }),

    me: asyncHandler(async (_req, res) => {
      try {
        const profile = await auth.getProfile(_req.headers.cookie);
        res.json(success(res, profile, baseMeta(container)));
      } catch (error) {
        accountErrorHandler(res, container, error);
      }
    }),

    orders: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof accountOrdersQuery> }>(res);
      try {
        const result = await auth.getOrders(_req.headers.cookie, query);
        res.json(
          success(res, result.items, {
            ...baseMeta(container),
            pageInfo: result.pageInfo,
          }),
        );
      } catch (error) {
        accountErrorHandler(res, container, error);
      }
    }),

    addresses: asyncHandler(async (_req, res) => {
      const { query } = getValidated<{ query: z.infer<typeof accountAddressesQuery> }>(res);
      try {
        const result = await auth.getAddresses(_req.headers.cookie, query);
        res.json(
          success(res, result.items, {
            ...baseMeta(container),
            pageInfo: result.pageInfo,
          }),
        );
      } catch (error) {
        accountErrorHandler(res, container, error);
      }
    }),

    associateCart: asyncHandler(async (_req, res) => {
      const { body } = getValidated<{ body: z.infer<typeof associateCartBody> }>(res);
      try {
        const session = await auth.requireSession(_req.headers.cookie);
        auth.verifyCsrf(session, _req.header('x-csrf-token'));
        const cart = await auth.associateCart(_req.headers.cookie, body.cartId);
        res.json(success(res, cart, baseMeta(container)));
      } catch (error) {
        accountErrorHandler(res, container, error);
      }
    }),
  };
}
