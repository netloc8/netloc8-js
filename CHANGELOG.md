# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] — 2026-03-17

### Changed
- **Renamed `@netloc8/netloc8-js` → `@netloc8/core`** — the core package name no longer duplicates the scope; import from `@netloc8/core` going forward
- Bumped all packages (`@netloc8/core`, `@netloc8/react`, `@netloc8/nextjs`) to v0.2.0

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
- `publishableKey` and `apiUrl` props on `NetLoc8Provider` for browser-side geo fetching
- `X-NetLoc8-Client` request header on every API call, identifying SDK package and version
- `clientId` option in `FetchGeoOptions` — allows higher-level packages to override the client identifier
- Proxy strips incoming `x-netloc8-*` headers before processing to prevent header spoofing
- Cookie geo data used as lowest-priority fallback in `reconcileGeo()` — platform headers and API responses always take precedence
- `parseCookie` explicitly picks known `Geo` properties instead of trusting raw JSON
- Bun workspace monorepo with `tsdown` build pipeline and `isolatedDeclarations` for fast `.d.ts` generation

