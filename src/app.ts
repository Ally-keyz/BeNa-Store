import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import type { Container } from './container';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimiters } from './middleware/rateLimit';
import { requireAdmin } from './middleware/requireAdmin';
import { runWithRequestContext, normalizeIp } from './utils/requestContext';
import { createApiRouter } from './routes';
import { createWebhookRouter } from './webhooks/router';
import { createDedupStore, type DedupStore } from './webhooks/dedup';
import { createDocsRouter } from './docs/router';
import { forbidden } from './utils/errors';
import { healthController } from './controllers/commerce.controller';
import { validate } from './middleware/validate';
import { emptyQuery } from './schemas/common';
import { success } from './utils/response';
import { APP_VERSION } from './config/constants';

export interface CreateAppOptions {
  dedupStore?: DedupStore;
}

export function createApp(container: Container, options: CreateAppOptions = {}): Express {
  const { config, logger } = container;
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  const dedupStore = options.dedupStore ?? createDedupStore(null, logger);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https:'],
          fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (config.corsOrigins.includes(origin.replace(/\/+$/, ''))) {
          callback(null, true);
          return;
        }
        callback(forbidden(`Origin ${origin} is not allowed by CORS`));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
      exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      maxAge: 600,
    }),
  );

  app.use(requestId);
  app.use(requestLogger(logger));
  app.use((req, _res, next) => {
    runWithRequestContext(
      { buyerIp: normalizeIp(req.ip), requestId: req.id },
      () => next(),
    );
  });

  const limiters = rateLimiters(config);
  const adminGuard = requireAdmin(config, logger);

  // Health probes are intentionally outside the global rate limiter.
  const health = healthController(container);
  app.get('/health', validate({ query: emptyQuery }), health.liveness);
  app.get('/health/ready', validate({ query: emptyQuery }), health.readiness);

  // Webhooks must be mounted BEFORE express.json() to keep the raw body.
  app.use(
    '/webhooks',
    createWebhookRouter({
      config,
      logger,
      publisher: container.publisher,
      dedupStore,
      rateLimiter: limiters.webhooks,
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => {
    res.json(
      success(res, {
        name: 'BeNa Origins backend',
        version: APP_VERSION,
        dataSource: container.dataSource,
        apiBase: config.apiPrefix,
        docs: '/api/docs',
        health: '/health',
      }),
    );
  });

  app.use(config.apiPrefix, limiters.global, createApiRouter(container, { limiters, adminGuard }));
  app.use('/api/docs', createDocsRouter(config.apiPublicUrl ?? '/'));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
