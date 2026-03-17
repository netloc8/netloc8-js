---
description: Build and publish packages to npm
---

// turbo-all

# Workflow: Publish

Build and publish all packages to npm. This workflow handles only the build and publish steps — use `/release` for the full release ceremony (version bumping, CHANGELOG, tagging, GitHub release).

## Prerequisites

- All tests must pass: `bun test packages/`
- You must be on `main` with the release commit already merged
- **Always use `bun publish`**, never `npm publish` — npm does not resolve `workspace:*` dependencies correctly in this monorepo
- Authentication: `bun publish` automatically uses the auth token from `~/.npmrc` (no `bun login` needed)

## Steps

1. **Run tests:**
   ```bash
   bun test packages/
   ```

2. **Clean and build all packages:**
   ```bash
   bun run clean
   bun run build
   ```
   Each package runs `tsdown` via its `tsdown.config.ts`, producing ESM `.mjs` + `.d.mts` files in `dist/`.

3. **Verify the build output:**
   ```bash
   ls packages/core/dist/
   ls packages/react/dist/
   ls packages/nextjs/dist/
   ```
   Each should contain `.mjs` and `.d.mts` files.

4. **Dry run first** to verify package contents:
   ```bash
   cd packages/core && bun publish --dry-run && cd -
   cd packages/react && bun publish --dry-run && cd -
   cd packages/nextjs && bun publish --dry-run && cd -
   ```

5. **Publish in dependency order** (core first):
   ```bash
   cd packages/core && bun publish --access public && cd -
   cd packages/react && bun publish --access public && cd -
   cd packages/nextjs && bun publish --access public && cd -
   ```

## Guidelines

- **Always publish in order:** `core` → `react` → `nextjs`. The dependency chain requires this.
- **Version lock:** All three packages use the same version number.
- **Clean before build:** tsdown configs have `clean: true`, but run `bun run clean` manually for safety.
