---
trigger: always_on
---

# Git & Branching Strategy

## Branching Model
* **Main Branch (`main`):** Production-ready code only.
* **Development Branch (`develop`):** The primary integration branch for new features and bug fixes.
* **Feature Branches (`feature/*` or `fix/*`):** Created from `develop`.

## Pull Requests (PRs)
* **Target Branch:** All feature and fix branches MUST target the `develop` branch for their first Pull Request.
* **Release Flow:** Only `develop` is merged into `main` (usually via a release branch or a direct PR once `develop` is stable).