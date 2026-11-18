import http from 'node:http';
import { loadConfig, safeConfigSummary } from './config/env';
import { createLogger, setRootLogger } from './utils/logger';
import { createCommerceClient } from './integrations/shopify';
import { createContainer } from './container';
import { createApp } from './app';
import { createDedupStore } from './webhooks/dedup';
import { initSockets } from './sockets';
import type { RealtimeEvent, RealtimePublisher } from './sockets/publisher';
import { noopPublisher } from './sockets/publisher';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  setRootLogger(logger);

  logger.info(safeConfigSummary(config), 'starting BeNa Origins backend');
  for (const warning of config.warnings) logger.warn(warning);

  const { client, dataSource } = createCommerceClient(config, logger);
  const dedupStore = createDedupStore(config.redisUrl, logger);

  // Publisher is a thin delegate so webhooks can be wired before Socket.IO
  // is attached to the HTTP server.
  const publisherRef: { current: RealtimePublisher } = { current: noopPublisher };
  const container = createContainer(config, logger, client, dataSource, {
    publish: (event: RealtimeEvent) => publisherRef.current.publish(event),
  });

  const app = createApp(container, { dedupStore });
  const server = http.createServer(app);

  const sockets = await initSockets(server, config, logger);
  publisherRef.current = sockets.publisher;

  server.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        dataSource,
        api: `http://localhost:${config.port}${config.apiPrefix}`,
        docs: `http://localhost:${config.port}/api/docs`,
        sockets: {
          storefront: '/storefront',
          admin: config.socket.adminJwtSecret ? '/admin' : 'disabled (no SOCKET_ADMIN_JWT_SECRET)',
        },
      },
      'server listening',
    );
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    const force = setTimeout(() => {
      logger.error('forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
    force.unref();

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await sockets.close();
    await dedupStore.close();
    await container.services.customerAuth.close();
    logger.info('shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'unhandled rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught exception');
    void shutdown('uncaughtException');
  });
}

void main().catch((error: unknown) => {
  // Logger may not exist yet; stderr is intentional here.
  // eslint-disable-next-line no-console
  console.error('FATAL: failed to start server', error);
  process.exit(1);
});
