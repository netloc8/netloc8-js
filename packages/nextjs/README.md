# @netloc8/nextjs

[![npm version](https://img.shields.io/npm/v/@netloc8/nextjs)](https://www.npmjs.com/package/@netloc8/nextjs)
[![npm downloads](https://img.shields.io/npm/dm/@netloc8/nextjs)](https://www.npmjs.com/package/@netloc8/nextjs)
[![License: ELv2](https://img.shields.io/badge/license-ELv2-blue)](../../LICENSE)

Add **IP geolocation** to any **Next.js** application. Detect visitor country,
city, timezone, and EU membership in both Server and Client Components — with
a server-side proxy that resolves geo data before your page renders.

Show cookie consent to EU users, redirect by locale, personalize by region,
display local timezone — all with SSR support and automatic browser timezone
reconciliation.

## Install

```bash
bun add @netloc8/nextjs
```

**Peer dependencies:** `next >= 16`, `react >= 19`

[Documentation](https://netloc8.com/docs) · [API Reference](https://netloc8.com/docs/api)

## Quick Start

### 1. Add geo to a Client Component (simplest)

Wrap your root layout with the Provider and use the `useGeo()` hook in any
client component. Get your API key from the [NetLoc8 dashboard](https://netloc8.com) — the page renders immediately and geo data loads in the background:

```tsx
// app/layout.tsx
import { NetLoc8Provider } from '@netloc8/nextjs';

export default function RootLayout( { children } ) {
    return (
        <html>
            <body>
                <NetLoc8Provider apiKey={process.env.NEXT_PUBLIC_NETLOC8_API_KEY}>
                    {children}
                </NetLoc8Provider>
            </body>
        </html>
    );
}
```

```tsx
// app/components/LocationBanner.tsx
'use client';
import { useGeo } from '@netloc8/nextjs';

export function LocationBanner() {
    const { geo, isLoading, error } = useGeo();

    if (isLoading) return <p>Detecting location…</p>;
    if (error) return <p>Geo unavailable</p>;

    return <p>Hello from {geo.location?.city}, {geo.location?.country?.name}</p>;
}
```

> **That's it.** No proxy, no server setup, no environment variables. Geo data
> loads asynchronously via a publishable key — faster than SSR because the
> browser calls the NetLoc8 edge API directly, eliminating the server hop.
>
> **Never use secret keys here.** The `apiKey` prop is included in your
> client bundle. Always use a publishable key (`pk_...`). Keep secret
> keys (`sk_...`) server-side only.
>
> **Trade-off:** On first visit, geo-dependent content appears after the API
> call completes. Use the `loading` prop on the Provider and `<GeoGate>` to
> show skeleton UI while data loads. On repeat visits, the `__netloc8` cookie
> provides geo data synchronously — no content shift.

### 2. Server-side rendering (SSR proxy)

For apps that need geo data available on first render (SEO, personalized SSR),
set up the proxy and use `getGeo()` in Server Components:

```typescript
// proxy.ts
import { createProxy } from '@netloc8/nextjs/proxy';

export default createProxy();
```

```typescript
// app/page.tsx
import { getGeo } from '@netloc8/nextjs/server';

export default async function Page() {
    const geo = await getGeo();

    return (
        <div>
            <p>Hello from {geo.location?.city}, {geo.location?.country?.name}</p>
            <p>Timezone: {geo.location?.timezone}</p>
            <p>{geo.location?.country?.flag}</p>
        </div>
    );
}
```

To make SSR geo data available in client components, pass it to the Provider:

```tsx
import { getGeo } from '@netloc8/nextjs/server';
import { NetLoc8Provider } from '@netloc8/nextjs';

export default async function RootLayout( { children } ) {
    const geo = await getGeo();

    return (
        <html>
            <body>
                <NetLoc8Provider geo={geo}>
                    {children}
                </NetLoc8Provider>
            </body>
        </html>
    );
}
```

### 3. Conditional rendering with GeoGate

```tsx
import { GeoGate } from '@netloc8/nextjs';

{/* EU users — show cookie consent */}
<GeoGate eu={true} loading={<Skeleton />}>
    <CookieConsentBanner />
</GeoGate>

{/* Specific countries with fallback */}
<GeoGate country={['US', 'CA']} fallback={<p>Not available in your region</p>}>
    <SpecialOffer />
</GeoGate>
```

### 4. Geo-based redirects

```typescript
import { createProxy, withGeoRedirect } from '@netloc8/nextjs/proxy';

export default createProxy( {
    handler: withGeoRedirect( {
        defaultLocale: 'en',
        localeMap: {
            'DE': 'de',
            'FR': 'fr',
            'ES': 'es',
        },
        excludePaths: ['/api', '/_next'],
    } ),
} );
```

## Preventing Content Shift

In direct mode, geo data loads asynchronously on first visit. Use these
patterns to prevent layout shift:

```tsx
{/* GeoGate loading prop — recommended for conditional sections */}
<GeoGate eu={true} loading={<div className="h-12 animate-pulse bg-gray-200 rounded" />}>
    <CookieConsentBanner />
</GeoGate>

{/* useGeo isLoading — for inline geo content */}
function CityName() {
    const { geo, isLoading } = useGeo();
    if (isLoading) return <span className="h-4 w-24 animate-pulse bg-gray-200 rounded inline-block" />;
    return <span>{geo.location?.city}</span>;
}
```

> **On repeat visits:** The `__netloc8` cookie provides geo data
> synchronously — `isLoading` starts as `false`, no skeleton flash.

## The `useGeo()` Hook

In client components, `useGeo()` returns `{ geo, isLoading, error }`:

```typescript
const { geo, isLoading, error } = useGeo();

if (isLoading) return <Skeleton />;
if (error) return <p>Geo unavailable</p>;

geo.query?.value;                 // "203.0.113.42"
geo.location?.country?.code;      // "US"
geo.location?.country?.name;      // "United States"
geo.location?.country?.flag;      // "🇺🇸"
geo.location?.country?.unions;    // ["EU"] or []
geo.location?.region?.code;       // "CA"
geo.location?.region?.name;       // "California"
geo.location?.city;               // "Mountain View"
geo.location?.timezone;           // "America/Los_Angeles"
geo.location?.utcOffset;          // "-07:00"
geo.location?.geoConfidence;      // 1.0
geo.network?.asn;                 // "AS15169"
geo.network?.organization;        // "Google LLC"
geo.meta?.precision;              // "city"
```

### EU Detection

```typescript
import { isEU } from '@netloc8/nextjs';

if ( isEU( geo ) ) {
    showCookieConsent();
}
```

See [`@netloc8/core`](../core/) for the full `Geo` type reference.

## RUM Telemetry

RUM is **enabled by default** when using the Provider. Core Web Vitals, Navigation
Timing, and JS errors are beaconed via `navigator.sendBeacon()` on page hide. Zero
latency impact, no PII. Opt out with `rum={false}` on the Provider.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NETLOC8_API_KEY` | Yes | Secret API key (`sk_...`) for the proxy |
| `NETLOC8_API_URL` | No | API base URL (defaults to `https://api.netloc8.com`) |
| `NETLOC8_TEST_IP` | No | Override IP in development |

## Exports

| Subpath | Export | Description |
|---------|--------|-------------|
| `@netloc8/nextjs/proxy` | `createProxy` | Create the proxy function for `proxy.ts` |
| `@netloc8/nextjs/proxy` | `withGeoRedirect` | Geo-based locale redirect handler |
| `@netloc8/nextjs/server` | `getGeo` | Read geo data in server contexts |
| `@netloc8/nextjs/server` | `getTimezone` | Shorthand for timezone only |
| `@netloc8/nextjs` | `NetLoc8Provider` | Re-exported from `@netloc8/react` |
| `@netloc8/nextjs` | `useGeo` | Re-exported from `@netloc8/react` |
| `@netloc8/nextjs` | `GeoGate` | Re-exported from `@netloc8/react` |
| `@netloc8/nextjs` | `GeoContext` | Re-exported from `@netloc8/react` |
| `@netloc8/nextjs` | `GeoContextValue` | Type: `{ geo, isLoading, error }` |

## How the Proxy Works

The proxy runs on every incoming request:

1. **IP detection** — reads `cf-connecting-ip`, `x-forwarded-for`, or `x-real-ip`
2. **Cookie check** — if `__netloc8` cookie exists and IP hasn't changed, uses cached data
3. **Platform headers** — reads Vercel/Cloudflare/CloudFront geo headers when available
4. **API call** — calls `api.netloc8.com/v1/ip/{ip}` with your secret key if platform lacks country data
5. **Reconciliation** — deep-merges all sources (cookie → platform → API) with API as highest priority
6. **Header transport** — sets 25 `x-netloc8-*` headers for downstream Server Components
7. **Cookie write** — persists geo data in `__netloc8` cookie for subsequent requests

## License

[Elastic License 2.0 (ELv2)](../../LICENSE)
