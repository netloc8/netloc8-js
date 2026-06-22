# Contributing to NetLoc8 JavaScript SDK

## Prerequisites

- [Bun](https://bun.sh/) v1.0+
- Node.js 18+ (for compatibility testing)

## Setup

```bash
git clone https://github.com/netloc8/netloc8-js.git
cd netloc8-js
bun install
```

## Development

Bun handles TypeScript natively — no build step is needed during development.

```bash
# Run all tests
bun run test

# Run tests for a specific package
bun test packages/core/src/
bun test packages/react/src/
bun test packages/nextjs/src/

# Build all packages (only needed for publishing)
bun run build

# Format code
bun run format

# Lint
bun run lint

# Format + lint in one pass
bun run check
```

## Project Structure

```
packages/
├── core/     @netloc8/core    — API client, IP detection, cookies, types
├── react/    @netloc8/react   — Provider, useGeo() hook, GeoGate component
└── nextjs/   @netloc8/nextjs  — Next.js proxy, server functions, re-exports react
```

Dependencies flow upward: `core` ← `react` ← `nextjs`.

## Code Style

This project uses [Biome](https://biomejs.dev/) for formatting and linting. Run `bun run format` before committing.

- TypeScript for all source files
- 4-space indentation
- Co-located tests: `foo.test.ts` next to `foo.ts`
- Tests use Bun's built-in test runner

## Branching

- `main` — production releases
- `develop` — integration branch
- Feature branches off `develop`, PRs target `develop`

## Publishing

Packages are published with `bun publish` (not `npm publish`) to correctly resolve `workspace:*` dependencies.
