# @netloc8 SDK

Geolocation SDK for JavaScript applications. Provides IP geolocation with
browser-accurate timezone reconciliation across multiple frameworks.

## Packages

| Package | Description |
|---------|-------------|
| [`@netloc8/core`](./packages/core/) | Zero-dependency core — API client, IP detection, platform headers, cookies |
| [`@netloc8/react`](./packages/react/) | React context, Provider, `useGeo()` hook, `<GeoGate>` component |
| [`@netloc8/nextjs`](./packages/nextjs/) | Next.js proxy, server functions, re-exports React bindings |

## Which Package?

- **Next.js** — install `@netloc8/nextjs` (includes React + core)
- **React SPA** — install `@netloc8/react` (includes core)
- **Node / Edge / Vanilla JS** — install `@netloc8/core`

See each package's README for detailed usage instructions.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NETLOC8_API_KEY` | Yes (server) | Secret API key (`sk_...`) for proxy and server functions |
| `NETLOC8_API_URL` | No | API base URL (defaults to `https://netloc8.com`) |
| `NETLOC8_TEST_IP` | No | Override IP in development |

For client-side SPAs, pass a publishable key (`pk_...`) via the `publishableKey` prop instead.

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test packages/

# Run tests for a specific package
bun test packages/core/src/
```

## How It Works

1. **Proxy** intercepts each request — detects client IP, checks cookie cache, reads platform headers (Vercel/Cloudflare/CloudFront), and calls the NetLoc8 API if needed
2. **Reconciliation** merges all sources (cookie → API → platform) into a single `Geo` object
3. **Server Components** read geo data from `x-netloc8-*` request headers set by the proxy
4. **Client Components** receive geo data via React context; on mount, the Provider reads the browser's `Intl.DateTimeFormat` timezone for 100% accuracy and persists it in a cookie

## License

[Elastic License 2.0 (ELv2)](./LICENSE)
