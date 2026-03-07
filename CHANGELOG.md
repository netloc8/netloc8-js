# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `@netloc8/netloc8-js` v0.1.0 — Core package with API client, IP detection, platform header extraction, cookie utilities, response normalization, and geo reconciliation
- `@netloc8/react` v0.1.0 — React bindings with `NetLoc8Provider`, `useGeo()` hook, `GeoGate` component, and `GeoContext`
- `@netloc8/nextjs` v0.1.0 — Next.js proxy (`createProxy`, `withGeoRedirect`), server functions (`getGeo`, `getTimezone`), and React re-exports
- `fetchMyGeo()` and `fetchMyTimezone()` for client-side SPA usage with publishable keys (`pk_`)
- `publishableKey` and `apiUrl` props on `NetLoc8Provider` for browser-side geo fetching
- Bun workspace monorepo scaffolding
- 81 unit tests across all packages
- `tsdown` build pipeline with per-package configs and `isolatedDeclarations` for fast `.d.ts` generation via `oxc-transform`

### Security
- Proxy strips incoming `x-netloc8-*` headers before processing to prevent header spoofing
- `parseCookie` now explicitly picks known `Geo` properties instead of trusting raw JSON

### Fixed
- `NetLoc8Provider` uses functional `setGeo` updater and runs timezone reconciliation once on mount
- Return type changed from `JSX.Element` to `ReactNode` for React 19 compatibility
- `GeoContext` has explicit `Context<Geo>` annotation for `isolatedDeclarations` support
