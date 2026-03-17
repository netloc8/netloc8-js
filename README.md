# @netloc8 SDK

[![npm version](https://img.shields.io/npm/v/@netloc8/core?label=%40netloc8%2Fcore)](https://www.npmjs.com/package/@netloc8/core)
[![npm version](https://img.shields.io/npm/v/@netloc8/react?label=%40netloc8%2Freact)](https://www.npmjs.com/package/@netloc8/react)
[![npm version](https://img.shields.io/npm/v/@netloc8/nextjs?label=%40netloc8%2Fnextjs)](https://www.npmjs.com/package/@netloc8/nextjs)
[![License: ELv2](https://img.shields.io/badge/license-ELv2-blue)](./LICENSE)

The easiest way to add **IP geolocation** to JavaScript applications. Detect
visitor country, city, timezone, and coordinates — with framework-native
integrations for **Next.js** and **React**.

Built for developers who need geolocation features without wiring up raw API
calls: EU compliance gating, locale-based routing, timezone-accurate scheduling,
regional content delivery, and privacy-respecting analytics.

## Why NetLoc8?

- **Framework-native** — not just an API wrapper. Server-side proxy, React context, conditional rendering components
- **Smart timezone** — IP-based on first request, browser-confirmed on hydration, cookie-cached thereafter. 100% accurate after first visit
- **EU detection built in** — `unions` array makes GDPR gating a one-liner, no country-code lists to maintain
- **Zero-config RUM** — Core Web Vitals, Navigation Timing, and error tracking enabled by default
- **Type-safe** — full TypeScript types for every response field

### Common Use Cases

| Use Case | How |
|----------|-----|
| Show cookie consent to EU users | `<GeoGate eu={true}>` |
| Redirect by country/locale | `withGeoRedirect({ 'DE': '/de', 'FR': '/fr' })` |
| Display local timezone | `geo.location?.timezone` |
| Personalize by city/region | `geo.location?.city`, `geo.location?.region?.name` |
| Block or allow by country | `<GeoGate country={['US', 'CA']}>` |
| Detect VPN/proxy users | Coming in v2 (see roadmap) |


## Packages

| Package | Description |
|---------|-------------|
| [`@netloc8/core`](./packages/core/) | API client, IP detection, platform headers, cookies, RUM telemetry |
| [`@netloc8/react`](./packages/react/) | React context, Provider, `useGeo()` hook, `<GeoGate>` component |
| [`@netloc8/nextjs`](./packages/nextjs/) | Next.js proxy, server functions, re-exports React bindings |

## Which Package?

- **Next.js** — install `@netloc8/nextjs` (includes React + core)
- **React SPA** — install `@netloc8/react` (includes core)
- **Node / Edge / Vanilla JS** — install `@netloc8/core`

See each package's README for detailed usage instructions.

## Response Shape

All packages return a nested `Geo` object matching the API's `GeolocationResult`:

```typescript
const geo = await fetchGeo( '8.8.8.8', { apiKey: 'sk_...' } );

geo.query?.value;                 // "8.8.8.8"
geo.query?.ipVersion;             // 4
geo.location?.country?.code;      // "US"
geo.location?.country?.name;      // "United States"
geo.location?.country?.flag;      // "🇺🇸"
geo.location?.country?.unions;    // ["EU"] or []
geo.location?.region?.code;       // "CA"
geo.location?.region?.name;       // "California"
geo.location?.city;               // "Mountain View"
geo.location?.postalCode;         // "94043"
geo.location?.coordinates?.latitude;   // 37.386
geo.location?.coordinates?.longitude;  // -122.084
geo.location?.timezone;           // "America/Los_Angeles"
geo.location?.utcOffset;          // "-07:00"
geo.location?.geoConfidence;      // 1.0
geo.network?.asn;                 // "AS15169"
geo.network?.organization;        // "Google LLC"
geo.network?.domain;              // "google.com"
geo.meta?.precision;              // "city"
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NETLOC8_API_KEY` | Yes (server) | Secret API key (`sk_...`) for proxy and server functions |
| `NETLOC8_API_URL` | No | API base URL (defaults to `https://api.netloc8.com`) |
| `NETLOC8_TEST_IP` | No | Override IP in development |

For client-side SPAs, pass a publishable key (`pk_...`) via the `apiKey` prop instead.

## RUM Telemetry

Real User Monitoring is **enabled by default**. The SDK passively collects Core
Web Vitals (LCP, FID, INP, CLS, TTFB), Navigation Timing, and unhandled errors,
then sends a single beacon via `navigator.sendBeacon()` when the page is hidden.

- **Zero latency** — collection is passive, beacon fires on `visibilitychange`
- **No PII** — only page path, timing values, connection type, and device type
- **Opt out** — set `rum={false}` on the Provider

## How It Works

### Proxy Mode (SSR)

1. **Proxy** intercepts each request — detects client IP, checks cookie cache, reads platform headers (Vercel/Cloudflare/CloudFront), and calls the NetLoc8 API if needed
2. **Reconciliation** deep-merges all sources (cookie → platform → API) into a single `Geo` object
3. **Server Components** read geo data from `x-netloc8-*` request headers set by the proxy
4. **Client Components** receive geo data via React context; on mount, the Provider reads the browser's `Intl.DateTimeFormat` timezone for 100% accuracy and persists it in a cookie

### Direct Mode (SPA — React / static sites)

1. Page renders immediately — no server-side geo call blocking the response
2. Provider calls the API in the background using a publishable key (`pk_...`)
3. Geo data populates asynchronously — faster wall-clock time than SSR proxy mode
4. Browser timezone is reconciled on the same tick

> **Why is direct mode faster?** In SSR proxy mode, the request path is browser → server → NetLoc8 API → server renders → browser. In direct mode, the browser calls the NetLoc8 edge API directly — eliminating the server as a middleman. The page also renders immediately without waiting for geo data.
>
> **Trade-off:** On a user's first visit, geo-dependent content (like `<GeoGate>` or city names) will appear after the API call completes, causing a brief content shift. On repeat visits, the `__netloc8` cookie provides geo data synchronously — no shift.

### Shared

- **Browser validation headers** — `X-NL8-TZ`, `X-NL8-Lang`, `X-NL8-Conn`, and `X-NL8-RTT` are sent automatically on every API request to improve geo accuracy
- **Cookie caching** — after the first lookup, geo data is cached in a cookie. Subsequent requests skip the API entirely

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run tests
bun test packages/
```

## License

[Elastic License 2.0 (ELv2)](./LICENSE)
