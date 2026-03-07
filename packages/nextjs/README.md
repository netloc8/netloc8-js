# @netloc8/nextjs

Next.js integration for the NetLoc8 geolocation SDK. Adds a proxy for
server-side IP resolution and helper functions for reading geo data in
Server Components, Route Handlers, and Server Actions. Re-exports all
React bindings (`NetLoc8Provider`, `useGeo`, `GeoGate`).

## Install

```bash
bun add @netloc8/nextjs
```

**Peer dependencies:** `next >= 16`, `react >= 19`

## Quick Start

### 1. Set up the proxy

Create `proxy.ts` in your Next.js app root:

```typescript
import { createProxy } from '@netloc8/nextjs/proxy';

export default createProxy();
```

### 2. Read geo data in Server Components

```typescript
import { getGeo } from '@netloc8/nextjs/server';

export default async function Page() {
    const geo = await getGeo();
    return <p>Hello from {geo.city}, {geo.country}</p>;
}
```

### 3. Read geo data in Client Components

Wrap your layout with `<NetLoc8Provider>`:

```tsx
import { getGeo } from '@netloc8/nextjs/server';
import { NetLoc8Provider } from '@netloc8/nextjs';

export default async function RootLayout( { children } ) {
    const geo = await getGeo();

    return (
        <NetLoc8Provider initialGeo={geo}>
            {children}
        </NetLoc8Provider>
    );
}
```

Then use the hook in any client component:

```tsx
'use client';
import { useGeo } from '@netloc8/nextjs';

export function LocationBanner() {
    const geo = useGeo();
    return <p>Timezone: {geo.timezone}</p>;
}
```

### 4. Conditional rendering with GeoGate

```tsx
import { GeoGate } from '@netloc8/nextjs';

<GeoGate eu={true}>
    <CookieConsentBanner />
</GeoGate>

<GeoGate country={['US', 'CA']} not fallback={<p>Not available in your region</p>}>
    <SpecialOffer />
</GeoGate>
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NETLOC8_API_KEY` | Yes | Secret API key (`sk_...`) for the proxy |
| `NETLOC8_API_URL` | No | API base URL (defaults to `https://netloc8.com`) |
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

## License

[Elastic License 2.0 (ELv2)](../../LICENSE)
