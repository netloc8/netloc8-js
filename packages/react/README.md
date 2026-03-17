# @netloc8/react

[![npm version](https://img.shields.io/npm/v/@netloc8/react)](https://www.npmjs.com/package/@netloc8/react)
[![npm downloads](https://img.shields.io/npm/dm/@netloc8/react)](https://www.npmjs.com/package/@netloc8/react)
[![License: ELv2](https://img.shields.io/badge/license-ELv2-blue)](../../LICENSE)

Add **IP geolocation** to any **React** application. Detect visitor country,
city, timezone, and EU membership with a context Provider, `useGeo()` hook,
and `<GeoGate>` component for conditional rendering by location.

Show cookie consent to EU users, personalize content by region, display
local timezone — all with zero backend setup using a publishable API key.
> **Tip:** Using a specific framework? Install the framework package instead
> (e.g. [`@netloc8/nextjs`](../nextjs/) for Next.js) — it re-exports
> everything from this package and adds server-side helpers.

## Install

```bash
bun add @netloc8/react
```

**Peer dependencies:** `react >= 19`

## Quick Start

### Proxy Mode (SSR)

When geo data is resolved server-side (e.g. by a server proxy),
pass it as `geo`. The Provider only reconciles the browser timezone:

```tsx
import { NetLoc8Provider, useGeo } from '@netloc8/react';

function App( { serverGeo } ) {
    return (
        <NetLoc8Provider geo={serverGeo}>
            <LocationBanner />
        </NetLoc8Provider>
    );
}

function LocationBanner() {
    const { geo, isLoading } = useGeo();
    if (isLoading) return <p>Detecting location…</p>;
    return <p>Hello from {geo.location?.city}, {geo.location?.country?.name}</p>;
}
```

### Direct Mode (SPA)

For static sites or SPAs without server-side rendering, pass an API key. The Provider
calls the NetLoc8 API directly from the browser on mount:

```tsx
<NetLoc8Provider apiKey="pk_..."> {/* use your framework's environment variable */}
    <App />
</NetLoc8Provider>
```

> **Never use secret keys here.** The `apiKey` prop is included in your
> client bundle. Always use a publishable key (`pk_...`). Keep secret
> keys (`sk_...`) server-side only.

> **Why is direct mode faster?** The browser calls the NetLoc8 edge API
> directly, eliminating the server as a middleman. The page renders
> immediately without waiting for geo data.
>
> Use the `loading` prop on `<GeoGate>` and `isLoading` from `useGeo()` to
> show skeleton UI while data loads. On repeat visits, the `__netloc8` cookie
> provides geo data synchronously — no content shift.

## Provider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | — | Required |
| `geo` | `Partial<Geo>` | — | Geo data from `getGeo()` (implies proxy mode) |
| `mode` | `'proxy' \| 'direct'` | auto | Override auto-detected mode |
| `apiKey` | `string` | — | API key `pk_...` (implies direct mode) |
| `loading` | `ReactNode` | — | Content to show while geo data loads (replaces children) |
| `rum` | `boolean` | `true` | Enable RUM beacon collection |
| `rumEndpoint` | `string` | — | Override RUM beacon endpoint |
| `rumSampleRate` | `number` | `1.0` | Fraction of page loads that collect RUM (0–1) |

## Preventing Content Shift

In direct mode, geo data loads asynchronously on first visit. Here are
three patterns to prevent layout shift, ordered by recommendation:

### 1. Use `loading` on GeoGate (recommended)

The simplest approach — geo-dependent sections show a skeleton while
loading, and the rest of the page renders normally:

```tsx
<GeoGate eu={true} loading={<div className="h-12 animate-pulse bg-gray-200 rounded" />}>
    <CookieConsentBanner />
</GeoGate>

<GeoGate country="US" loading={<OfferSkeleton />} fallback={<p>Not available</p>}>
    <SpecialOffer />
</GeoGate>
```

### 2. Use `isLoading` in custom components

For components that use geo data inline, check `isLoading` before rendering:

```tsx
function LocationBanner() {
    const { geo, isLoading } = useGeo();

    if (isLoading) {
        return <div className="h-6 w-48 animate-pulse bg-gray-200 rounded" />;
    }

    return <p>Hello from {geo.location?.city}</p>;
}
```

### 3. Use `loading` on the Provider

Replaces the **entire child tree** with loading content. Only use this
when the whole page depends on geo data:

```tsx
<NetLoc8Provider apiKey="pk_..." loading={<AppSkeleton />}>
    <App />
</NetLoc8Provider>
```

> **On repeat visits:** The `__netloc8` cookie provides geo data
> synchronously, so `isLoading` starts as `false` — no skeleton flash,
> no content shift, no FOUC.

## Conditional Rendering with GeoGate

`<GeoGate>` renders children only when all specified conditions match.
Conditions use AND logic — every prop must match for children to render.

```tsx
import { GeoGate } from '@netloc8/react';

{/* EU users — show cookie consent */}
<GeoGate eu={true} loading={<Skeleton />}>
    <CookieConsentBanner />
</GeoGate>

{/* Non-EU users */}
<GeoGate eu={false}>
    <StandardBanner />
</GeoGate>

{/* Specific countries with fallback */}
<GeoGate country={['US', 'CA']} fallback={<p>Not available in your region</p>}>
    <SpecialOffer />
</GeoGate>

{/* Multiple conditions (AND logic) */}
<GeoGate country="US" region="CA" city="San Francisco">
    <LocalContent />
</GeoGate>
```

### GeoGate Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Content to show when conditions match |
| `fallback` | `ReactNode` | Content to show when conditions don't match |
| `loading` | `ReactNode` | Content to show while geo data is loading |
| `country` | `string \| string[]` | Match `geo.location?.country?.code` |
| `region` | `string \| string[]` | Match `geo.location?.region?.code` |
| `city` | `string \| string[]` | Match `geo.location?.city` |
| `eu` | `boolean` | `true` = EU countries, `false` = non-EU |

## RUM Telemetry

RUM is **enabled by default** (`rum={true}`). The Provider automatically
initializes beacon collection on mount. Data collected:

- **Core Web Vitals** — LCP, FID, INP, CLS, TTFB
- **Navigation Timing** — DNS, TLS, request, response durations
- **JS errors** — unhandled exceptions and resource load failures

Beacons fire via `navigator.sendBeacon()` on page hide — zero latency impact.
No PII is collected. Opt out with `rum={false}`.

## The `useGeo()` Hook

Returns `{ geo, isLoading, error }` following the standard data-fetching
hook pattern (SWR, React Query, Apollo):

```typescript
const { geo, isLoading, error } = useGeo();

if (isLoading) return <Skeleton />;
if (error) return <p>Geo unavailable</p>;

geo.location?.country?.code;    // "US"
geo.location?.country?.flag;    // "🇺🇸"
geo.location?.country?.unions;  // ["EU"] or []
geo.location?.region?.name;     // "California"
geo.location?.city;             // "Mountain View"
geo.location?.timezone;         // "America/Los_Angeles"
geo.location?.utcOffset;        // "-07:00"
geo.network?.organization;      // "Google LLC"
geo.meta?.precision;            // "city"
```

| Field | Type | Description |
|-------|------|-------------|
| `geo` | `Geo` | Current geo data (empty `{}` while loading) |
| `isLoading` | `boolean` | `true` while initial lookup is in progress |
| `error` | `Error \| null` | Non-null if lookup failed |

> **No FOUC on repeat visits:** On a user's first visit in direct mode,
> `isLoading` starts as `true` while the API call completes. On repeat
> visits, the `__netloc8` cookie provides geo data synchronously, so
> `isLoading` starts as `false` — no content shift.

See [`@netloc8/core`](../core/) for the full `Geo` type reference.

## Exports

| Export | Description |
|--------|-------------|
| `NetLoc8Provider` | Context provider — pass `apiKey` (direct) or `geo` (proxy) |
| `useGeo()` | Hook to read the current `Geo` object |
| `GeoGate` | Conditionally render children based on location |
| `GeoContext` | Raw React context (for advanced use) |
| `GeoContextValue` | Type: `{ geo, isLoading, error }` |
| `GeoGateProps` (type) | Props type for GeoGate |

## License

[Elastic License 2.0 (ELv2)](../../LICENSE)
