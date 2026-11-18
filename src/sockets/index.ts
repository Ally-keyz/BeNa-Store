import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { AppConfig } from '../config/env';
import { extractSocketToken, verifyAdminToken } from './auth';
import type { RealtimeEvent, RealtimePublisher } from './publisher';

export interface SocketSetup {
  io: Server;
  publisher: RealtimePublisher;
  close: () => Promise<void>;
}

const subscribeSchema = z.object({
  productId: z
    .string()
    .trim()
    .min(10)
    .max(600)
    .startsWith('gid://shopify/Product/', 'productId must be a product GID'),
});

/**
 * Socket.IO is a notification fan-out only. It is NEVER a source of truth for
 * inventory, prices, payments or orders: clients receive a hint and re-fetch
 * authoritative data from the REST API / Shopify.
 */
export async function initSockets(
  httpServer: HttpServer,
  config: AppConfig,
  logger: Logger,
): Promise<SocketSetup> {
  const io = new Server(httpServer, {
    serveClient: false,
    cors: {
      origin: config.socketCorsOrigins,
      methods: ['GET', 'POST'],
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  let redisClients: { pub: Redis; sub: Redis } | null = null;
  if (config.redisUrl) {
    try {
      const pub = new Redis(config.redisUrl);
      const sub = pub.duplicate();
      pub.on('error', (error) => logger.warn({ message: error.message }, 'socket redis pub error'));
      sub.on('error', (error) => logger.warn({ message: error.message }, 'socket redis sub error'));
      io.adapter(createAdapter(pub, sub));
      redisClients = { pub, sub };
      logger.info('Socket.IO Redis adapter enabled');
    } catch (error) {
      logger.warn(
        { err: error instanceof Error ? { message: error.message } : error },
        'Socket.IO Redis adapter unavailable; continuing single-instance',
      );
    }
  }

  // ------------------------------------------------------- public namespace ---
  const storefront = io.of('/storefront');
  storefront.on('connection', (socket) => {
    socket.emit('connection.ready', {
      socketId: socket.id,
      serverTime: new Date().toISOString(),
    });
    logger.debug({ socketId: socket.id }, 'storefront socket connected');

    const subscribed = new Set<string>();

    socket.on('subscribe.product', (raw: unknown) => {
      const parsed = subscribeSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit('subscription.error', { message: 'Invalid productId' });
        return;
      }
      if (subscribed.size >= 50) {
        socket.emit('subscription.error', { message: 'Subscription limit reached' });
        return;
      }
      const room = `product:${parsed.data.productId}`;
      void socket.join(room);
      subscribed.add(room);
      socket.emit('subscription.ok', { room });
    });

    socket.on('unsubscribe.product', (raw: unknown) => {
      const parsed = subscribeSchema.safeParse(raw);
      if (!parsed.success) return;
      const room = `product:${parsed.data.productId}`;
      void socket.leave(room);
      subscribed.delete(room);
    });
  });

  // -------------------------------------------------------- admin namespace ---
  const admin = io.of('/admin');
  admin.use((socket, next) => {
    if (!config.socket.adminJwtSecret) {
      next(new Error('admin namespace disabled: SOCKET_ADMIN_JWT_SECRET not configured'));
      return;
    }
    const token = extractSocketToken(socket.handshake);
    if (!token) {
      next(new Error('unauthorized: admin token required'));
      return;
    }
    const payload = verifyAdminToken(token, config.socket.adminJwtSecret);
    if (!payload) {
      next(new Error('unauthorized: invalid or expired admin token'));
      return;
    }
    socket.data.admin = payload;
    next();
  });

  admin.on('connection', (socket) => {
    void socket.join('admin');
    socket.emit('connection.ready', {
      socketId: socket.id,
      serverTime: new Date().toISOString(),
      role: 'admin',
    });
    logger.info({ socketId: socket.id, sub: socket.data.admin?.sub }, 'admin socket connected');
  });

  const publisher: RealtimePublisher = {
    publish(event: RealtimeEvent) {
      const namespace = io.of(event.namespace);
      if (event.rooms?.length) {
        namespace.to(event.rooms).emit(event.name, event.payload);
      } else {
        namespace.emit(event.name, event.payload);
      }
      logger.debug(
        { event: event.name, namespace: event.namespace, rooms: event.rooms ?? [] },
        'socket event emitted',
      );
    },
  };

  const close = async (): Promise<void> => {
    await new Promise<void>((resolve) => io.close(() => resolve()));
    if (redisClients) {
      await Promise.allSettled([redisClients.pub.quit(), redisClients.sub.quit()]);
    }
  };

  return { io, publisher, close };
}
