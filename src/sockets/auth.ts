import jwt from 'jsonwebtoken';
import { z } from 'zod';

const payloadSchema = z.object({
  sub: z.string().min(1),
  role: z.string().optional(),
  roles: z.array(z.string()).optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

export interface AdminTokenPayload {
  sub: string;
  role?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

/** Verify an admin socket JWT. Returns null for any invalid/expired token. */
export function verifyAdminToken(token: string, secret: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    const parsed = payloadSchema.safeParse(decoded);
    if (!parsed.success) return null;
    const roles = parsed.data.roles ?? (parsed.data.role ? [parsed.data.role] : []);
    if (!roles.includes('admin')) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function signAdminToken(
  secret: string,
  ttlSeconds: number,
  subject = 'admin',
): string {
  return jwt.sign({ sub: subject, role: 'admin' }, secret, {
    algorithm: 'HS256',
    expiresIn: ttlSeconds,
  });
}

export function extractSocketToken(handshake: {
  auth?: { token?: unknown } | undefined;
  headers: Record<string, string | string[] | undefined>;
}): string | null {
  const authToken = handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim().length > 0) {
    return authToken.replace(/^Bearer\s+/i, '').trim();
  }
  const header = handshake.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}
