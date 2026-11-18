import type { Logger } from 'pino';
import { currentBuyerIp } from '../../utils/requestContext';

export interface ShopifyGraphqlOptions {
  /** Optional operation label for logs (never includes variables). */
  operation?: string;
  timeoutMs?: number;
}

export class ShopifyGraphqlError extends Error {
  readonly graphQlCodes: string[];
  readonly status: number;
  readonly safeDetails?: unknown;

  constructor(message: string, status: number, codes: string[], safeDetails?: unknown) {
    super(message);
    this.name = 'ShopifyGraphqlError';
    this.status = status;
    this.graphQlCodes = codes;
    this.safeDetails = safeDetails;
  }

  get isAccessDenied(): boolean {
    return this.graphQlCodes.includes('ACCESS_DENIED');
  }

  get isThrottled(): boolean {
    return this.graphQlCodes.includes('THROTTLED');
  }
}

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string; cost?: unknown } }>;
  extensions?: { cost?: unknown };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Small Storefront API GraphQL client.
 *
 * - Uses the private token header when available (server-to-server only).
 * - Propagates the buyer IP to Shopify for correct rate limiting/bot handling.
 * - Never logs tokens, full queries with PII, or raw error payloads.
 */
export class ShopifyGraphqlClient {
  private readonly endpoint: string;
  private readonly privateToken: string | null;
  private readonly publicToken: string | null;
  private readonly logger: Logger;
  private readonly timeoutMs: number;

  constructor(options: {
    storeDomain: string;
    apiVersion: string;
    privateToken?: string | null;
    publicToken?: string | null;
    logger: Logger;
    timeoutMs?: number;
  }) {
    if (!options.storeDomain) throw new Error('ShopifyGraphqlClient requires storeDomain');
    this.endpoint = `https://${options.storeDomain}/api/${options.apiVersion}/graphql.json`;
    this.privateToken = options.privateToken ?? null;
    this.publicToken = options.publicToken ?? null;
    this.logger = options.logger;
    this.timeoutMs = options.timeoutMs ?? 12_000;
    if (!this.privateToken && !this.publicToken) {
      this.logger.warn(
        'Storefront client running without a token: metafields, product tags and inventory quantities will be unavailable (tokenless mode).',
      );
    }
  }

  get hasToken(): boolean {
    return Boolean(this.privateToken || this.publicToken);
  }

  async query<T>(
    query: string,
    variables: Record<string, unknown> = {},
    options: ShopifyGraphqlOptions = {},
  ): Promise<T> {
    const operation = options.operation ?? 'StorefrontQuery';
    const startedAt = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.execute<T>(query, variables, options.timeoutMs);
        this.logger.debug(
          { operation, durationMs: Date.now() - startedAt, attempt },
          'storefront request completed',
        );
        return response;
      } catch (error) {
        lastError = error;
        if (error instanceof ShopifyGraphqlError && error.isThrottled && attempt < 2) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        break;
      }
    }

    this.logger.warn(
      {
        operation,
        durationMs: Date.now() - startedAt,
        error:
          lastError instanceof ShopifyGraphqlError
            ? { message: lastError.message, codes: lastError.graphQlCodes, status: lastError.status }
            : lastError instanceof Error
              ? { message: lastError.message }
              : 'unknown',
      },
      'storefront request failed',
    );
    throw lastError;
  }

  private async execute<T>(
    query: string,
    variables: Record<string, unknown>,
    timeoutOverride?: number,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.privateToken) {
      headers['Shopify-Storefront-Private-Token'] = this.privateToken;
      const buyerIp = currentBuyerIp();
      if (buyerIp) headers['Shopify-Storefront-Buyer-IP'] = buyerIp;
    } else if (this.publicToken) {
      headers['X-Shopify-Storefront-Access-Token'] = this.publicToken;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(timeoutOverride ?? this.timeoutMs),
    });

    const text = await response.text();
    let payload: GraphqlResponse<T>;
    try {
      payload = JSON.parse(text) as GraphqlResponse<T>;
    } catch {
      throw new ShopifyGraphqlError(
        `Shopify returned a non-JSON response (HTTP ${response.status})`,
        response.status,
        [],
      );
    }

    if (payload.errors?.length) {
      const codes = payload.errors
        .map((error) => error.extensions?.code)
        .filter((code): code is string => Boolean(code));
      const message = payload.errors.map((error) => error.message).join('; ');
      throw new ShopifyGraphqlError(
        `Shopify Storefront API error: ${message}`,
        response.status,
        codes,
        { codes, httpStatus: response.status },
      );
    }

    if (!response.ok) {
      throw new ShopifyGraphqlError(
        `Shopify Storefront API request failed with HTTP ${response.status}`,
        response.status,
        [],
      );
    }

    if (!payload.data) {
      throw new ShopifyGraphqlError('Shopify Storefront API returned no data', response.status, []);
    }

    return payload.data;
  }
}
