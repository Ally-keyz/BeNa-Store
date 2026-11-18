# Authentication — implementation notes

Three layers, as required by the addendum. Layer 2 is mandatory; Layer 1 is feature-flagged.

| Layer | Scope | State |
| --- | --- | --- |
| 1 | Shopper accounts via Shopify **Customer Account API** (OAuth 2.0 Authorization Code + PKCE, BFF) | Implemented behind `AUTH_CUSTOMER_ACCOUNTS_ENABLED=false`; **UNVERIFIED — live Shopify credentials and a real login are still required** |
| 2 | Our admin endpoints + admin Socket.IO namespace | Implemented and mandatory |
| 3 | Webhook HMAC + Storefront token server-side only | Implemented |

No passwords are stored. No customer/order database exists. Shopify remains the identity and commerce source of truth.

---

## Layer 1 — customer accounts (BFF)

### Flow

```text
Browser                    Backend (BFF)                 Shopify
  | GET /auth/login           |                             |
  |-------------------------->| create state/nonce/verifier |
  |                           | store pending (10 min)      |
  | 302 authorize URL         |                             |
  |<--------------------------|                             |
  |-------------------------------------------------------->| login + consent
  | 302 /auth/callback?code&state                           |
  |<--------------------------------------------------------|
  | GET /auth/callback        |                             |
  |-------------------------->| take state (single use)     |
  |                           | exchange code + PKCE ------->|
  |                           |<---- access/refresh/id_token |
  |                           | verify JWKS + nonce + iss/aud|
  |                           | create server-side session  |
  | 302 returnTo + Set-Cookie |                             |
  |<--------------------------|                             |
```

- **PKCE is always used** (`S256`), including for confidential clients.
- `state` is stored server-side and is single-use; a short-lived HttpOnly `bena_oauth_state`
  cookie binds the callback to the same browser (login-CSRF defense). Replay returns `400`.
- `nonce` is verified from the signed `id_token` (JWKS signature, issuer, audience, nonce).
- Tokens are stored only in the server-side session store (memory, or Redis when `REDIS_URL` is set).
- The browser gets an **HttpOnly, Secure (prod), SameSite=Lax** signed cookie and a CSRF token — never a Shopify token.
- Cookie name: `__Host-bena_sid` in production when no `COOKIE_DOMAIN` is set; otherwise `bena_sid`.
- Access tokens are refreshed server-side with refresh-token rotation. If a client does not receive refresh tokens (app client IDs), the session simply expires and the customer logs in again.
- Sessions survive process restarts only with Redis.

### Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/v1/auth/login` | 302 to Shopify authorize; optional `returnTo`, `locale`, `country`, `loginHint` |
| GET | `/api/v1/auth/callback` | Validates state/nonce, exchanges code, sets session cookie, 302 to validated `returnTo` |
| POST | `/api/v1/auth/logout` | Requires session cookie + `x-csrf-token`; deletes session, clears cookie, 303 to Shopify end-session |
| GET | `/api/v1/auth/session` | `{ enabled, authenticated, customer?, csrfToken?, expiresAt? }`; never tokens |
| GET | `/api/v1/account/me` | Profile + default address (read-only) |
| GET | `/api/v1/account/orders` | Order history, cursor pagination (read-only) |
| GET | `/api/v1/account/addresses` | Addresses, cursor pagination (read-only) |
| POST | `/api/v1/account/cart/associate` | Sets cart buyer identity `customerAccessToken`; requires CSRF |

Disabled feature flag: `/auth/session` returns `{ enabled:false, authenticated:false }`; login/account routes return `503 FEATURE_DISABLED`. Guest checkout remains untouched.

### Security controls

- CSRF double-submit on logout and cart association (`x-csrf-token` from `/auth/session`).
- Origin allow-list on state-changing browser routes (missing Origin is allowed only with CSRF; server-to-server calls).
- Open-redirect prevention: `returnTo` must be a same-origin relative path (`/...`, no `//`, no backslashes/control chars).
- Redirect URIs come only from env and must be registered in Shopify.
- Strict auth rate limiting (`AUTH_RATE_LIMIT_MAX`) on all `/auth` routes.
- `/auth/*` and `/account/*` responses are `Cache-Control: no-store`.
- Logs never contain tokens, authorization codes, cookies, state/verifier, or email addresses.
- 401 for no/invalid session; 403 for CSRF/Origin failures.
- Account routes are read-only. Address/profile mutations are deliberately not implemented.

### Checkout association — caveat

Per Shopify's current docs, a logged-in buyer can be carried into checkout either by:

1. setting `customerAccessToken` on the cart (`cartBuyerIdentityUpdate`), which we implement, or
2. appending `sso=silent` to the `checkoutUrl`.

The Customer Account API token is passed as `customerAccessToken` in step 1. This must be confirmed with a live login + cart + checkout-abandon test; it is part of the "UNVERIFIED" status. If Shopify rejects it, fall back to `sso=silent` at the frontend redirect.

### Shopify setup required

1. Admin → **Settings → Customer accounts** → enable **New customer accounts** (not legacy).
2. Admin → **Settings → Apps and sales channels → Headless** → your storefront → **Customer Account API** settings:
   - copy **Client ID** (and Client secret if shown);
   - add the exact **Redirect URI**;
   - add the **Logout redirect URI**;
   - add the **JavaScript origin**.
3. Discovery endpoints (open in a browser):
   - `https://{storefront-domain}/.well-known/openid-configuration`
   - `https://{storefront-domain}/.well-known/customer-account-api`
4. OAuth scope: `openid email customer-account-api:full`.
5. Protected customer data requirements apply to Customer Account API usage; confirm the app/store meets them.

Local development requires **HTTPS** redirect URIs. Use a tunnel (Cloudflare/ngrok) for the backend callback, e.g.:

```text
https://random.trycloudflare.com/api/v1/auth/callback
```

and register the same URL in Shopify. The frontend JS origin can be `http://localhost:5173` if Shopify accepts it; otherwise use a tunnel.

---

## Layer 2 — admin protection (mandatory)

Admin endpoints (`/api/v1/audit/*`, `/api/v1/reviews/assessment`) and the `/admin` Socket.IO namespace require one of:

- `X-Admin-Key: <key>` (legacy `X-Admin-Token` accepted) compared against `ADMIN_API_KEY_SHA256` (SHA-256 hex; the raw key is never stored in env when you use the hash).
- `Authorization: Bearer <HS256 JWT>` signed with `ADMIN_JWT_SECRET`; payload must contain `role: "admin"` or `roles: ["admin", ...]`.

Status codes:

| Case | Status |
| --- | --- |
| No credentials / bad key / bad/expired JWT | `401 UNAUTHORIZED` |
| Valid JWT but no admin role | `403 FORBIDDEN` |
| No admin auth configured on the server | `503 NOT_CONFIGURED` (fail closed) |

`npm run admin:token` mints a JWT usable for both the admin API and the Socket.IO admin namespace. `ADMIN_JWT_SECRET` takes precedence over `SOCKET_ADMIN_JWT_SECRET` (the latter remains a fallback).

---

## Layer 3 — machine auth

Already implemented: Shopify webhook HMAC-SHA256 with timing-safe comparison, dedup, and the Storefront private token kept server-side. The Admin API token is only used by the webhook registration script.

---

## Guest-checkout-only option

If you decide to skip Layer 1:

- Leave `AUTH_CUSTOMER_ACCOUNTS_ENABLED=false` (default) and do **not** configure Customer Account API credentials.
- Skip `SHOPIFY_CUSTOMER_ACCOUNT_*`, `SESSION_SECRET`, `COOKIE_*`, auth redirect URIs and the Headless Customer Account API settings.
- You can skip the entire `/api/v1/auth/*` and `/api/v1/account/*` surface; existing endpoints continue to return `FEATURE_DISABLED` for auth and `FEATURE_DISABLED` for account.
- Keep **Layer 2** (admin key/JWT) and **Layer 3** (webhooks, tokens) — they are mandatory regardless.
- Guest cart + real Shopify `checkoutUrl` works unchanged; customers can still pay as guests.
- You lose: order history, saved addresses, prefilled checkout, account session, and authenticated order tracking. Order confirmation emails/status pages remain Shopify's responsibility.
- You can enable Layer 1 later without data migration: there is no local user/order database to change.

If you might want accounts soon, keep the Headless channel and create the Customer Account API client now, but leave the feature flag off.
