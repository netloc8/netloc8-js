---
description: Stage and commit changes in logical batches with detailed commit messages
---

// turbo-all

# Workflow: Commit Changes

Stage and commit working tree changes in logical, reviewable batches with high-quality commit messages.

## Steps

1. **Inspect the working tree**:
   ```bash
   git status --short
   git diff --stat
   ```

2. **Group changes into logical commits**. Each commit should represent one coherent unit of work. Common groupings:
   - Schema/config changes separate from UI changes
   - New features separate from bug fixes
   - Migrations separate from the collection changes that require them
   - Documentation separate from code changes
   - Refactors separate from new functionality

3. **For each logical batch**, stage only the relevant files:
   ```bash
   git add <file1> <file2> ...
   ```
   - Use `git add -p` if a single file contains changes for multiple commits.
   - Never use `git add -A` unless all changes belong in one commit.

4. **Write the commit message** using this format:
   ```
   <type>(<scope>): <subject line — imperative, ≤72 chars>

   <body — wrap at 72 chars>

   Explain WHAT changed and WHY, not HOW (the diff shows how).
   Mention side effects, breaking changes, or non-obvious decisions.
   Reference related commits or issues when relevant.
   ```

   **Types**: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`
   **Scope**: optional, e.g. `(localized-content)`, `(migration)`, `(admin-ui)`

5. **Execute each `git commit`** immediately. Do not ask for approval.

6. **Do NOT push** unless the user explicitly asks.

7. **If the user asks to push and open a PR**, use the `/generate-pr` workflow or run directly:
   ```bash
   git push -u origin HEAD
   gh pr create --title "<type>(<scope>): <subject>" --body "<description>" --base main
   ```

## Rules

- **One concern per commit.** If you added a feature AND fixed a bug, those are two commits.
- **Commit messages are documentation.** A future developer should understand the change from the message alone.
- **Subject line is imperative mood**: "add field" not "added field" or "adds field".
- **No WIP commits.** Every commit should leave the codebase in a working state.
- **Never amend or force-push** without explicit user instruction.
