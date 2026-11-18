import type { Logger } from 'pino';
import { createLocalJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { z } from 'zod';
import type { AppConfig } from '../../config/env';
import { AppError, badRequest, notConfigured, unauthorized, upstreamError } from '../../utils/errors';
export interface OidcConfiguration {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
  issuer?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  idToken: string;
  expiresIn: number;
}

const TokenResponseSchema = z.object({
  access_token: z.string().min(10),
  expires_in: z.coerce.number().int().positive(),
  id_token: z.string().min(10),
  refresh_token: z.string().min(10).optional(),
  token_type: z.string().optional(),
});

const RefreshTokenResponseSchema = z.object({
  access_token: z.string().min(10),
  expires_in: z.coerce.number().int().positive(),
  id_token: z.string().min(10).optional(),
  refresh_token: z.string().min(10).optional(),
  token_type: z.string().optional(),
});

export interface RefreshedTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresIn: number;
}

const OidcSchema = z.object({
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  end_session_endpoint: z.string().url(),
  jwks_uri: z.string().url(),
  issuer: z.string().optional(),
});

const ApiDiscoverySchema = z.object({
  graphql_api: z.string().url(),
});

/**
 * OAuth 2.0 Authorization Code + PKCE client for Shopify's Customer Account API.
 * Tokens never leave the server; only the CustomerAuthService sees them.
 */
export class CustomerOAuthClient {
  private oidcCache: OidcConfiguration | null = null;
  private apiUrlCache: string | null = null;
  private jwks: ReturnType<typeof createLocalJWKSet> | null = null;

  constructor(
    private readonly auth: AppConfig['auth'],
    private readonly logger: Logger,
    fetchImpl?: typeof fetch,
  ) {
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  private readonly fetchImpl: typeof fetch;

  private async fetchJson(url: string, init?: RequestInit): Promise<unknown> {
    const response = await this.fetchImpl(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BeNaOriginsBackend/0.1',
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw upstreamError(`Shopify authentication endpoint responded with HTTP ${response.status}`);
    }
    return response.json();
  }

  async getOidcConfiguration(): Promise<OidcConfiguration> {
    if (this.oidcCache) return this.oidcCache;

    const explicit: Partial<OidcConfiguration> = {
      authorization_endpoint: this.auth.authUrl ?? undefined,
      token_endpoint: this.auth.tokenUrl ?? undefined,
      end_session_endpoint: this.auth.logoutUrl ?? undefined,
      jwks_uri: this.auth.jwksUri ?? undefined,
      issuer: this.auth.issuer ?? undefined,
    };

    if (
      explicit.authorization_endpoint &&
      explicit.token_endpoint &&
      explicit.end_session_endpoint &&
      explicit.jwks_uri
    ) {
      this.oidcCache = explicit as OidcConfiguration;
      return this.oidcCache;
    }

    if (!this.auth.discoveryUrl) {
      throw notConfigured('Customer Account OAuth discovery URL is not configured');
    }

    const raw = await this.fetchJson(this.auth.discoveryUrl);
    let discovered: z.infer<typeof OidcSchema>;
    try {
      discovered = OidcSchema.parse(raw);
    } catch {
      throw upstreamError('Invalid OpenID discovery document');
    }
    this.oidcCache = {
      ...discovered,
      ...Object.fromEntries(
        Object.entries(explicit).filter(([, value]) => Boolean(value)),
      ),
    } as OidcConfiguration;
    return this.oidcCache;
  }

  async getApiEndpoint(): Promise<string> {
    if (this.apiUrlCache) return this.apiUrlCache;
    if (this.auth.apiUrl) {
      this.apiUrlCache = this.auth.apiUrl;
      return this.apiUrlCache;
    }
    if (!this.auth.apiDiscoveryUrl) {
      throw notConfigured('Customer Account API URL is not configured');
    }
    const raw = await this.fetchJson(this.auth.apiDiscoveryUrl);
    let discovered: z.infer<typeof ApiDiscoverySchema>;
    try {
      discovered = ApiDiscoverySchema.parse(raw);
    } catch {
      throw upstreamError('Invalid Customer Account API discovery document');
    }
    this.apiUrlCache = discovered.graphql_api;
    return this.apiUrlCache;
  }

  async buildAuthorizationUrl(params: {
    state: string;
    nonce: string;
    codeChallenge: string;
    locale?: string;
    country?: string;
    loginHint?: string;
  }): Promise<string> {
    const oidc = await this.getOidcConfiguration();
    if (!this.auth.clientId || !this.auth.redirectUri) {
      throw notConfigured('Customer Account API client ID/redirect URI are not configured');
    }
    const url = new URL(oidc.authorization_endpoint);
    url.searchParams.set('scope', this.auth.scope);
    url.searchParams.set('client_id', this.auth.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', this.auth.redirectUri);
    url.searchParams.set('state', params.state);
    url.searchParams.set('nonce', params.nonce);
    url.searchParams.set('code_challenge', params.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    if (params.locale) url.searchParams.set('locale', params.locale);
    if (params.country) url.searchParams.set('region_country', params.country);
    if (params.loginHint) url.searchParams.set('login_hint', params.loginHint);
    return url.toString();
  }

  private formHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Origin: this.auth.jsOrigin,
      'User-Agent': 'BeNaOriginsBackend/0.1',
    };
    if (this.auth.clientSecret && this.auth.clientId) {
      headers.Authorization = `Basic ${Buffer.from(
        `${this.auth.clientId}:${this.auth.clientSecret}`,
        'utf8',
      ).toString('base64')}`;
    }
    return headers;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
    const oidc = await this.getOidcConfiguration();
    return this.tokenRequest(oidc.token_endpoint, code, codeVerifier);
  }

  private async tokenRequest(
    tokenEndpoint: string,
    code: string,
    codeVerifier: string,
  ): Promise<TokenSet> {
    if (!this.auth.clientId || !this.auth.redirectUri) {
      throw notConfigured('Customer Account API client configuration is incomplete');
    }
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.auth.clientId,
      redirect_uri: this.auth.redirectUri,
      code,
      code_verifier: codeVerifier,
    });

    const response = await this.fetchImpl(tokenEndpoint, {
      method: 'POST',
      headers: this.formHeaders(),
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const providerError = await response
        .json()
        .then((payload: unknown) =>
          typeof payload === 'object' && payload !== null && 'error' in payload
            ? String((payload as { error: unknown }).error)
            : 'unknown',
        )
        .catch(() => 'unknown');
      this.logger.warn(
        { provider: 'customer-account', status: response.status, providerError },
        'customer account token exchange failed',
      );
      throw badRequest('Authorization code exchange failed', { providerError });
    }

    const parsed = TokenResponseSchema.parse(await response.json());
    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token ?? null,
      idToken: parsed.id_token,
      expiresIn: parsed.expires_in,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshedTokens> {
    const oidc = await this.getOidcConfiguration();
    if (!this.auth.clientId) throw notConfigured('CUSTOMER_ACCOUNT_CLIENT_ID missing');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.auth.clientId,
      refresh_token: refreshToken,
    });
    const response = await this.fetchImpl(oidc.token_endpoint, {
      method: 'POST',
      headers: this.formHeaders(),
      body,
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      this.logger.warn(
        { provider: 'customer-account', status: response.status },
        'customer account token refresh failed',
      );
      throw unauthorized('Customer session expired');
    }

    const parsed = RefreshTokenResponseSchema.parse(await response.json());
    return {
      accessToken: parsed.access_token,
      // Rotation: a provider may issue a new refresh token; keep the old one otherwise.
      refreshToken: parsed.refresh_token ?? refreshToken,
      idToken: parsed.id_token ?? null,
      expiresIn: parsed.expires_in,
    };
  }

  async verifyIdToken(idToken: string, expectedNonce: string): Promise<JWTPayload> {
    const oidc = await this.getOidcConfiguration();
    try {
      if (!this.jwks) {
        // Fetch JWKS through the injected fetch implementation (proxy/test friendly)
        // instead of jose's node:https transport.
        const raw = await this.fetchJson(oidc.jwks_uri);
        const jwksSchema = z.object({
          keys: z.array(z.record(z.string(), z.unknown())).min(1),
        });
        const jwks = jwksSchema.parse(raw);
        this.jwks = createLocalJWKSet(
          jwks as unknown as Parameters<typeof createLocalJWKSet>[0],
        );
      }
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: oidc.issuer || this.auth.issuer || undefined,
        audience: this.auth.clientId ?? undefined,
        clockTolerance: 60,
      });
      if (!payload.nonce || payload.nonce !== expectedNonce) {
        throw unauthorized('Invalid authentication response (nonce mismatch)');
      }
      if (!payload.sub) throw unauthorized('Invalid authentication response (missing subject)');
      return payload;
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.warn({ provider: 'customer-account' }, 'ID token validation failed');
      throw unauthorized('Invalid authentication response');
    }
  }

  async buildLogoutUrl(idToken: string | null): Promise<string | null> {
    if (!idToken) return null;
    const oidc = await this.getOidcConfiguration();
    const url = new URL(oidc.end_session_endpoint);
    url.searchParams.set('id_token_hint', idToken);
    url.searchParams.set(
      'post_logout_redirect_uri',
      this.auth.logoutRedirectUri ?? this.auth.jsOrigin,
    );
    return url.toString();
  }

  async customerGraphql<T>(
    query: string,
    variables: Record<string, unknown>,
    accessToken: string,
  ): Promise<T> {
    const endpoint = await this.getApiEndpoint();
    const response = await this.fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'BeNaOriginsBackend/0.1',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(12_000),
    });

    if (response.status === 401 || response.status === 403) {
      throw unauthorized('Customer session is no longer valid');
    }
    if (response.status === 429) {
      throw upstreamError('Customer Account API rate limit exceeded');
    }
    if (!response.ok) {
      throw upstreamError(`Customer Account API responded with HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string; extensions?: { code?: string } }>;
    };
    if (payload.errors?.length) {
      const codes = payload.errors.map((error) => error.extensions?.code).filter(Boolean);
      if (codes.includes('THROTTLED')) throw upstreamError('Customer Account API throttled');
      throw upstreamError('Customer Account API error', { codes });
    }
    if (!payload.data) throw upstreamError('Customer Account API returned no data');
    return payload.data;
  }
}
