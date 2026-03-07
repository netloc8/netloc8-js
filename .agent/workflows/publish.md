---
description: Build and publish packages to npm
---

# Workflow: Publish

Build all packages and publish them to npm.

## Prerequisites

- All tests must pass: `bun test packages/`
- CHANGELOG.md must be updated with the new version
- You must be on the `main` branch (or a release branch)
- `NPM_TOKEN` must be set (or `npm login` completed)

## Steps

1. **Verify tests pass:**
   ```bash
   bun test packages/
   ```

2. **Bump versions** across all three packages. They share the same version number:
   ```bash
   # Update version in each package.json
   # packages/netloc8-js/package.json
   # packages/react/package.json
   # packages/nextjs/package.json
   # Also update the root package.json
   ```
   Use the same version for all packages to keep the dependency chain simple.

3. **Update CHANGELOG.md:**
   - Move items from `[Unreleased]` into a new version section
   - Add the release date

4. **Clean and build all packages** (uses `tsdown` per package):
   ```bash
   bun run clean
   bun run build
   ```
   Each package runs `tsdown` via its `tsdown.config.ts`, producing ESM `.mjs` + `.d.mts` files in `dist/`.

5. **Verify the build output:**
   ```bash
   ls packages/netloc8-js/dist/
   ls packages/react/dist/
   ls packages/nextjs/dist/
   ```
   Each should contain `.mjs` and `.d.mts` files.

6. **Publish in dependency order** (core first):
   ```bash
   cd packages/netloc8-js && bun publish --access public
   cd packages/react && bun publish --access public
   cd packages/nextjs && bun publish --access public
   ```

7. **Commit and tag:**
   ```bash
   git add -A
   git commit -m 'chore: release v<version>'
   git tag v<version>
   git push && git push --tags
   ```

8. **Create a GitHub release** from the tag:
   ```bash
   gh release create v<version> --title "v<version>" --notes "<changelog entry>"
   ```

## Guidelines

- **Always publish in order:** `netloc8-js` → `react` → `nextjs`. The dependency chain requires this.
- **Version lock:** All three packages use the same version number.
- **Dry run first:** Use `bun publish --dry-run` to verify package contents before the real publish.
- **Clean before build:** tsdown configs have `clean: true`, but run `bun run clean` manually for safety.
