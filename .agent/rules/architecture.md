# Architecture

## Package Dependency Graph

```
@netloc8/core       ← zero deps, framework-agnostic
       ↑
@netloc8/react      ← peerDep: react ≥ 19
       ↑
@netloc8/nextjs     ← peerDep: next ≥ 16, react ≥ 19
```

All packages are published independently but versioned together. Changes to core cascade upward.

## Entry Points

| Package | Export | Purpose |
|---------|--------|---------|
| `@netloc8/core` | `.` | All core utilities |
| `@netloc8/core` | `./telemetry/rum` | RUM beacon collection |
| `@netloc8/react` | `.` | Provider, hook, GeoGate, context |
| `@netloc8/nextjs` | `.` | Re-exports `@netloc8/react` |
| `@netloc8/nextjs` | `./proxy` | `createProxy()`, `withGeoRedirect()` |
| `@netloc8/nextjs` | `./server` | `getGeo()`, `getTimezone()` |

## Key Design Decisions

### Timezone Reconciliation
IP-based timezone is ~95% accurate. The SDK achieves 100% by reading the browser's `Intl.DateTimeFormat().resolvedOptions().timeZone` on the client, then persisting it in a cookie for future server-side requests.

### Proxy Pattern (Next.js 16)
The proxy intercepts requests at the edge/server, resolves geo data, and injects it as `x-netloc8-*` request headers. Server Components read these headers via `next/headers`. This avoids prop drilling and works with streaming/RSC.

### Cookie Fast Path
If the cookie already contains browser-confirmed timezone (`timezoneFromClient: true`) and the IP hasn't changed, the proxy skips the API call. However, only `timezone`/`timezoneFromClient` are trusted from the cookie — all other geo fields are always re-resolved from platform headers or the API to prevent cookie-based spoofing.

### Client-Side SPA Support (Direct Mode)
The `NetLoc8Provider` accepts an `apiKey` prop for SPAs that don't have a server proxy. When provided, the provider calls `fetchMyGeo()` on mount against `GET /v1/ip/me` to resolve the caller's geolocation client-side. Mode is auto-detected from props: `apiKey` → direct, `geo` → proxy.

### X-NetLoc8-Client Header
Every API request includes an `X-NetLoc8-Client` header identifying the SDK package and version (e.g., `@netloc8/nextjs/1.0.0`). The version is injected at build time via tsdown's `define` from each package's `package.json`.

### Source Reconciliation Priority
1. Cookie with `timezoneFromClient=true` + matching IP (highest — browser-confirmed)
2. Fresh API response (most complete)
3. Platform headers (zero-cost, may be partial)
4. Stale cookie (lowest)

### Multi-Platform Header Support
Platform headers from Vercel, Cloudflare, and CloudFront are extracted as a zero-cost geo source. If they provide enough data (especially country code), the API call is skipped.
