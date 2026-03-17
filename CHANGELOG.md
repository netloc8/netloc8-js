# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).


## [1.0.0] — 2026-03-17

### ⚠️ Breaking Changes
- **Nested `Geo` interface** — flat fields replaced with nested structure matching the backend `GeolocationResult` schema (e.g. `geo.country` → `geo.location?.country?.code`, `geo.isEU` → `geo.location?.country?.unions?.includes('EU')`)
- **API URL** — default changed from `https://netloc8.com` to `https://api.netloc8.com`
- **API paths** — `/api/v1/ip/...` → `/v1/ip/...`
- **`GeoGate` props** — `country`, `region`, `city`, `eu` now read from nested paths
- **Header transport** — `x-netloc8-*` headers rewritten for nested Geo field mapping (25 headers)

### Added
- **Browser validation headers** — `X-NL8-TZ`, `X-NL8-Lang`, `X-NL8-Conn`, `X-NL8-RTT` sent on every API request (~120 bytes, zero-config)
- **Structured error parsing** — API errors parsed into `ApiErrorResponse` with error codes and messages
- **RUM telemetry** — new `@netloc8/core/telemetry/rum` subpath export, collects Core Web Vitals + Navigation Timing + JS errors via `navigator.sendBeacon()`. Enabled by default (`rum={true}`), opt out with `rum={false}`
- **`web-vitals` dependency** — added as a regular dependency (4KB gzipped, lazy-loaded at runtime)
- **`signals.ts` module** — shared browser signal collection (`getTimezone`, `getLanguage`, `getConnectionType`, `getDeviceType`) used by both API headers and RUM beacons
- **Auto-detect mode** — `NetLoc8Provider` infers direct/proxy mode from props (`apiKey` → direct, `geo` → proxy). Explicit `mode` prop available as override.
- **Deep-merge `reconcileGeo`** — nested object merge with priority (api > platform > cookie) without clobbering sibling fields

### Changed
- `parseCookie`/`serializeCookie` validate nested Geo shape with strict field picking
- `getGeoFromPlatformHeaders` returns nested Geo from Vercel/Cloudflare/CloudFront headers
- All packages bumped to 1.0.0

### Removed
- Flat `Geo` interface fields (`country`, `countryName`, `isEU`, `ip`, `latitude`, etc.)
- `CF_GEO_PLAN.md` — implementation complete, deferred items tracked in backend `docs/SDK_ROADMAP.md`

## [0.2.0] — 2026-03-17

### Changed
- **Renamed `@netloc8/netloc8-js` → `@netloc8/core`** — the core package name no longer duplicates the scope; import from `@netloc8/core` going forward
- Bumped all packages (`@netloc8/core`, `@netloc8/react`, `@netloc8/nextjs`) to v0.2.0

### Fixed
- Exported `GeoGateProps` interface from `@netloc8/react` for external use
- Added missing `@types/react-dom` dev dependency

## [0.1.3] — 2026-03-07

### Fixed
- Fixed published `@netloc8/react` and `@netloc8/nextjs` packages containing unresolved `workspace:*` dependency references — switched from `npm publish` to `bun publish` which resolves workspace protocol automatically
- Note: v0.1.2 is broken on npm due to this issue; use v0.1.3+

## [0.1.2] — 2026-03-07

### Fixed
- Fixed proxy stripping full cookie geo data on self-hosted / non-Vercel deployments — on the cookie fast path (2nd+ request), only `ip`, `timezone`, and `timezoneFromClient` were passed to `reconcileGeo()`, discarding `city`, `country`, `region`, `latitude`, `longitude`, and all other fields; now the full cookie object is passed through (cookie remains lowest priority, overwritten by platform headers or API data when available)

## [0.1.1] — 2026-03-07

### Fixed
- Fixed `GeoGate` example in `@netloc8/react` and `@netloc8/nextjs` READMEs — removed erroneous `not` prop that inverted the intended logic

## [0.1.0] — 2026-03-07

### Added
- `@netloc8/netloc8-js` v0.1.0 — Core package with API client, IP detection, platform header extraction, cookie utilities, response normalization, and geo reconciliation
- `@netloc8/react` v0.1.0 — React bindings with `NetLoc8Provider`, `useGeo()` hook, `GeoGate` component, and `GeoContext`
- `@netloc8/nextjs` v0.1.0 — Next.js proxy (`createProxy`, `withGeoRedirect`), server functions (`getGeo`, `getTimezone`), and React re-exports
- `fetchMyGeo()` and `fetchMyTimezone()` for client-side SPA usage with publishable keys (`pk_`)
- `apiKey` and `apiUrl` props on `NetLoc8Provider` for browser-side geo fetching
- `X-NetLoc8-Client` request header on every API call, identifying SDK package and version
- `clientId` option in `FetchGeoOptions` — allows higher-level packages to override the client identifier
- Proxy strips incoming `x-netloc8-*` headers before processing to prevent header spoofing
- Cookie geo data used as lowest-priority fallback in `reconcileGeo()` — platform headers and API responses always take precedence
- `parseCookie` explicitly picks known `Geo` properties instead of trusting raw JSON
- Bun workspace monorepo with `tsdown` build pipeline and `isolatedDeclarations` for fast `.d.ts` generation

