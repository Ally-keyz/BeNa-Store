import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const payload = {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        ip: req.ip,
      };
      if (req.originalUrl.startsWith('/health')) {
        logger.debug(payload, 'request completed');
        return;
      }
      if (res.statusCode >= 500) {
        logger.error(payload, 'request failed');
      } else if (res.statusCode >= 400) {
        logger.warn(payload, 'request rejected');
      } else {
        logger.info(payload, 'request completed');
      }
    });
    next();
  };
}
