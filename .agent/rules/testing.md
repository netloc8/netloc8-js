---
description: How to run and write tests for the netloc8-js SDK
---

# Testing

Tests use [Bun's built-in test runner](https://bun.sh/docs/cli/test) — no extra dependencies needed.
Bun runs TypeScript natively, so no compilation step is required before testing.

## Running Tests

```bash
# All tests across all packages
bun run test

# Per-package
bun test packages/netloc8-js/src/
bun test packages/react/src/
bun test packages/nextjs/src/
```

## Test Structure

Tests are co-located with source files: `foo.test.ts` beside `foo.ts`.

| Package | Tests |
|---------|-------|
| `@netloc8/netloc8-js` | `api.test.ts`, `ip.test.ts`, `platform.test.ts`, `cookie.test.ts`, `normalize.test.ts`, `reconcile.test.ts` |
| `@netloc8/react` | `gate.test.tsx` |
| `@netloc8/nextjs` | `server.test.ts`, `proxy.test.ts` |

## Writing New Tests

- Place unit tests next to the source file: `foo.test.ts` beside `foo.ts`
- Use `test.skipIf()` for conditional skipping (not early returns)
- Use `mock.module()` sparingly — it can leak across files in Bun
- Use `mock()` to replace `globalThis.fetch` in API tests, restoring in cleanup

## Build-Time Defines

Some modules use `__PKG_NAME__` and `__PKG_VERSION__` globals injected by tsdown's `define` at build time. These are **not available** during test execution (tests run against source, not dist). Use `typeof __PKG_NAME__ !== 'undefined'` guards in source code to provide fallbacks for the test environment.
