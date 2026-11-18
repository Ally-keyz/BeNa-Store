# Socket.IO events — implementation & contract

Socket.IO is attached to the same HTTP server as the REST API. It is a **notification fan-out
only**. It is never the source of truth for inventory, prices, payments or orders. Every event
carries a hint; clients must re-fetch authoritative data from REST (and ultimately Shopify).

Source of all events: **Shopify webhooks that passed HMAC verification and deduplication**.
Webhook payloads are validated with Zod before any event is emitted.

## Transports & endpoints

| Namespace | Auth | Audience | Data sensitivity |
| --- | --- | --- | --- |
| `/storefront` | none | public storefront clients | no PII, no prices, no exact inventory, no order data |
| `/admin` | signed HS256 JWT (`ADMIN_JWT_SECRET`, fallback `SOCKET_ADMIN_JWT_SECRET`) | store administrators / internal tools | operational metadata only, no customer PII |

Default Socket.IO path: `/socket.io`.

CORS for Socket.IO is restricted by `SOCKET_CORS_ORIGINS` (falls back to `CORS_ALLOWED_ORIGINS`).
Never configure `*`.

## Public namespace `/storefront`

On connect the server emits:

```json
// event: connection.ready
{ "socketId": "abc123", "serverTime": "2026-10-20T10:00:00.000Z" }
```

### Client → server

| Event | Payload | Effect |
| --- | --- | --- |
| `subscribe.product` | `{ "productId": "gid://shopify/Product/123" }` | joins room `product:<id>`; ack `subscription.ok {room}` |
| `unsubscribe.product` | same | leaves the room |

Invalid payloads receive `subscription.error { message }`. A connection can hold at most 50 room
subscriptions.

### Server → client

| Event | Payload | Emitter | Notes |
| --- | --- | --- | --- |
| `connection.ready` | `{ socketId, serverTime }` | server | emitted on connect |
| `subscription.ok` | `{ room }` | server | subscription confirmed |
| `subscription.error` | `{ message }` | server | invalid payload or limit |
| `product.changed` | `{ productId, handle, updatedAt }` | Shopify webhook `products/update` | broadcast; clients re-fetch `/api/v1/products/:handle` |

There is intentionally **no public inventory event**: `inventory_levels/update` identifies an
inventory item, not a variant/product, and mapping it would require an Admin API lookup. Adding a
public event would either leak exact inventory or imply a product mapping we cannot guarantee.

## Admin namespace `/admin`

Handshake:

```ts
const socket = io('https://api.example.com/admin', {
  auth: { token: '<JWT>' }, // or Authorization: Bearer <JWT>
});
```

- JWT must be HS256, signed with `ADMIN_JWT_SECRET` (or the `SOCKET_ADMIN_JWT_SECRET` fallback), payload `{ sub, role: "admin" }` or `{ sub, roles: [...] }` including `admin`.
- Missing/invalid/expired token → `connect_error` with `unauthorized…`.
- If `ADMIN_JWT_SECRET`/`SOCKET_ADMIN_JWT_SECRET` is unset, **all** admin connections are rejected (`admin namespace
  disabled`). The capability is reported by `GET /health/ready`.
- On connect the server joins the socket to room `admin` and emits `connection.ready`.

Mint a token locally (never ship the secret to a browser):

```bash
npm run admin:token -- --ttl=3600 --subject=ops
```

### Events

| Event | Payload schema | Emitter |
| --- | --- | --- |
| `connection.ready` | `{ socketId, serverTime, role: "admin" }` | server |
| `order.created` | `{ orderId: string, orderName: string\|null, financialStatus: string\|null, fulfillmentStatus: string\|null, createdAt: string\|null }` | `orders/create` |
| `order.updated` | `{ orderId, orderName, financialStatus, fulfillmentStatus, updatedAt }` | `orders/updated` |
| `order.fulfilled` | `{ orderId, orderName, fulfillmentStatus, updatedAt }` | `orders/fulfilled` or `fulfillments/create` |
| `inventory.level_changed` | `{ inventoryItemId: string, locationId: string, available: number, updatedAt: string\|null }` | `inventory_levels/update` |
| `product.updated` | `{ productId: string, handle: string, title: string\|null, updatedAt: string\|null }` | `products/update` |
| `app.uninstalled` | `{ shopDomain: string, occurredAt: string }` | `app/uninstalled` |

Payloads intentionally exclude customer names, emails, addresses, payment details and line-item
content. Fetch the order from Shopify if an admin UI needs details.

## Guarantees & failure modes

| Topic | Guarantee |
| --- | --- |
| Delivery | At-most-once notify (webhook dedup 24h TTL). Clients must tolerate missed events and poll/refetch on reconnect. |
| Ordering | Not guaranteed. Use timestamps/`updatedAt` from the payload. |
| Persistence | None. No event log is stored in MongoDB/Postgres (there is no commerce DB). |
| Reconnect | `socket.io-client` reconnects automatically; re-fetch current state after `connect`. |
| Webhook retries | Shopify may retry; dedup prevents duplicate processing. |
| Scaling | Single instance uses in-memory dedup and Socket.IO adapter. With `REDIS_URL`, dedup + adapter are Redis-backed for multiple instances. |

## Testing

`tests/integration/sockets.test.ts` covers:

- public namespace connects, receives `connection.ready`
- subscription validation (`subscription.ok` / `subscription.error`)
- product event fan-out
- admin connection rejected without/invalid token
- admin connection accepted with a valid JWT and receives documented events
