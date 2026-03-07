# @netloc8 SDK

Geolocation SDK for Next.js applications. Provides server-side IP geolocation with browser-accurate timezone reconciliation.

## Packages

| Package | Description |
|---------|-------------|
| [`@netloc8/netloc8-js`](./packages/netloc8-js/) | Zero-dependency core — API client, IP detection, platform headers, cookies |
| [`@netloc8/react`](./packages/react/) | React context, Provider, `useGeo()` hook, `<GeoGate>` component |
| [`@netloc8/nextjs`](./packages/nextjs/) | Next.js proxy, server functions, re-exports React bindings |

## Quick Start

### 1. Install

```bash
bun add @netloc8/nextjs
```

### 2. Set up the proxy

Create `proxy.ts` in your Next.js app root:

```typescript
import { createProxy } from '@netloc8/nextjs/proxy';

export default createProxy();
```

### 3. Read geo data in Server Components

```typescript
import { getGeo } from '@netloc8/nextjs/server';

export default async function Page() {
    const geo = await getGeo();
    return <p>Hello from {geo.city}, {geo.country}</p>;
}
```

### 4. Read geo data in Client Components

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

### 5. Conditional rendering with GeoGate

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
| `NETLOC8_API_KEY` | Yes | Secret API key (`sk_...`) |
| `NETLOC8_API_URL` | No | API base URL (defaults to `https://netloc8.com`) |
| `NETLOC8_TEST_IP` | No | Override IP in development |

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test packages/

# Run tests for a specific package
bun test packages/netloc8-js/src/
```

## How It Works

1. **Proxy** intercepts each request — detects client IP, checks cookie cache, reads platform headers (Vercel/Cloudflare/CloudFront), and calls the NetLoc8 API if needed
2. **Reconciliation** merges all sources (cookie → API → platform) into a single `Geo` object
3. **Server Components** read geo data from `x-netloc8-*` request headers set by the proxy
4. **Client Components** receive geo data via React context; on mount, the Provider reads the browser's `Intl.DateTimeFormat` timezone for 100% accuracy and persists it in a cookie

## License

[Elastic License 2.0 (ELv2)](./LICENSE)
