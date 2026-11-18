import type { Logger } from 'pino';
import type { AppConfig } from '../config/env';
import type {
  AccountSession,
  AuthSessionStatus,
  CustomerAddress,
  CustomerOrder,
  CustomerProfile,
} from '../types/auth';
import type { PageInfo } from '../types/domain';
import type { Cart } from '../types/domain';
import { featureDisabled, forbidden, notConfigured, unauthorized, validationError } from '../utils/errors';
import type { CartService } from './cart.service';
import { CustomerOAuthClient, type TokenSet } from './customerAuth/oauthClient';
import {
  createNonce,
  createCodeChallenge,
  createCodeVerifier,
  createState,
  safeEqualString,
  validateReturnTo,
} from './customerAuth/pkce';
import {
  createAuthStore,
  newSessionId,
  parseCookieHeader,
  verifyCookieValue,
  type AuthStore,
} from './customerAuth/sessionStore';

interface RawAddress {
  id?: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
  countryCode?: string | null;
  zip?: string | null;
  phoneNumber?: string | null;
  formatted?: string[] | null;
}

interface RawPageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

const ADDRESS_FRAGMENT = /* GraphQL */ `
  fragment CustomerAddressFields on CustomerAddress {
    id
    name
    firstName
    lastName
    company
    address1
    address2
    city
    province
    country
    countryCode
    zip
    phoneNumber
    formatted
  }
`;

const PROFILE_QUERY = /* GraphQL */ `
  query CustomerProfile {
    customer {
      id
      displayName
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
      defaultAddress {
        ...CustomerAddressFields
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

const ORDERS_QUERY = /* GraphQL */ `
  query CustomerOrders($first: Int!, $after: String) {
    customer {
      orders(first: $first, after: $after, reverse: true) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          cursor
          node {
            id
            name
            number
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice {
              amount
              currencyCode
            }
            statusPageUrl
            lineItems(first: 10) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
          }
        }
      }
    }
  }
`;

const ADDRESSES_QUERY = /* GraphQL */ `
  query CustomerAddresses($first: Int!, $after: String) {
    customer {
      addresses(first: $first, after: $after) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
        edges {
          cursor
          node {
            ...CustomerAddressFields
          }
        }
      }
    }
  }
  ${ADDRESS_FRAGMENT}
`;

function mapAddress(raw: RawAddress | null | undefined): CustomerAddress | null {
  if (!raw?.id) return null;
  return {
    id: raw.id,
    name: raw.name ?? null,
    firstName: raw.firstName ?? null,
    lastName: raw.lastName ?? null,
    company: raw.company ?? null,
    address1: raw.address1 ?? null,
    address2: raw.address2 ?? null,
    city: raw.city ?? null,
    province: raw.province ?? null,
    country: raw.country ?? null,
    countryCode: raw.countryCode ?? null,
    zip: raw.zip ?? null,
    phoneNumber: raw.phoneNumber ?? null,
    formatted: raw.formatted ?? [],
  };
}

function mapPageInfo(raw: RawPageInfo): PageInfo {
  return {
    hasNextPage: Boolean(raw.hasNextPage),
    hasPreviousPage: Boolean(raw.hasPreviousPage),
    startCursor: raw.startCursor ?? null,
    endCursor: raw.endCursor ?? null,
  };
}

export interface CustomerAuthServiceOptions {
  store?: AuthStore;
  oauth?: CustomerOAuthClient;
}

/**
 * Layer 1 BFF for Shopify Customer Account API.
 *
 * Tokens live only in the server-side session store. The browser gets an
 * HttpOnly session cookie and a CSRF token, never a Shopify token.
 */
export class CustomerAuthService {
  private readonly store: AuthStore;
  private readonly oauth: CustomerOAuthClient;

  constructor(
    private readonly config: AppConfig,
    private readonly logger: Logger,
    private readonly cartService?: CartService,
    options: CustomerAuthServiceOptions = {},
  ) {
    this.store = options.store ?? createAuthStore(config.redisUrl, logger);
    this.oauth = options.oauth ?? new CustomerOAuthClient(config.auth, logger);
  }

  private ensureEnabled(): void {
    if (!this.config.auth.enabled) {
      throw featureDisabled(
        'Customer accounts are disabled (AUTH_CUSTOMER_ACCOUNTS_ENABLED=false)',
      );
    }
    if (!this.config.auth.configured) {
      throw notConfigured('Customer Account API is enabled but not fully configured');
    }
  }

  async beginLogin(params: {
    returnTo?: string;
    locale?: string;
    country?: string;
    loginHint?: string;
  }): Promise<{ url: string; state: string }> {
    this.ensureEnabled();
    const state = createState();
    const nonce = createNonce();
    const verifier = createCodeVerifier();
    const challenge = createCodeChallenge(verifier);
    const returnTo = validateReturnTo(params.returnTo);

    await this.store.putPending(
      { state, verifier, nonce, returnTo, createdAt: Date.now() },
      this.config.auth.stateTtlSeconds,
    );

    const url = await this.oauth.buildAuthorizationUrl({
      state,
      nonce,
      codeChallenge: challenge,
      locale: params.locale,
      country: params.country,
      loginHint: params.loginHint,
    });

    this.logger.info({ event: 'auth.login.started' }, 'customer login started');
    return { url, state };
  }

  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ sessionId: string; returnTo: string; expiresAt: string }> {
    this.ensureEnabled();
    const pending = await this.store.takePending(state);
    if (!pending) {
      this.logger.warn({ event: 'auth.callback.invalid_state' }, 'OAuth state rejected');
      throw validationError('Invalid or expired OAuth state');
    }

    const tokens = await this.oauth.exchangeCode(code, pending.verifier);
    const claims = await this.oauth.verifyIdToken(tokens.idToken, pending.nonce);
    const session = this.createSession(claims.sub!, typeof claims.email === 'string' ? claims.email : null, tokens);
    await this.store.setSession(session, this.config.auth.sessionTtlSeconds);

    this.logger.info({ event: 'auth.callback.success' }, 'customer login completed');
    return {
      sessionId: session.id,
      returnTo: pending.returnTo,
      expiresAt: new Date(session.accessTokenExpiresAt).toISOString(),
    };
  }

  async logout(sessionId: string | null): Promise<string> {
    let idToken: string | null = null;
    if (sessionId) {
      const session = await this.store.getSession(sessionId);
      idToken = session?.idToken ?? null;
      await this.store.deleteSession(sessionId);
    }
    const redirect =
      (await this.oauth.buildLogoutUrl(idToken).catch(() => null)) ??
      this.config.auth.logoutRedirectUri ??
      this.config.frontendUrl;
    this.logger.info({ event: 'auth.logout' }, 'customer logged out');
    return redirect;
  }

  async getStatus(cookieHeader: string | undefined): Promise<AuthSessionStatus> {
    if (!this.config.auth.enabled) {
      return { enabled: false, authenticated: false };
    }
    const session = await this.sessionFromCookie(cookieHeader);
    if (!session) return { enabled: true, authenticated: false };
    return {
      enabled: true,
      authenticated: true,
      customer: {
        id: session.customerId,
        email: session.email,
      },
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.accessTokenExpiresAt).toISOString(),
    };
  }

  async requireSession(cookieHeader: string | undefined): Promise<AccountSession> {
    this.ensureEnabled();
    const session = await this.sessionFromCookie(cookieHeader);
    if (!session) throw unauthorized('Customer authentication required');
    return session;
  }

  /** Used by logout: returns null instead of throwing when the session is gone. */
  async readSession(cookieHeader: string | undefined): Promise<AccountSession | null> {
    if (!this.config.auth.enabled) return null;
    return this.sessionFromCookie(cookieHeader);
  }

  async getProfile(cookieHeader: string | undefined): Promise<CustomerProfile> {
    const session = await this.requireSession(cookieHeader);
    const data = await this.oauth.customerGraphql<{
      customer: {
        id: string;
        displayName: string;
        firstName: string | null;
        lastName: string | null;
        emailAddress: { emailAddress: string } | null;
        phoneNumber: { phoneNumber: string } | null;
        defaultAddress: RawAddress | null;
      };
    }>(PROFILE_QUERY, {}, session.accessToken);

    return {
      id: data.customer.id,
      displayName: data.customer.displayName,
      firstName: data.customer.firstName,
      lastName: data.customer.lastName,
      email: data.customer.emailAddress?.emailAddress ?? session.email,
      phone: data.customer.phoneNumber?.phoneNumber ?? null,
      defaultAddress: mapAddress(data.customer.defaultAddress),
    };
  }

  async getOrders(
    cookieHeader: string | undefined,
    params: { first: number; after?: string },
  ): Promise<{ items: CustomerOrder[]; pageInfo: PageInfo }> {
    const session = await this.requireSession(cookieHeader);
    const data = await this.oauth.customerGraphql<{
      customer: {
        orders: {
          pageInfo: RawPageInfo;
          edges: Array<{
            node: {
              id: string;
              name: string;
              number: number;
              processedAt: string;
              financialStatus: string | null;
              fulfillmentStatus: string;
              totalPrice: { amount: string; currencyCode: string };
              statusPageUrl: string;
              lineItems: { edges: Array<{ node: { title: string; quantity: number } }> };
            };
          }>;
        };
      };
    }>(ORDERS_QUERY, { first: params.first, after: params.after ?? null }, session.accessToken);

    return {
      items: data.customer.orders.edges.map(({ node }) => ({
        id: node.id,
        name: node.name,
        number: node.number,
        processedAt: node.processedAt,
        financialStatus: node.financialStatus,
        fulfillmentStatus: node.fulfillmentStatus,
        totalPrice: node.totalPrice,
        statusPageUrl: node.statusPageUrl,
        lines: node.lineItems.edges.map((line) => line.node),
      })),
      pageInfo: mapPageInfo(data.customer.orders.pageInfo),
    };
  }

  async getAddresses(
    cookieHeader: string | undefined,
    params: { first: number; after?: string },
  ): Promise<{ items: CustomerAddress[]; pageInfo: PageInfo }> {
    const session = await this.requireSession(cookieHeader);
    const data = await this.oauth.customerGraphql<{
      customer: {
        addresses: {
          pageInfo: RawPageInfo;
          edges: Array<{ node: RawAddress }>;
        };
      };
    }>(ADDRESSES_QUERY, { first: params.first, after: params.after ?? null }, session.accessToken);

    return {
      items: data.customer.addresses.edges
        .map((edge) => mapAddress(edge.node))
        .filter((address): address is CustomerAddress => Boolean(address)),
      pageInfo: mapPageInfo(data.customer.addresses.pageInfo),
    };
  }

  /** Associate the logged-in customer with a Shopify cart for prefilled checkout. */
  async associateCart(cookieHeader: string | undefined, cartId: string): Promise<Cart> {
    const session = await this.requireSession(cookieHeader);
    if (!this.cartService) throw notConfigured('Cart service is unavailable');
    return this.cartService.updateBuyerIdentity(cartId, {
      customerAccessToken: session.accessToken,
    });
  }

  verifyCsrf(session: AccountSession, provided: string | undefined): void {
    if (!provided || !safeEqualString(session.csrfToken, provided)) {
      throw forbidden('Invalid CSRF token');
    }
  }

  private createSession(
    customerId: string,
    email: string | null,
    tokens: TokenSet,
  ): AccountSession {
    const now = Date.now();
    return {
      id: newSessionId(),
      customerId,
      email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: now + tokens.expiresIn * 1000,
      idToken: tokens.idToken,
      csrfToken: createState(),
      createdAt: now,
      updatedAt: now,
    };
  }

  private async sessionFromCookie(cookieHeader: string | undefined): Promise<AccountSession | null> {
    const auth = this.config.auth;
    if (!auth.sessionSecret) return null;
    const cookieValue = parseCookieHeader(cookieHeader)[auth.cookieName];
    const sessionId = verifyCookieValue(cookieValue, auth.sessionSecret);
    if (!sessionId) return null;

    let session = await this.store.getSession(sessionId);
    if (!session) return null;

    if (session.accessTokenExpiresAt <= Date.now() + 60_000) {
      if (!session.refreshToken) {
        await this.store.deleteSession(session.id);
        return null;
      }
      try {
        const refreshed = await this.oauth.refresh(session.refreshToken);
        session = {
          ...session,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          accessTokenExpiresAt: Date.now() + refreshed.expiresIn * 1000,
          idToken: refreshed.idToken ?? session.idToken,
          updatedAt: Date.now(),
        };
        await this.store.setSession(session, auth.sessionTtlSeconds);
        this.logger.info({ event: 'auth.session.refreshed' }, 'customer session refreshed');
      } catch {
        await this.store.deleteSession(session.id);
        this.logger.warn({ event: 'auth.session.refresh_failed' }, 'customer session invalidated');
        return null;
      }
    }

    return session;
  }

  async close(): Promise<void> {
    await this.store.close();
  }
}
