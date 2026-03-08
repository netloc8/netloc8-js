# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
- Cookie fast path only trusts `timezone`/`timezoneFromClient` — all other geo fields are re-resolved from the API to prevent spoofing
- `parseCookie` explicitly picks known `Geo` properties instead of trusting raw JSON
- Bun workspace monorepo with `tsdown` build pipeline and `isolatedDeclarations` for fast `.d.ts` generation

