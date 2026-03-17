# @netloc8/core

[![npm version](https://img.shields.io/npm/v/@netloc8/core)](https://www.npmjs.com/package/@netloc8/core)
[![npm downloads](https://img.shields.io/npm/dm/@netloc8/core)](https://www.npmjs.com/package/@netloc8/core)
[![License: ELv2](https://img.shields.io/badge/license-ELv2-blue)](../../LICENSE)

IP geolocation API client for **JavaScript**, **TypeScript**, and **Node.js**.
Look up any IP address to get country, city, region, timezone, coordinates,
ASN, and EU membership — with structured error handling and built-in
browser signal collection.

Works in Node.js, Bun, Deno, Cloudflare Workers, and the browser. For
framework-specific integrations, see
[`@netloc8/react`](../react/) or [`@netloc8/nextjs`](../nextjs/).
> **Tip:** Using a specific framework? Install the framework package instead
> (e.g. [`@netloc8/nextjs`](../nextjs/) for Next.js, [`@netloc8/react`](../react/)
> for React SPAs) — they re-export everything from this package and add
> framework-specific helpers.

## Install

```bash
bun add @netloc8/core
```

[Documentation](https://netloc8.com/docs) · [API Reference](https://netloc8.com/docs/api)

## Usage

### Detect the visitor's location (browser)

The simplest way to get started — call `fetchMyGeo()` with a publishable
key, available from your [NetLoc8 dashboard](https://netloc8.com).
No IP address needed; the API detects the caller's IP automatically:

```typescript
import { fetchMyGeo } from '@netloc8/core';

const geo = await fetchMyGeo( { apiKey: 'pk_...' } );

console.log( geo.location?.country?.code );  // "US"
console.log( geo.location?.city );           // "Mountain View"
console.log( geo.location?.timezone );       // "America/Los_Angeles"
console.log( geo.network?.organization );    // "Google LLC"
```

### Get only the timezone (browser)

```typescript
import { fetchMyTimezone } from '@netloc8/core';

const tz = await fetchMyTimezone( { apiKey: 'pk_...' } );

console.log( tz ); // "America/Chicago"
```

### Look up a specific IP (server-side)

```typescript
import { fetchGeo } from '@netloc8/core';

const geo = await fetchGeo( '203.0.113.42', {
    apiKey: 'sk_...',
} );

console.log( geo.location?.country?.code );  // "US"
console.log( geo.location?.city );           // "Mountain View"
```

### Error handling

All fetch functions return `null` on error — they never throw. Errors are
logged to the console with structured codes when available:

```typescript
import { fetchGeo } from '@netloc8/core';

const geo = await fetchGeo( '203.0.113.42', { apiKey: process.env.NETLOC8_API_KEY } );

if ( !geo ) {
    // fetchGeo logged the error, e.g.:
    // [netloc8] Geo lookup failed for 203.0.113.42: INVALID_IP — Invalid IP address format (HTTP 400)
    console.log( 'Geo lookup failed' );
}
```

## Response Shape

The `Geo` type mirrors the API's `GeolocationResult` schema:

```typescript
interface Geo {
    query?: {
        type?: string;        // "ip"
        value?: string;       // "8.8.8.8"
        ipVersion?: number;   // 4 | 6
    };
    location?: {
        continent?: { code?: string; name?: string };
        country?: {
            code?: string;    // ISO 3166-1 alpha-2
            name?: string;
            flag?: string;    // "🇺🇸"
            unions?: string[]; // ["EU"] — replaces isEU boolean
        };
        region?: {
            code?: string;    // ISO 3166-2
            name?: string;
        };
        district?: string;
        city?: string;
        postalCode?: string;
        coordinates?: {
            latitude?: number;
            longitude?: number;
            accuracyRadius?: number;
        };
        timezone?: string;          // IANA timezone
        utcOffset?: string;         // "-07:00"
        geoConfidence?: number;     // 0.0–1.0
        timezoneFromClient?: boolean; // SDK-only: browser-confirmed TZ
    };
    network?: {
        asn?: string;           // "AS15169"
        organization?: string;  // "Google LLC"
        domain?: string;        // "google.com"
    };
    sources?: {
        geo?: string[];  // ["dbip", "ipinfo"]
        asn?: string[];
        tz?: string[];
    };
    meta?: {
        precision?: string;    // "city" | "region" | "country" | "continent" | "none"
        tier?: string;
        requestId?: string;
        degraded?: boolean;
    };
}
```

### EU Detection

The SDK provides an `isEU()` helper for GDPR / cookie consent checks:

```typescript
import { isEU } from '@netloc8/core';

if ( isEU( geo ) ) {
    showCookieConsent();
}
```

Under the hood this checks `location.country.unions` for `"EU"` membership.

## Browser Validation Headers

Every API request automatically sends browser signals (when available):

| Header | Value | Purpose |
|--------|-------|---------|
| `X-NL8-TZ` | IANA timezone | Cross-validate IP-derived timezone |
| `X-NL8-Lang` | Browser language | Locale plausibility check |
| `X-NL8-Conn` | Connection type (`4g`, `3g`) | Network classification |
| `X-NL8-RTT` | Round-trip time (ms) | Latency measurement |

These are sent automatically with zero configuration. They are not PII — they're
equivalent to `Accept-Language` and similar headers browsers already send.

## RUM Telemetry

The SDK includes a RUM beacon module at `@netloc8/core/telemetry/rum`:

```typescript
import { initRum } from '@netloc8/core/telemetry/rum';

// Start collecting — typically called once at app init
const stop = initRum( {
    endpoint: 'https://api.netloc8.com/v1/telemetry/rum',
    sampleRate: 1.0,
} );
```

Collects:
- **Core Web Vitals** — LCP, FID, INP, CLS, TTFB (via `web-vitals` library)
- **Navigation Timing** — DNS, TLS, request, response durations
- **JS errors** — unhandled exceptions and resource load failures

Beaconed via `navigator.sendBeacon()` on `visibilitychange` — zero latency impact.

> When using `@netloc8/react` or `@netloc8/nextjs`, RUM is initialized
> automatically by the Provider. You don't need to call `initRum()` directly.

## Exports

| Export | Description |
|--------|-------------|
| `fetchGeo` | Full geo lookup by IP |
| `fetchTimezone` | Timezone-only lookup by IP |
| `fetchMyGeo` | Full geo lookup for the caller's own IP (browser) |
| `fetchMyTimezone` | Timezone-only lookup for the caller's own IP (browser) |
| `getClientIp` | Extract client IP from request headers |
| `isPublicIp` | Check whether an IP is publicly routable |
| `getGeoFromPlatformHeaders` | Parse Vercel / Cloudflare / CloudFront geo headers |
| `parseCookie` / `serializeCookie` | Read/write the `__netloc8` cookie |
| `reconcileGeo` | Deep-merge cookie, platform, and API geo sources |
| `normalizeApiResponse` | Normalize raw API JSON into a `Geo` object |
| `isEU` | Check whether a `Geo` location is in the European Union |
| `getTimezone` / `getLanguage` / `getConnectionType` / `getDeviceType` | Browser signal helpers |
| `Geo` (type) | The shared geolocation type used across all packages |
| `ApiErrorResponse` (type) | Structured error response type |
| `RumConfig` (type) | RUM configuration type |

### Subpath Exports

| Subpath | Export | Description |
|---------|--------|-------------|
| `@netloc8/core/telemetry/rum` | `initRum` | Initialize RUM beacon collection |

## License

[Elastic License 2.0 (ELv2)](../../LICENSE)
