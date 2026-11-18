import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import pino from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as createSocket, type Socket } from 'socket.io-client';
import { initSockets, type SocketSetup } from '../../src/sockets';
import { signAdminToken } from '../../src/sockets/auth';
import { testConfig } from '../helpers/testContext';

function waitForEvent<T = unknown>(
  socket: Socket,
  event: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('Socket.IO', () => {
  const config = testConfig();
  let httpServer: HttpServer;
  let setup: SocketSetup;
  let baseUrl: string;

  beforeAll(async () => {
    httpServer = createServer((_req, res) => {
      res.statusCode = 404;
      res.end();
    });
    setup = await initSockets(httpServer, config, pino({ level: 'silent' }));
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', () => resolve()));
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await setup.close();
    await new Promise<void>((resolve) => {
      if (!httpServer.listening) {
        resolve();
        return;
      }
      httpServer.close(() => resolve());
    });
  });

  it('serves the public storefront namespace without secrets and supports product subscriptions', async () => {
    const socket = createSocket(`${baseUrl}/storefront`, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
    });
    const readyPromise = waitForEvent<{ socketId: string; serverTime: string }>(
      socket,
      'connection.ready',
    );
    socket.connect();
    const ready = await readyPromise;
    expect(ready.socketId).toBeTruthy();
    expect(ready.serverTime).toBeTruthy();

    const okPromise = waitForEvent<{ room: string }>(socket, 'subscription.ok');
    socket.emit('subscribe.product', { productId: 'gid://shopify/Product/123' });
    const subscribed = await okPromise;
    expect(subscribed.room).toBe('product:gid://shopify/Product/123');

    const errorPromise = waitForEvent<{ message: string }>(socket, 'subscription.error');
    socket.emit('subscribe.product', { productId: 'bad' });
    const error = await errorPromise;
    expect(error.message).toMatch(/Invalid productId/);

    const changedPromise = waitForEvent<{ handle: string }>(socket, 'product.changed');
    await setup.publisher.publish({
      name: 'product.changed',
      namespace: '/storefront',
      payload: { productId: '123', handle: 'rwanda-coffee-250g', updatedAt: null },
    });
    const changed = await changedPromise;
    expect(changed.handle).toBe('rwanda-coffee-250g');

    socket.disconnect();
  });

  it('rejects admin connections without a valid JWT', async () => {
    const noToken = createSocket(`${baseUrl}/admin`, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
    });
    const noTokenError = waitForEvent<Error>(noToken, 'connect_error');
    noToken.connect();
    const error = await noTokenError;
    expect(String(error.message)).toMatch(/unauthorized/);
    noToken.disconnect();

    const badToken = createSocket(`${baseUrl}/admin`, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
      auth: { token: 'not-a-valid-jwt' },
    });
    const badTokenError = waitForEvent<Error>(badToken, 'connect_error');
    badToken.connect();
    expect(String((await badTokenError).message)).toMatch(/unauthorized/);
    badToken.disconnect();
  });

  it('accepts admin JWTs and delivers documented admin events', async () => {
    expect(config.socket.adminJwtSecret).toBeTruthy();
    const token = signAdminToken(config.socket.adminJwtSecret!, 60);
    const admin = createSocket(`${baseUrl}/admin`, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
      auth: { token },
    });
    const readyPromise = waitForEvent<{ role: string }>(admin, 'connection.ready');
    admin.connect();
    const ready = await readyPromise;
    expect(ready.role).toBe('admin');

    const orderPromise = waitForEvent<{ orderId: string }>(admin, 'order.created');
    await setup.publisher.publish({
      name: 'order.created',
      namespace: '/admin',
      payload: {
        orderId: '1001',
        orderName: '#1001',
        financialStatus: 'paid',
        fulfillmentStatus: null,
        createdAt: '2026-10-20T10:00:00Z',
      },
    });
    expect((await orderPromise).orderId).toBe('1001');

    const inventoryPromise = waitForEvent<{ available: number }>(
      admin,
      'inventory.level_changed',
    );
    await setup.publisher.publish({
      name: 'inventory.level_changed',
      namespace: '/admin',
      payload: { inventoryItemId: '77', locationId: '88', available: 3, updatedAt: null },
    });
    expect((await inventoryPromise).available).toBe(3);

    admin.disconnect();
  });
});
