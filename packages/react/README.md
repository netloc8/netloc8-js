# @netloc8/react

React bindings for the NetLoc8 geolocation SDK. Provides a context Provider,
`useGeo()` hook, and `<GeoGate>` component for conditional rendering by
location.

> **Tip:** If you're using Next.js, install [`@netloc8/nextjs`](../nextjs/)
> instead — it re-exports everything from this package and adds server-side
> proxy and data helpers.

## Install

```bash
bun add @netloc8/react
```

**Peer dependencies:** `react >= 19`

## Usage

### Provider with publishable key (SPA)

Wrap your app with `<NetLoc8Provider>` and pass a publishable key. The
provider will call the NetLoc8 API on mount to fetch geo data, then
reconcile the browser timezone automatically.

```tsx
import { NetLoc8Provider, useGeo } from '@netloc8/react';

function App() {
    return (
        <NetLoc8Provider publishableKey="pk_...">
            <LocationBanner />
        </NetLoc8Provider>
    );
}

function LocationBanner() {
    const geo = useGeo();
    return <p>Timezone: {geo.timezone}</p>;
}
```

### Conditional rendering with GeoGate

```tsx
import { GeoGate } from '@netloc8/react';

<GeoGate eu={true}>
    <CookieConsentBanner />
</GeoGate>

<GeoGate country={['US', 'CA']} fallback={<p>Not available in your region</p>}>
    <SpecialOffer />
</GeoGate>
```

## Exports

| Export | Description |
|--------|-------------|
| `NetLoc8Provider` | Context provider — pass `publishableKey` (SPA) or `initialGeo` (SSR) |
| `useGeo()` | Hook to read the current `Geo` object |
| `GeoGate` | Conditionally render children based on location |
| `GeoContext` | Raw React context (for advanced use) |

## License

[Elastic License 2.0 (ELv2)](../../LICENSE)
