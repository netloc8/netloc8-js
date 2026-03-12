# SDK Enhancement Plan: Cloudflare Geo Integration

> **Status:** Tentative — depends on API-side CF provider being deployed first.

## Prerequisite: Migrate SDK to Standalone API

The SDK currently points to the **marketing site's** built-in Next.js API route
handlers (e.g. `netloc8.com/api/v1/...`). Before any of the changes below, the
SDK must be updated to use the new **standalone `api` app** — the Hono-based
Cloudflare Worker at its own subdomain (e.g. `api.netloc8.com/v1/...`).

This means:
- Update the SDK's default `baseUrl` / API endpoint configuration
- Ensure all fetch calls use the new origin
- Verify CORS works for browser-direct calls to the Worker
- Deprecate / remove any references to the marketing site's route handlers

This migration is independent of the CF geo work below and should be done first.

## Background

The NetLoc8 API now uses Cloudflare's `request.cf` object for self-lookups (`/v1/ip/me`),
making them near-instant (~0ms geo). The SDK can take advantage of this.

## Opportunities

### 1. Direct Browser → CF Worker Mode

**Current flow** (Next.js proxy):
```
Visitor → Customer's server (proxy.ts) → NetLoc8 API → response
```

**Proposed flow** (client-side direct):
```
Visitor's browser → NetLoc8 CF Worker → instant response (from request.cf)
```

- `fetchMyGeo()` already calls `/v1/ip/me` — it just gets faster
- Customer uses a **publishable key** (`pk_`) in the browser
- No server-side proxy needed for the happy path
- Proxy still valuable for SSR, geographic redirects, server-side decisions

### 2. `platform.ts` Enhancements

Currently reads only `cf-ipcountry`. Could also read:
- `cf-ipcity`, `cf-ipregion`, `cf-iplatitude`, `cf-iplongitude`, `cf-iptimezone`
- But CF doesn't inject these as HTTP headers — only available in Workers `request.cf`
- Only helps if the customer deploys on Cloudflare and exposes these fields

### 3. `proxy.ts` Optimization

Line 124 already skips the API call if platform headers have timezone:
```typescript
if (clientIp && isPublicIp(clientIp) && !platformGeo.timezone && !cookieTimezone) {
    const raw = await fetchGeo(clientIp, { ... });
```

If `platform.ts` extracted more CF fields, the proxy would skip the API call
more often — reducing latency and API usage for CF-deployed customers.

### 4. React Provider: `mode` Option

```tsx
{/* Default: browser calls CF Worker directly via publishable key */}
<NetLoc8Provider publishableKey="pk_...">
    {/* fetchMyGeo() goes straight to the CF Worker — fastest path */}
</NetLoc8Provider>

{/* Opt-in: proxy through the customer's server for SSR first-paint */}
<NetLoc8Provider publishableKey="pk_..." mode="proxy">
    {/* geo available on first paint via server-side proxy */}
</NetLoc8Provider>
```

`direct` mode is the default — simpler, faster, no server middleman needed.
`proxy` mode is for customers who need geo data server-side: Server Components,
Route Handlers, Server Actions, middleware redirects, etc.

## API Fast Path: IP Matching

The API's CF fast path is not limited to `/v1/ip/me`. Any request to
`/v1/ip/:ipAddress` where the requested IP **matches** the caller's
`CF-Connecting-IP` also uses Cloudflare's `request.cf` data — zero shard
lookup. This means:

- **Browser → `/v1/ip/me`**: CF fast path (always matches)
- **Browser → `/v1/ip/203.0.113.1`** where `203.0.113.1` is the browser's own IP: CF fast path
- **Server → `/v1/ip/203.0.113.1`** where the server's IP differs: shard lookup

The SDK doesn't need to do anything special to benefit from this — the API
detects the match automatically.

## Risks and Trade-offs

| Consideration | Notes |
|---|---|
| CORS | Worker needs `Access-Control-Allow-Origin` for browser calls |
| Key exposure | Publishable keys are designed for browser use — already safe |
| SSR first paint | Use `proxy` mode — the existing server-side proxy resolves geo before render |
| Privacy | CF geo data is coarser than MaxMind (no accuracyRadius) |
| Billing | Self-lookups via CF still count toward usage caps |

## Architecture Changes Affecting the SDK

The NetLoc8 backend is moving to a fully decoupled 4-service architecture
(see `docs/ARCHITECTURE_PLAN.md` in the main repo). Key SDK impacts:

### Auth Migration (`auth.netloc8.com`)

- Auth is moving from the dashboard app to a dedicated Worker at `auth.netloc8.com`
- Session tokens change from better-auth database sessions to ES256 JWTs set on `.netloc8.com`
- Any SDK code that touches sessions (e.g. React hooks like `useSession()`) must
  validate JWTs locally instead of calling the old session endpoint
- JWKS public key available at `auth.netloc8.com/.well-known/jwks.json`

### Free Timezone Endpoint (Future Idea)

- A potential freemium hook: offer `GET api.netloc8.com/v1/ip/me/timezone` with **no API key**
- The SDK could offer `getTimezone()` as a zero-config function: no API key, no signup
- Returns `{ "timezone": "America/Los_Angeles" }` — uses CF fast path (~0ms)
- Gets the SDK into codebases for free; users upgrade when they need full geo
- **Not yet decided** — tracked in `FUTURE_IDEAS.md` in the main repo

### Two API Origins

After the architecture migration, the SDK talks to two services:
- `api.netloc8.com` — geo lookups, account management (API key auth)
- `auth.netloc8.com` — login, signup, session management (JWT cookies)

The SDK's `baseUrl` config may need to support both, or default to sensible values:
```js
new NetLoc8({
    apiKey: 'sk_live_...',
    apiUrl: 'https://api.netloc8.com',   // default
    authUrl: 'https://auth.netloc8.com', // default (only needed for session-based features)
});
```
