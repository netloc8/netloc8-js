---
description: Cut a release — bump version, finalize CHANGELOG, merge develop to main, tag, and create GitHub release
---

// turbo-all

# Workflow: Release

Prepare and publish a new release from `develop` → `main`.

## Steps

1. **Confirm the version number.** Ask the user what version to release (e.g., `1.0.0`). If they don't specify, suggest one based on the changes in `[Unreleased]`:
   - New features → minor bump
   - Bug fixes only → patch bump
   - Breaking changes → major bump

2. **Switch to `develop` and pull latest:**
   ```bash
   git checkout develop && git pull origin develop
   ```

3. **Bump the version** in all package.json files. All three packages share the same version:
   ```bash
   # Update version in each:
   # package.json (root)
   # packages/core/package.json
   # packages/react/package.json
   # packages/nextjs/package.json
   ```

4. **Finalize the CHANGELOG.** In `CHANGELOG.md`:
   - Rename the `[Unreleased]` heading to `[<version>] — <YYYY-MM-DD>` (today's date).
   - Review entries for completeness and consistency with existing entries.
   - Create a fresh empty `[Unreleased]` heading above the new version (optional — only if the user wants one ready).

5. **Commit the release prep:**
   ```bash
   git add package.json packages/*/package.json CHANGELOG.md
   git commit -m "chore: release v<version>"
   ```

6. **Push develop:**
   ```bash
   git push origin develop
   ```

7. **Create a PR from `develop` → `main`:**
   ```bash
   gh pr create --title "release: v<version>" --body "Release v<version>. See CHANGELOG.md for details." --base main
   ```

8. **Merge the PR:**
   ```bash
   gh pr merge --merge --delete-branch=false
   ```

9. **Tag the release on main:**
   ```bash
   git checkout main && git pull origin main
   git tag v<version>
   git push origin v<version>
   ```

10. **Build and publish to npm** (dependency order: core → react → nextjs):
    ```bash
    bun run clean
    bun run build
    cd packages/core && bun publish --access public
    cd packages/react && bun publish --access public
    cd packages/nextjs && bun publish --access public
    ```
    Use `bun publish --dry-run` first if unsure about package contents.

11. **Create the GitHub release.** The title must follow the pattern `v<version> — <short descriptive subtitle>` (e.g., `v1.0.0 — Nested Geo Types, Auto-Detect Mode, RUM Telemetry`). The subtitle should name the 2–4 most significant changes.

    The release notes body must include:
    1. **Opening paragraph** — 1–2 sentences summarizing the release at a high level.
    2. **Highlights section** — emoji bullet points (🏗️ 🔥 📊 🔐 etc.) listing the 5–8 biggest items at a glance.
    3. **Full CHANGELOG entries** — copy the complete `Added`, `Changed`, `Removed`, `Fixed`, and `Security` sections verbatim from `CHANGELOG.md`. Do not summarize or truncate.

    ```bash
    gh release create v<version> --title "v<version> — <subtitle>" --notes "<full notes>"
    ```

12. **Switch back to develop:**
    ```bash
    git checkout develop
    ```

## Guidelines

- **Never skip the CHANGELOG finalization.** The `[Unreleased]` section must be renamed to the versioned heading before merging to `main`.
- **Don't create a fresh `[Unreleased]` heading** unless the user asks for it — it's cleaner to create it when the next PR adds entries.
- **Always publish in order:** `core` → `react` → `nextjs`. The dependency chain requires this.
- **Version lock:** All three packages use the same version number.
- **Dry run first:** Use `bun publish --dry-run` to verify package contents before the real publish.
