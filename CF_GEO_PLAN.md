# SDK Enhancement Plan: Cloudflare Geo Integration

> **Status:** Tentative — depends on API-side CF provider being deployed first.

## Prerequisite: Migrate SDK to Standalone API

The SDK currently points to the **marketing site's** built-in Next.js API route
handlers (e.g. `netloc8.com/api/v1/...`). Before any of the changes below, the
SDK must be updated to use the new **standalone `api` app** — the Hono-based
Cloudflare Worker at its own subdomain (e.g. `api.netloc8.com/v1/...`).

This means:
- Update the SDK's default `baseUrl` / API endpoint configuration
- **Update all API paths from `/api/v1/...` to `/v1/...`** — the Hono-based Worker dropped
  the `/api` prefix (v1.6.0). The SDK's `api.ts` and `INTERNAL_SPEC.md` still reference
  `/api/v1/` but the deployed Worker uses `/v1/`.
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

The NetLoc8 backend is now a fully decoupled **7-service architecture**
(see `docs/ARCHITECTURE.md` in the main repo). Key SDK impacts:

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

---

## Accumulated API Response Changes (v1.2.0–v1.8.0)

Backend releases have added response fields and endpoints that the SDK must
reflect. These are already deployed but may not be in the SDK's `Geo` type:

### New Geo Fields

| Field | Added in | Notes |
|-------|----------|-------|
| `continent` / `continentName` | v1.3.0 | Two-letter code + English name |
| `isEU` | v1.3.0 | EU member state flag (from geo data, not hardcoded) |
| `postalCode` | v1.3.0 | Postal / ZIP code |
| `precision` | v1.3.0 | `city`, `region`, `country`, `continent`, or `none` |
| `isLimited` / `limitReason` | v1.2.0 | Usage cap enforcement (`cap_exceeded`) |
| `ipVersion` | v1.3.0 | 4 or 6 |

> These are already in `INTERNAL_SPEC.md`'s `Geo` interface — confirming they
> need to ship with the first SDK release.

### New Endpoints

| Endpoint | Added in | SDK exposure |
|----------|----------|--------------|
| `GET /v1/ip/me/timezone` | v1.3.0 | `fetchMyTimezone()` — already planned |
| `GET /v1/account/me/audit` | v1.8.0 | Optional — expose as `fetchAuditLog()` for dashboard SDK users |
| `GET /.well-known/openapi.json` | v1.6.0 | Not SDK-facing, but useful for SDK validation/codegen |

---

## v1.9.0: Proprietary Data Pipeline Changes

The backend is building a proprietary IP-to-location dataset (see `implementation_plan.md`
in the main repo). This has direct SDK impacts across three areas.

### 1. New `Geo` Response Fields

The API response will include new fields from the fused proprietary dataset. The SDK's
`Geo` type and `normalize.ts` must be updated to handle them:

| New field | Type | Source | Notes |
|-----------|------|--------|-------|
| `connectionType` | `string?` | Fusion enrichment | `residential`, `business`, `mobile`, `hosting`, `education`, `government` |
| `proxyType` | `string?` | Fusion enrichment | `vpn`, `tor`, `hosting`, `residential_proxy`, `public_proxy`, or `null` |
| `isVpn` | `boolean?` | Fusion enrichment | Convenience boolean for VPN/proxy detection |
| `isAnycast` | `boolean?` | Fusion enrichment | True for anycast IPs (CDN, DNS servers) |
| `threatScore` | `number?` | Fusion composite | 0.0–1.0 risk score |
| `staticProbability` | `number?` | Fusion enrichment | 0.0–1.0 likelihood IP is static |
| `asn` | `number?` | Observation | Autonomous System Number |
| `asOrg` | `string?` | Observation | AS organization name |
| `metroCode` | `string?` | Observation | US DMA metro code |

These fields arrive in the existing API response — no new endpoints needed. The SDK just
needs to pass them through. `normalize.ts` gains new field mappings, `types.ts` gains
new optional properties on `Geo`.

### 2. Opt-In Telemetry Probes (Phase 5 — Future)

When Phase 5 (multi-platform probe network) is active, the SDK can participate in
**trilateration measurement** by pinging probe endpoints from the user's browser:

```ts
new NetLoc8({
    publishableKey: 'pk_...',
    telemetry: true,  // opt-in: ping probe endpoints for measurement
});
```

When `telemetry` is enabled, the provider fires background `navigator.sendBeacon()` calls
to probe endpoints after the main geo lookup completes:

```ts
// Inside provider.tsx, after geo is resolved:
if ( options.telemetry ) {
    const batch = crypto.randomUUID();
    const probes = [
        'https://probe-aws.netloc8.com/ping',
        'https://probe-hz.netloc8.com/ping',
    ];
    probes.forEach( url =>
        navigator.sendBeacon( `${url}?b=${batch}` )
    );
}
```

**Key properties:**
- Default `false` — must be explicitly opted in
- Uses `navigator.sendBeacon()` — non-blocking, survives page unload
- ~100 bytes per probe, no response expected — zero performance impact
- Probe list fetched from config or hardcoded (TBD)
- Privacy disclosure required in SDK docs and privacy policy
- Each probe captures geo + RTT independently, tags with shared `batch_id`
- Enables RTT trilateration and cross-database validation at fusion time

### 3. `GeoGate` Enhancements

New `Geo` fields enable new gating conditions:

```tsx
{/* Block VPN users */}
<GeoGate vpn={false}>
    <PremiumContent />
</GeoGate>

{/* Show only to residential IPs */}
<GeoGate connectionType="residential">
    <LocalOffer />
</GeoGate>
```

`GeoGate` gains new optional props: `vpn`, `connectionType`, `anycast`.

### 4. SDK Config Changes

The `NetLoc8` constructor and `NetLoc8ProviderProps` gain:

```ts
interface NetLoc8Config {
    apiKey?: string;
    publishableKey?: string;
    apiUrl?: string;
    authUrl?: string;
    telemetry?: boolean;  // NEW — opt-in probe measurement (default: false)
}
```

### 5. SDK-Sourced Validation Signals

The SDK can send browser-side metadata to the backend as `X-NL8-*` request headers.
These are **sent on every API request** (not just telemetry-enabled ones) and are used
to cross-validate Cloudflare's `request.cf` geo data in the proprietary dataset.

#### Headers Sent on Every SDK Request (Free / Invisible)

| Header | Browser API | Purpose |
|--------|------------|---------|
| `X-NL8-TZ` | `Intl.DateTimeFormat().resolvedOptions().timeZone` | Cross-validates `request.cf.timezone`. Mismatch → VPN/proxy signal or geo error |
| `X-NL8-Lang` | `navigator.languages[0]` | More precise than `Accept-Language`. `ja-JP` + CF says Germany → VPN signal |
| `X-NL8-Conn` | `navigator.connection?.effectiveType` | `4g` / `3g` / `wifi` — classifies mobile vs residential vs datacenter |
| `X-NL8-RTT` | Resource Timing TTFB | Client-measured round-trip time — independent of `cf_tcp_rtt` |

These headers add ~120 bytes per request. They require **no user consent** — they
contain technical metadata, not PII, and are equivalent to what browsers already send
via `Accept-Language`.

**Implementation in `api.ts` / `fetchGeo()`:**

```ts
const headers = { 'Authorization': `Bearer ${apiKey}` };

// Always send browser validation signals
if ( typeof Intl !== 'undefined' ) {
    headers['X-NL8-TZ'] = Intl.DateTimeFormat().resolvedOptions().timeZone;
}
if ( typeof navigator !== 'undefined' ) {
    headers['X-NL8-Lang'] = navigator.languages?.[0] ?? navigator.language;
    if ( navigator.connection?.effectiveType ) {
        headers['X-NL8-Conn'] = navigator.connection.effectiveType;
    }
}
```

Client RTT is measured after the first request completes:

```ts
// After fetch completes, measure TTFB for next request
const entries = performance.getEntriesByType( 'resource' )
    .filter( e => e.name.includes( 'api.netloc8.com' ) );
if ( entries.length ) {
    const ttfb = Math.round( entries[entries.length - 1].responseStart - entries[entries.length - 1].requestStart );
    // Send on subsequent requests
    headers['X-NL8-RTT'] = String( ttfb );
}
```

#### Opt-In GPS Ground Truth (telemetry: true only)

When `telemetry: true` **and** the browser's geolocation permission is granted, the
SDK can send GPS coordinates as the highest-value validation signal:

| Header | Browser API | Purpose |
|--------|------------|---------|
| `X-NL8-Lat` | `navigator.geolocation.getCurrentPosition()` | GPS latitude — ground truth for geo validation |
| `X-NL8-Lng` | `navigator.geolocation.getCurrentPosition()` | GPS longitude — ground truth for geo validation |

**Key constraints:**
- Only sent when `telemetry: true` is configured
- Only sent if the user has already granted geolocation permission (SDK does NOT trigger the permission prompt)
- Coordinates are rounded to 2 decimal places (~1.1 km precision) before sending — no household-level precision
- A single GPS+IP pair is worth thousands of passive observations for the dataset

```ts
if ( options.telemetry && navigator.geolocation ) {
    navigator.geolocation.getCurrentPosition(
        ( pos ) => {
            headers['X-NL8-Lat'] = String( Math.round( pos.coords.latitude * 100 ) / 100 );
            headers['X-NL8-Lng'] = String( Math.round( pos.coords.longitude * 100 ) / 100 );
        },
        () => {},  // silently skip if permission denied
        { maximumAge: 300000 }  // cache for 5 min
    );
}
```

#### Backend Handling

The backend's `observeGeo()` helper reads `X-NL8-*` headers and stores them as
additional columns in `geo_observations`. Browser signals are nullable — observations
from non-SDK traffic (direct API calls, curl, etc.) will have null browser signals.

The fusion pipeline uses these signals for:
- **Timezone cross-validation** — if `client_tz === cf_tz`, boost confidence
- **VPN/proxy detection** — if `client_tz !== cf_tz` or language doesn't match country
- **Connection classification** — `client_conn` helps classify mobile vs broadband
- **Ground truth calibration** — GPS coordinates calibrate the dataset at city level

---

## v1.11.0: Real User Monitoring (RUM) Beacon

The backend now has a complete RUM ingest pipeline (see `CHANGELOG.md` in the main
`netloc8` repo). The SDK needs to collect Core Web Vitals and send them via
`navigator.sendBeacon()`.

> **Server-side is done.** The endpoint, queue consumer, D1 tables, rollup
> aggregation, and authenticated query API are all deployed. This section
> covers what the SDK needs to do.

### Endpoint

```
POST https://api.netloc8.com/v1/telemetry/rum
```

- **Unauthenticated** — no API key needed (sendBeacon can't set custom headers)
- **Origin-validated** — backend checks the `Origin` header against registered domains
- **4 KB body limit** enforced on actual bytes (not content-length header)
- **Rate limited** — 100 beacons/min per IP

### Payload: Metrics Beacon

```json
{
    "path": "/products/widget",
    "deviceType": "desktop",
    "connectionType": "4g",
    "metrics": {
        "lcp": 1250.5,
        "fid": 12.3,
        "inp": 85.0,
        "cls": 0.05,
        "ttfb": 320.0,
        "dns": 15.0,
        "tls": 42.0,
        "request": 180.0,
        "response": 95.0
    }
}
```

All metric values are in milliseconds except `cls` (unitless). The backend clamps
values to known-reasonable ranges (e.g. LCP 0–60,000 ms). Null/missing metrics
are stored as null — SDK should omit metrics it can't collect.

### Payload: Error Reports

Can be sent alongside metrics or independently:

```json
{
    "path": "/checkout",
    "errors": [
        {
            "type": "unhandled_exception",
            "message": "Cannot read properties of undefined",
            "stack": "TypeError: Cannot read properties..."
        },
        {
            "type": "resource_load_failure",
            "resourceUrl": "https://cdn.example.com/checkout.js"
        }
    ]
}
```

Max 10 errors per beacon. `message` truncated to 500 chars, `stack` to 2,000
chars server-side.

### SDK Implementation Plan

#### 1. Add `web-vitals` dependency

```bash
bun add web-vitals
```

The `web-vitals` library provides `onLCP`, `onFID`, `onINP`, `onCLS`, `onTTFB`
callbacks that fire when each metric is ready.

#### 2. New `telemetry/rum.ts` module

```ts
import { onLCP, onFID, onINP, onCLS, onTTFB } from 'web-vitals';

interface RumConfig {
    endpoint?: string;  // default: 'https://api.netloc8.com/v1/telemetry/rum'
    sampleRate?: number;  // 0.0–1.0, default: 1.0
}

function collectAndSend( config: RumConfig ) {
    if ( Math.random() > ( config.sampleRate ?? 1.0 ) ) return;

    const metrics: Record<string, number> = {};

    onLCP( m => { metrics.lcp = m.value; } );
    onFID( m => { metrics.fid = m.value; } );
    onINP( m => { metrics.inp = m.value; } );
    onCLS( m => { metrics.cls = m.value; } );
    onTTFB( m => { metrics.ttfb = m.value; } );

    // Navigation Timing (dns, tls, request, response)
    const nav = performance.getEntriesByType( 'navigation' )[0];
    if ( nav ) {
        metrics.dns = nav.domainLookupEnd - nav.domainLookupStart;
        metrics.tls = nav.connectEnd - nav.secureConnectionStart;
        metrics.request = nav.responseStart - nav.requestStart;
        metrics.response = nav.responseEnd - nav.responseStart;
    }

    // Send on visibilitychange (page is being hidden/closed)
    document.addEventListener( 'visibilitychange', () => {
        if ( document.visibilityState === 'hidden' && Object.keys( metrics ).length ) {
            navigator.sendBeacon(
                config.endpoint ?? 'https://api.netloc8.com/v1/telemetry/rum',
                JSON.stringify( {
                    path: location.pathname,
                    deviceType: getDeviceType(),
                    connectionType: navigator.connection?.effectiveType ?? null,
                    metrics,
                } ),
            );
        }
    } );
}
```

#### 3. Error capture (`telemetry/errors.ts`)

```ts
// Unhandled exceptions
window.addEventListener( 'error', ( e ) => {
    queueError( {
        type: 'unhandled_exception',
        message: e.message,
        stack: e.error?.stack,
    } );
} );

// Failed resource loads (scripts, stylesheets, images)
window.addEventListener( 'error', ( e ) => {
    if ( e.target instanceof HTMLElement ) {
        queueError( {
            type: 'resource_load_failure',
            resourceUrl: e.target.src || e.target.href,
        } );
    }
}, true );  // capture phase to catch resource errors
```

Errors are batched and sent alongside the next metrics beacon, or flushed
on visibilitychange.

#### 4. SDK config surface

```ts
new NetLoc8( {
    publishableKey: 'pk_...',
    rum: true,  // opt-in (default: false)
    rumSampleRate: 1.0,  // 0.0–1.0 (default: 1.0)
} );
```

React:

```tsx
<NetLoc8Provider publishableKey="pk_..." rum rumSampleRate={0.5}>
    {children}
</NetLoc8Provider>
```

#### 5. Relationship to `telemetry` config

`telemetry: true` (geo probes, Phase 5) and `rum: true` are independent:

| Config | Effect |
|--------|--------|
| `telemetry: true` | Geo probe pings for IP trilateration |
| `rum: true` | Web Vitals + error beacons |
| Both `true` | Both features active independently |

### Files to Create / Modify

| File | Action | Notes |
|------|--------|-------|
| `packages/netloc8-js/src/telemetry/rum.ts` | **NEW** | Core collection + beacon sending |
| `packages/netloc8-js/src/telemetry/errors.ts` | **NEW** | Error capture + batching |
| `packages/netloc8-js/src/types.ts` | **MODIFY** | Add `rum`, `rumSampleRate` to config |
| `packages/netloc8-js/src/index.ts` | **MODIFY** | Wire up RUM init when `rum: true` |
| `packages/react/src/provider.tsx` | **MODIFY** | Accept `rum`/`rumSampleRate` props, init on mount |
| `packages/nextjs/src/index.ts` | **MODIFY** | Re-export new props |
| `package.json` | **MODIFY** | Add `web-vitals` dependency |

### Domain Registration Requirement

The backend validates the beacon's `Origin` header against registered `sites`
in the database. For RUM to work, the customer's domain must be registered via
the dashboard (or a future `POST /v1/sites` API). Beacons from unregistered
domains are rejected with `403 Unregistered domain`.
