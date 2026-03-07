# @netloc8/netloc8-js

Zero-dependency core library for the NetLoc8 geolocation SDK. Provides the
API client, IP detection, platform header parsing, cookie management,
and geo-source reconciliation.

> **Tip:** If you're using Next.js, install [`@netloc8/nextjs`](../nextjs/)
> instead — it re-exports everything from this package. For React SPAs,
> see [`@netloc8/react`](../react/).

## Install

```bash
bun add @netloc8/netloc8-js
```

## Usage

### Fetch geo data for an IP

```typescript
import { fetchGeo } from '@netloc8/netloc8-js';

const geo = await fetchGeo( '203.0.113.42', {
    apiKey: 'sk_...',
} );

console.log( geo );
// { ip, country, region, city, timezone, ... }
```

### Fetch only the timezone

```typescript
import { fetchTimezone } from '@netloc8/netloc8-js';

const tz = await fetchTimezone( '203.0.113.42', {
    apiKey: 'sk_...',
} );

console.log( tz ); // "America/Chicago"
```

### Client-side (browser) — fetch for the caller's own IP

```typescript
import { fetchMyGeo, fetchMyTimezone } from '@netloc8/netloc8-js';

const geo = await fetchMyGeo( { apiKey: 'pk_...' } );
const tz  = await fetchMyTimezone( { apiKey: 'pk_...' } );
```

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
| `reconcileGeo` | Merge cookie, platform, and API geo sources |
| `normalizeApiResponse` | Normalize raw API JSON into a `Geo` object |
| `Geo` (type) | The shared geolocation type used across all packages |

## License

[Elastic License 2.0 (ELv2)](../../LICENSE)
