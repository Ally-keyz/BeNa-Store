import express, { Router } from 'express';
import type { RequestHandler, Response } from 'express';
import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type { RealtimePublisher } from '../sockets/publisher';
import type { RestockService } from '../services/restock.service';
import type { DedupStore } from './dedup';
import { verifyShopifyHmac } from './verify';
import { processWebhook } from './processor';
import { ERROR_CODES, type ApiFailure } from '../types/api';

const SUPPORTED_TOPICS = new Set([
  'orders/create',
  'orders/updated',
  'orders/fulfilled',
  'fulfillments/create',
  'products/update',
  'inventory_levels/update',
  'app/uninstalled',
]);

export interface WebhookRouterOptions {
  config: AppConfig;
  logger: Logger;
  publisher: RealtimePublisher;
  dedupStore: DedupStore;
  restockService?: RestockService;
  rateLimiter?: RequestHandler;
}

function failure(
  res: Response,
  status: number,
  code: ApiFailure['error']['code'],
  message: string,
): void {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      requestId: (res.locals.requestId as string) ?? 'unknown',
    },
  } satisfies ApiFailure);
}

/**
 * Shopify webhooks: raw-body HMAC verification + dedup, then fast 200.
 * Mounted BEFORE express.json() in app.ts.
 */
export function createWebhookRouter(options: WebhookRouterOptions): Router {
  const router = Router();
  const { config, logger, publisher, dedupStore } = options;

  const rawParser = express.raw({ type: '*/*', limit: '2mb' });

  router.post(
    '/shopify',
    ...(options.rateLimiter ? [options.rateLimiter] : []),
    rawParser,
    (req, res) => {
      if (!config.webhooks.secret) {
        logger.error('Webhook received but SHOPIFY_WEBHOOK_SECRET is not configured');
        failure(res, 503, ERROR_CODES.NOT_CONFIGURED, 'Webhook verification is not configured');
        return;
      }

      const hmac = req.header('x-shopify-hmac-sha256');
      const topic = req.header('x-shopify-topic');
      const shopDomain = req.header('x-shopify-shop-domain') ?? 'unknown-shop';
      const webhookId = req.header('x-shopify-webhook-id');
      const rawBody = Buffer.isBuffer(req.body) ? req.body : req.rawBody;

      if (!rawBody || rawBody.length === 0) {
        failure(res, 400, ERROR_CODES.BAD_REQUEST, 'Empty webhook body');
        return;
      }

      if (!verifyShopifyHmac(rawBody, hmac, config.webhooks.secret)) {
        logger.warn(
          { requestId: req.id, topic, shopDomain },
          'webhook HMAC verification failed',
        );
        failure(res, 401, ERROR_CODES.UNAUTHORIZED, 'Invalid webhook signature');
        return;
      }

      if (!topic) {
        failure(res, 400, ERROR_CODES.BAD_REQUEST, 'Missing X-Shopify-Topic header');
        return;
      }

      if (!webhookId) {
        // Dedup cannot be guaranteed without the id; Shopify always sends it.
        failure(res, 400, ERROR_CODES.BAD_REQUEST, 'Missing X-Shopify-Webhook-Id header');
        return;
      }

      if (!SUPPORTED_TOPICS.has(topic.toLowerCase())) {
        logger.info({ topic, shopDomain }, 'unsupported webhook topic acknowledged');
        res.status(200).json({
          success: true,
          data: { received: true, handled: false, topic, duplicate: false },
          meta: { requestId: res.locals.requestId, generatedAt: new Date().toISOString() },
        });
        return;
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch {
        failure(res, 400, ERROR_CODES.BAD_REQUEST, 'Webhook body is not valid JSON');
        return;
      }

      const dedupKey = `${shopDomain}:${webhookId}`;

      // Dedup is async (Redis-capable) but fast; still respond before processing.
      void dedupStore
        .markIfNew(dedupKey)
        .then((isNew) => {
          res.status(200).json({
            success: true,
            data: {
              received: true,
              handled: isNew,
              topic,
              duplicate: !isNew,
            },
            meta: {
              requestId: res.locals.requestId,
              generatedAt: new Date().toISOString(),
            },
          });

          if (!isNew) {
            logger.info({ topic, webhookId }, 'duplicate webhook ignored');
            return;
          }

          setImmediate(() => {
            void processWebhook(payload, {
              topic,
              shopDomain,
              webhookId,
              publisher,
              logger,
              restockService: options.restockService,
            })
              .then((result) => {
                logger.info(
                  { topic, webhookId, handled: result.handled, events: result.events },
                  'webhook processed',
                );
              })
              .catch((error: unknown) => {
                logger.error(
                  {
                    topic,
                    webhookId,
                    err: error instanceof Error ? { message: error.message } : error,
                  },
                  'webhook processing failed',
                );
              });
          });
        })
        .catch((error: unknown) => {
          logger.error(
            { err: error instanceof Error ? { message: error.message } : error },
            'webhook dedup failed',
          );
          if (!res.headersSent) {
            failure(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Webhook dedup failure');
          }
        });
    },
  );

  router.all('/shopify', (_req, res) => {
    failure(res, 405, ERROR_CODES.METHOD_NOT_ALLOWED, 'Use POST for Shopify webhooks');
  });

  return router;
}
