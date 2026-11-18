import pino, { type Logger } from 'pino';
import type { AppConfig } from '../config/env';

let rootLogger: Logger | null = null;

export function createLogger(config: AppConfig): Logger {
  return pino({
    level: config.logLevel,
    base: { service: 'bena-origins-backend', env: config.nodeEnv },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-shopify-storefront-access-token"]',
        'req.headers["shopify-storefront-private-token"]',
        'req.headers["x-shopify-hmac-sha256"]',
        'req.headers["x-shopify-webhook-id"]',
        'password',
        'token',
        'secret',
        'apiKey',
        '*.password',
        '*.token',
        '*.secret',
      ],
      censor: '[redacted]',
    },
    transport: config.logPretty
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        }
      : undefined,
  });
}

export function setRootLogger(logger: Logger): void {
  rootLogger = logger;
}

export function getLogger(): Logger {
  if (!rootLogger) {
    rootLogger = pino({ level: 'silent' });
  }
  return rootLogger;
}
