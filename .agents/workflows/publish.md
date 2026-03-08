---
description: Build and publish packages to npm using bun
---
// turbo-all

# Workflow: Publish Packages

Build and publish the monorepo packages to the npm registry.

## Rules

- **ALWAYS use `bun publish`**, NEVER `npm publish`. npm does not resolve `workspace:*` dependencies correctly in this monorepo.
- **Authentication**: You do NOT need to run `bun login`. `bun publish` automatically uses the auth token from the global `~/.npmrc`.

## Steps

1. Ensure the working tree is clean and you are on the correct branch.
2. Build the packages:
   ```bash
   bun run build
   ```
3. Publish each package sequentially using `bun publish`:
   ```bash
   cd packages/netloc8-js && bun publish --access public
   cd ../react && bun publish --access public
   cd ../nextjs && bun publish --access public
   ```
4. If this is a new release, consider creating a GitHub release and git tag.
