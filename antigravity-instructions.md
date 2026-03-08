# Antigravity Instructions for NetLoc8-JS

These rules apply specifically to this workspace and override general defaults.

## 1. Package Publishing
**ALWAYS use `bun publish` instead of `npm publish`.**
This is a Bun workspace, and `npm publish` fails to resolve `workspace:*` protocol dependencies into actual version numbers, leading to broken published packages. 
- You do **not** need to run `bun login`. Bun automatically reads publishing authentication tokens from `~/.npmrc`.

## 2. Package Manager
**Always use Bun (`bun install`, `bun run`, `bun test`).**
Do not use `npm` or `yarn` commands within this repository to avoid generating `package-lock.json` cruft or misaligning with the Bun workspace configuration.
