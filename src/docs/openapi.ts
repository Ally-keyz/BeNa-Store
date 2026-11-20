import { z } from 'zod';
import {
  addCartLinesBody,
  createCartBody,
  newsletterBody,
  removeCartLinesBody,
  updateBuyerIdentityBody,
  updateCartLinesBody,
  updateDiscountCodesBody,
} from '../schemas/requests';

type JsonSchema = Record<string, unknown>;

function zodToOpenApiBody(schema: z.ZodType): JsonSchema {
  const json = z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input' }) as JsonSchema;
  delete json.$schema;
  return json;
}

const param = (
  name: string,
  location: 'query' | 'path' | 'header',
  description: string,
  options: { required?: boolean; schema?: JsonSchema } = {},
) => ({
  name,
  in: location,
  required: options.required ?? false,
  description,
  schema: options.schema ?? { type: 'string' },
});

const paginationParams = [
  param('first', 'query', 'Page size (1–100)', { schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }),
  param('after', 'query', 'Opaque cursor from meta.pagination.endCursor'),
];

const contextParams = [
  param('country', 'query', 'ISO country code for @inContext pricing', { schema: { type: 'string', pattern: '^[A-Za-z]{2}$' } }),
  param('language', 'query', 'ISO language code for @inContext translations', { schema: { type: 'string', pattern: '^[A-Za-z]{2}$' } }),
];

const cartIdParam = param('cartId', 'path', 'Shopify cart GID', {
  required: true,
  schema: { type: 'string', example: 'gid://shopify/Cart/c1-abc?key=123' },
});

const handleParam = param('handle', 'path', 'Shopify resource handle', {
  required: true,
  schema: { type: 'string', example: 'rwanda-coffee-250g' },
});

const successResponse = (description: string, example?: unknown) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/SuccessEnvelope' },
      ...(example ? { example } : {}),
    },
  },
});

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
  },
});

const envelopeExamples = {
  product: {
    success: true,
    data: {
      id: 'gid://shopify/Product/EXAMPLE',
      handle: 'rwanda-coffee-250g',
      title: 'Rwanda Coffee 250g',
      availableForSale: true,
      priceRange: {
        minVariantPrice: { amount: '15.00', currencyCode: 'EUR' },
        maxVariantPrice: { amount: '15.00', currencyCode: 'EUR' },
      },
      url: 'https://benaorigins.de/products/rwanda-coffee-250g',
      variants: [],
      images: [],
    },
    meta: {
      requestId: '00000000-0000-0000-0000-000000000000',
      generatedAt: '2026-10-20T09:00:00.000Z',
      dataSource: 'fixture',
    },
  },
  cart: {
    success: true,
    data: {
      id: 'gid://shopify/Cart/c1-example',
      totalQuantity: 1,
      checkoutUrl: 'https://checkout.shopify.com/...',
      checkout: { hostedBy: 'shopify', url: 'https://checkout.shopify.com/...' },
      lines: [],
      cost: {
        subtotalAmount: { amount: '15.00', currencyCode: 'EUR' },
        totalAmount: { amount: '15.00', currencyCode: 'EUR' },
      },
    },
    meta: {
      requestId: '00000000-0000-0000-0000-000000000000',
      generatedAt: '2026-10-20T09:00:00.000Z',
      dataSource: 'shopify',
    },
  },
};

export function buildOpenApiDocument(serverUrl = 'http://localhost:4000'): JsonSchema {
  return {
    openapi: '3.1.0',
    info: {
      title: 'BeNa Origins Storefront Backend API',
      version: '0.1.0',
      description:
        'Read-mostly commerce backend for the BeNa Origins headless storefront. Shopify remains the single source of truth. Carts are ephemeral; checkout is always Shopify-hosted. Responses use { success, data, meta } / { success:false, error } envelopes. Request validation is generated from the same Zod schemas used at runtime. FIXTURE MODE responses are mocks (meta.dataSource="fixture").',
      license: { name: 'Proprietary' },
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: 'Products' },
      { name: 'Collections' },
      { name: 'Search' },
      { name: 'Cart' },
      { name: 'Auth' },
      { name: 'Account' },
      { name: 'Localization' },
      { name: 'Content' },
      { name: 'Newsletter' },
      { name: 'Reviews' },
      { name: 'Audit' },
      { name: 'SEO' },
      { name: 'AI' },
      { name: 'Health' },
      { name: 'Webhooks' },
    ],
    components: {
      securitySchemes: {
        AdminApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-key',
          description:
            'SHA-256-hashed admin API key. Missing/invalid → 401; valid identity without the admin role → 403. Legacy X-Admin-Token is also accepted.',
        },
        AdminBearer: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'HS256 admin JWT signed with ADMIN_JWT_SECRET (roles/role must include admin).',
        },
        CustomerSession: {
          type: 'apiKey',
          in: 'cookie',
          name: 'bena_sid',
          description:
            'HttpOnly, signed session cookie created by /api/v1/auth/callback. The browser never receives Shopify tokens.',
        },
        AdminToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-token',
          description: 'Deprecated alias for x-admin-key.',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          required: ['success', 'data', 'meta'],
          properties: {
            success: { type: 'boolean', const: true },
            data: { description: 'Endpoint-specific payload' },
            meta: {
              type: 'object',
              properties: {
                requestId: { type: 'string' },
                generatedAt: { type: 'string', format: 'date-time' },
                dataSource: { type: 'string', enum: ['shopify', 'fixture'] },
                warnings: { type: 'array', items: { type: 'string' } },
                pagination: {
                  type: ['object', 'null'],
                  properties: {
                    hasNextPage: { type: 'boolean' },
                    hasPreviousPage: { type: 'boolean' },
                    startCursor: { type: ['string', 'null'] },
                    endCursor: { type: ['string', 'null'] },
                  },
                },
              },
              additionalProperties: true,
            },
          },
        },
        ErrorEnvelope: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', const: false },
            error: {
              type: 'object',
              required: ['code', 'message', 'requestId'],
              properties: {
                code: {
                  type: 'string',
                  enum: [
                    'VALIDATION_ERROR',
                    'NOT_FOUND',
                    'UNAUTHORIZED',
                    'FORBIDDEN',
                    'RATE_LIMITED',
                    'CONFLICT',
                    'UPSTREAM_ERROR',
                    'UPSTREAM_UNAVAILABLE',
                    'NOT_CONFIGURED',
                    'FEATURE_DISABLED',
                    'BAD_REQUEST',
                    'INTERNAL_ERROR',
                    'METHOD_NOT_ALLOWED',
                  ],
                },
                message: { type: 'string' },
                details: {},
                requestId: { type: 'string' },
              },
            },
          },
        },
        CreateCartBody: zodToOpenApiBody(createCartBody),
        AddCartLinesBody: zodToOpenApiBody(addCartLinesBody),
        UpdateCartLinesBody: zodToOpenApiBody(updateCartLinesBody),
        RemoveCartLinesBody: zodToOpenApiBody(removeCartLinesBody),
        UpdateBuyerIdentityBody: zodToOpenApiBody(updateBuyerIdentityBody),
        UpdateDiscountCodesBody: zodToOpenApiBody(updateDiscountCodesBody),
        NewsletterBody: zodToOpenApiBody(newsletterBody),
        Cart: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            totalQuantity: { type: 'integer' },
            checkoutUrl: { type: 'string', format: 'uri' },
            checkout: {
              type: 'object',
              properties: {
                hostedBy: { type: 'string', const: 'shopify' },
                url: { type: 'string', format: 'uri' },
              },
            },
            cost: { type: 'object' },
            lines: { type: 'array', items: { type: 'object' } },
            discountCodes: { type: 'array', items: { type: 'object' } },
            buyerIdentity: { type: 'object' },
            deliveryGroups: { type: 'array', items: { type: 'object' } },
            warnings: { type: 'array', items: { type: 'string' } },
          },
        },
        Product: {
          type: 'object',
          description: 'Full product shape (see src/types/domain.ts for the typed model).',
          properties: {
            id: { type: 'string' },
            handle: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            descriptionHtml: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            availableForSale: { type: 'boolean' },
            url: { type: 'string', format: 'uri' },
            priceRange: { type: 'object' },
            images: { type: 'array', items: { type: 'object' } },
            variants: { type: 'array', items: { type: 'object' } },
            metafields: { type: 'object' },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Validation failure',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } },
          },
        },
        Unauthorized: errorResponse('Missing/invalid signature or token'),
        NotFound: errorResponse('Resource not found'),
        RateLimited: errorResponse('Rate limit exceeded'),
        UpstreamError: errorResponse('Shopify or provider error'),
      },
    },
    paths: {
      '/api/v1/products': {
        get: {
          tags: ['Products'],
          summary: 'List products with cursor pagination and market context',
          parameters: [
            ...paginationParams,
            ...contextParams,
            param('query', 'query', 'Shopify product search filter syntax'),
            param('sortKey', 'query', 'ProductSortKeys', {
              schema: {
                type: 'string',
                enum: ['BEST_SELLING', 'CREATED_AT', 'ID', 'PRICE', 'RELEVANCE', 'TITLE', 'UPDATED_AT', 'VENDOR'],
              },
            }),
            param('reverse', 'query', 'Reverse sort order', { schema: { type: 'boolean' } }),
          ],
          responses: {
            200: successResponse('Product list', {
              ...envelopeExamples.product,
              data: [envelopeExamples.product.data],
              meta: { ...envelopeExamples.product.meta, pagination: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null } },
            }),
            400: { $ref: '#/components/responses/BadRequest' },
            429: { $ref: '#/components/responses/RateLimited' },
            502: { $ref: '#/components/responses/UpstreamError' },
          },
        },
      },
      '/api/v1/products/{handle}': {
        get: {
          tags: ['Products'],
          summary: 'Product details by handle (includes variants, images, metafields)',
          parameters: [handleParam, ...contextParams],
          responses: {
            200: successResponse('Product', envelopeExamples.product),
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/collections': {
        get: {
          tags: ['Collections'],
          summary: 'List collections',
          parameters: [...paginationParams, ...contextParams, param('query', 'query', 'Search query')],
          responses: { 200: successResponse('Collections') },
        },
      },
      '/api/v1/collections/{handle}': {
        get: {
          tags: ['Collections'],
          summary: 'Collection detail with paginated products',
          parameters: [handleParam, ...paginationParams, ...contextParams],
          responses: {
            200: successResponse('Collection with products'),
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/search': {
        get: {
          tags: ['Search'],
          summary: 'Product search',
          parameters: [
            param('q', 'query', 'Search terms', { required: true }),
            ...paginationParams,
            ...contextParams,
          ],
          responses: {
            200: successResponse('Search results'),
            400: { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/api/v1/search/suggestions': {
        get: {
          tags: ['Search'],
          summary: 'Predictive search suggestions (products, collections, pages, queries)',
          parameters: [
            param('q', 'query', 'Partial search term', { required: true }),
            param('limit', 'query', '1–10', { schema: { type: 'integer', minimum: 1, maximum: 10, default: 8 } }),
            param('unavailableProducts', 'query', 'LAST | SHOW | HIDE', {
              schema: { type: 'string', enum: ['LAST', 'SHOW', 'HIDE'] },
            }),
            ...contextParams,
          ],
          responses: { 200: successResponse('Predictive results') },
        },
      },
      '/api/v1/cart': {
        post: {
          tags: ['Cart'],
          summary: 'Create a Shopify cart (returns the real checkoutUrl)',
          requestBody: {
            required: true,
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CreateCartBody' } },
            },
          },
          responses: {
            201: successResponse('Cart created', envelopeExamples.cart),
            400: { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/api/v1/cart/{cartId}': {
        get: {
          tags: ['Cart'],
          summary: 'Get a cart',
          parameters: [cartIdParam],
          responses: {
            200: successResponse('Cart', envelopeExamples.cart),
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/cart/{cartId}/lines': {
        post: {
          tags: ['Cart'],
          summary: 'Add lines',
          parameters: [cartIdParam],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AddCartLinesBody' } } },
          },
          responses: { 200: successResponse('Cart updated', envelopeExamples.cart) },
        },
        patch: {
          tags: ['Cart'],
          summary: 'Update line quantities',
          parameters: [cartIdParam],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateCartLinesBody' } } },
          },
          responses: { 200: successResponse('Cart updated', envelopeExamples.cart) },
        },
        delete: {
          tags: ['Cart'],
          summary: 'Remove lines',
          parameters: [cartIdParam],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RemoveCartLinesBody' } } },
          },
          responses: { 200: successResponse('Cart updated', envelopeExamples.cart) },
        },
      },
      '/api/v1/cart/{cartId}/buyer-identity': {
        patch: {
          tags: ['Cart'],
          summary: 'Update buyer identity (email/phone/country/customer token)',
          parameters: [cartIdParam],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateBuyerIdentityBody' } } },
          },
          responses: { 200: successResponse('Cart updated', envelopeExamples.cart) },
        },
      },
      '/api/v1/cart/{cartId}/discount-codes': {
        patch: {
          tags: ['Cart'],
          summary: 'Replace discount codes',
          parameters: [cartIdParam],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateDiscountCodesBody' } } },
          },
          responses: { 200: successResponse('Cart updated', envelopeExamples.cart) },
        },
      },
      '/api/v1/auth/login': {
        get: {
          tags: ['Auth'],
          summary: 'Start Customer Account API login (PKCE + state + nonce); 302 to Shopify',
          parameters: [
            param('returnTo', 'query', 'Same-origin relative path only (open redirects rejected)'),
            param('locale', 'query', 'Optional locale, e.g. de-DE'),
            param('country', 'query', 'Optional ISO country for market-aware login'),
          ],
          responses: {
            302: { description: 'Redirect to the Shopify Customer Account authorize endpoint' },
            503: errorResponse('AUTH_CUSTOMER_ACCOUNTS_ENABLED=false or incomplete configuration'),
          },
        },
      },
      '/api/v1/auth/callback': {
        get: {
          tags: ['Auth'],
          summary: 'OAuth callback: validate state/nonce, exchange code, create server-side session',
          parameters: [
            param('code', 'query', 'Authorization code', { required: true }),
            param('state', 'query', 'OAuth state (single-use)', { required: true }),
            param('error', 'query', 'Provider error code'),
          ],
          responses: {
            302: {
              description:
                'Session cookie set (HttpOnly/Secure/SameSite=Lax) and redirect to returnTo',
            },
            400: { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/api/v1/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Revoke the local session and redirect to Shopify end-session',
          security: [{ CustomerSession: [] }],
          parameters: [
            param('x-csrf-token', 'header', 'CSRF token from /auth/session', { required: true }),
          ],
          responses: {
            303: { description: 'Redirect to Shopify logout / configured logout redirect' },
            403: errorResponse('CSRF or Origin rejection'),
          },
        },
      },
      '/api/v1/auth/session': {
        get: {
          tags: ['Auth'],
          summary: 'Minimal session status (enabled/authenticated/customer identity + CSRF); no tokens',
          responses: { 200: successResponse('Session status') },
        },
      },
      '/api/v1/account/me': {
        get: {
          tags: ['Account'],
          summary: 'Logged-in customer profile (read-only)',
          security: [{ CustomerSession: [] }],
          responses: {
            200: successResponse('Customer profile'),
            401: { $ref: '#/components/responses/Unauthorized' },
            503: errorResponse('Customer accounts disabled'),
          },
        },
      },
      '/api/v1/account/orders': {
        get: {
          tags: ['Account'],
          summary: 'Logged-in customer order history (read-only, cursor paginated)',
          security: [{ CustomerSession: [] }],
          parameters: paginationParams,
          responses: {
            200: successResponse('Orders'),
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/account/addresses': {
        get: {
          tags: ['Account'],
          summary: 'Logged-in customer addresses (read-only, cursor paginated)',
          security: [{ CustomerSession: [] }],
          parameters: paginationParams,
          responses: {
            200: successResponse('Addresses'),
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/v1/account/cart/associate': {
        post: {
          tags: ['Account'],
          summary: 'Associate the logged-in customer with a cart (buyer identity for prefilled checkout)',
          security: [{ CustomerSession: [] }],
          parameters: [
            param('x-csrf-token', 'header', 'CSRF token from /auth/session', { required: true }),
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['cartId'],
                  properties: { cartId: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: successResponse('Cart with buyer identity updated'),
            401: { $ref: '#/components/responses/Unauthorized' },
            403: errorResponse('CSRF/Origin rejection'),
          },
        },
      },
      '/api/v1/localization': {
        get: {
          tags: ['Localization'],
          summary: 'Countries, languages, currencies and derived market groups',
          parameters: contextParams,
          responses: { 200: successResponse('Localization info') },
        },
      },
      '/api/v1/shipping': {
        get: {
          tags: ['Content'],
          summary: 'Shipping information, market coverage gaps and optional cart delivery estimates',
          parameters: [
            ...contextParams,
            param('cartId', 'query', 'Optional cart GID to obtain Shopify delivery options'),
          ],
          responses: { 200: successResponse('Shipping report') },
        },
      },
      '/api/v1/policies': {
        get: {
          tags: ['Content'],
          summary: 'Store policies + legal notice + identity/contact inconsistencies',
          parameters: [],
          responses: { 200: successResponse('Policies') },
        },
      },
      '/api/v1/newsletter/subscribe': {
        post: {
          tags: ['Newsletter'],
          summary: 'Subscribe an email (explicit marketing consent required)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/NewsletterBody' } } },
          },
          responses: {
            201: successResponse('Subscription result (simulated=true for mock provider)'),
            400: { $ref: '#/components/responses/BadRequest' },
            503: errorResponse('Provider not configured'),
          },
        },
      },
      '/api/v1/reviews/assessment': {
        get: {
          tags: ['Reviews'],
          summary: 'Detect installed review app and document integration options',
          security: [{ AdminApiKey: [] }, { AdminBearer: [] }],
          responses: { 200: successResponse('Review provider assessment') },
        },
      },
      '/api/v1/audit/products': {
        get: {
          tags: ['Audit'],
          summary: 'Bulk product-information completeness report (read-only)',
          security: [{ AdminApiKey: [] }, { AdminBearer: [] }],
          parameters: [
            param('limit', 'query', 'Scan limit', { schema: { type: 'integer', minimum: 1, maximum: 1000 } }),
            param('refresh', 'query', 'Bypass cache', { schema: { type: 'boolean' } }),
            ...contextParams,
          ],
          responses: { 200: successResponse('Catalog audit report') },
        },
      },
      '/api/v1/audit/products/{handle}': {
        get: {
          tags: ['Audit'],
          summary: 'Single-product completeness report',
          security: [{ AdminApiKey: [] }, { AdminBearer: [] }],
          parameters: [handleParam, ...contextParams],
          responses: {
            200: successResponse('Product audit'),
            404: { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/v1/seo/product/{handle}': {
        get: {
          tags: ['SEO'],
          summary: 'Page metadata, canonical URL and JSON-LD for a product',
          parameters: [handleParam, ...contextParams],
          responses: { 200: successResponse('Metadata + JSON-LD') },
        },
      },
      '/api/v1/seo/collection/{handle}': {
        get: {
          tags: ['SEO'],
          summary: 'Page metadata, canonical URL and JSON-LD for a collection',
          parameters: [handleParam, ...contextParams],
          responses: { 200: successResponse('Metadata + JSON-LD') },
        },
      },
      '/api/v1/seo/page/{handle}': {
        get: {
          tags: ['SEO'],
          summary: 'Page metadata and breadcrumb JSON-LD for an informational page',
          parameters: [handleParam],
          responses: { 200: successResponse('Metadata + JSON-LD') },
        },
      },
      '/api/v1/seo/sitemap': {
        get: {
          tags: ['SEO'],
          summary: 'Sitemap data (JSON)',
          parameters: [param('limit', 'query', 'Product limit', { schema: { type: 'integer', default: 250 } })],
          responses: { 200: successResponse('Sitemap data') },
        },
      },
      '/api/v1/seo/sitemap.xml': {
        get: {
          tags: ['SEO'],
          summary: 'Sitemap XML',
          parameters: [param('limit', 'query', 'Product limit', { schema: { type: 'integer', default: 250 } })],
          responses: {
            200: { description: 'Sitemap XML', content: { 'application/xml': { schema: { type: 'string' } } } },
          },
        },
      },
      '/api/v1/seo/robots': {
        get: { tags: ['SEO'], summary: 'Robots data (JSON)', responses: { 200: successResponse('Robots data') } },
      },
      '/api/v1/seo/robots.txt': {
        get: {
          tags: ['SEO'],
          summary: 'robots.txt',
          responses: {
            200: { description: 'robots.txt', content: { 'text/plain': { schema: { type: 'string' } } } },
          },
        },
      },
      '/api/v1/ai/suggestions/{handle}': {
        get: {
          tags: ['AI'],
          summary: 'Unverified product-fact suggestions from one free hosted model',
          description:
            'Public, rate-limited and cached for one hour. `?refresh=true` bypasses the cache. Returns `503 FEATURE_DISABLED` when AI_API_KEY is missing.',
          parameters: [
            handleParam,
            ...contextParams,
            param('refresh', 'query', 'Bypass the in-memory cache', { schema: { type: 'boolean' } }),
          ],
          responses: {
            200: successResponse('AI suggestion (always needs review)'),
            400: { $ref: '#/components/responses/BadRequest' },
            429: { $ref: '#/components/responses/RateLimited' },
            503: errorResponse('AI disabled, provider unreachable or rate-limited'),
          },
        },
      },
      '/health': {
        get: { tags: ['Health'], summary: 'Liveness probe', responses: { 200: successResponse('Service alive') } },
      },
      '/health/ready': {
        get: {
          tags: ['Health'],
          summary: 'Readiness probe (Shopify reachability, webhook/socket config)',
          responses: {
            200: successResponse('Ready or degraded (see checks)'),
            503: errorResponse('Shopify unreachable / not ready'),
          },
        },
      },
      '/webhooks/shopify': {
        post: {
          tags: ['Webhooks'],
          summary: 'Shopify webhook receiver (raw-body HMAC + dedup)',
          parameters: [
            param('X-Shopify-Hmac-Sha256', 'header', 'Base64/hex HMAC signature', { required: true }),
            param('X-Shopify-Topic', 'header', 'Webhook topic', { required: true }),
            param('X-Shopify-Webhook-Id', 'header', 'Unique delivery id for dedup', { required: true }),
            param('X-Shopify-Shop-Domain', 'header', 'Shop domain', { required: true }),
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
          },
          responses: {
            200: successResponse('Accepted (processed asynchronously)'),
            401: { $ref: '#/components/responses/Unauthorized' },
            503: errorResponse('Webhook secret not configured'),
          },
        },
      },
    },
  };
}

export const OPENAPI_TAGS = [
  'Products',
  'Collections',
  'Search',
  'Cart',
  'Auth',
  'Account',
  'Localization',
  'Content',
  'Newsletter',
  'Reviews',
  'Audit',
  'SEO',
  'AI',
  'Health',
  'Webhooks',
];
