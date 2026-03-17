---
description: Project-specific conventions for the netloc8-js SDK monorepo
---

# netloc8-js Workspace Rules

This is a **TypeScript** monorepo. The user's global preference for ESNext JavaScript with JSDoc does **not** apply here.

## Language

- All source files use **TypeScript** (`.ts` / `.tsx`).
- Types are defined via TypeScript interfaces, not JSDoc.
- Each package compiles to ESM JavaScript with declaration files via `tsdown`.

## Runtime & Tooling

- **Bun** is the preferred runtime for everything: package management, script execution, testing, and development.
- Always use `bun` commands (not `npm`, `yarn`, or `npx`).
- **Bun workspaces** link the three packages (`packages/*`).
- Tests use Bun's built-in test runner (`bun test`). No additional test framework (Jest, Vitest, etc.) is used.
- **`tsdown`** (dev dependency at root) handles building for npm: compiles TS → JS + `.d.ts`. Uses `oxc-transform` with `isolatedDeclarations` for fast declaration generation.
- Bun handles TypeScript natively — **no build step is needed during development**. The `tsdown` build is only required when publishing to npm.

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@netloc8/core` | `packages/core/` | Zero-dep, framework-agnostic core (API client, IP detection, cookies, types) |
| `@netloc8/react` | `packages/react/` | React context, Provider, `useGeo()` hook, `<GeoGate>` component |
| `@netloc8/nextjs` | `packages/nextjs/` | Next.js 16+ proxy, server functions, re-exports `@netloc8/react` |

## Dependency Chain

```
@netloc8/core  ← zero deps
       ↑
@netloc8/react       ← peerDep: react
       ↑
@netloc8/nextjs      ← peerDep: next, react
```

## Key Conventions

- License: Elastic License 2.0 (ELv2).
