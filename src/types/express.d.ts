import type { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    /** Correlation id generated for every request. */
    id: string;
    /** Raw body captured for Shopify webhook HMAC verification. */
    rawBody?: Buffer;
    /** Authenticated admin identity (API key or JWT). */
    admin?: { sub: string; roles: string[]; method: 'api_key' | 'jwt' };
  }
}

export type RawRequest = Request;
