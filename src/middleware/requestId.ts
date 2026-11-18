import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const requestId: RequestHandler = (req, res, next) => {
  // Always generate server-side; do not trust client-provided ids for logs.
  const id = randomUUID();
  req.id = id;
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};
