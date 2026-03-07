---
description: Generate a GitHub pull request title and description from branch commits
---

// turbo-all

# Workflow: Generate Pull Request

Create a pull request from the current branch using the GitHub CLI.

## Steps

1. Identify the base commit or branch to diff against.
   - If the user provides a commit hash or branch name, use that.
   - Otherwise, detect the merge base: `git merge-base HEAD develop`

2. List all commits in the range:
   ```bash
   git log <base>..HEAD --oneline --reverse
   ```

3. Get the file change summary:
   ```bash
   git diff <base>..HEAD --stat
   ```

4. Push the current branch to the remote (if not already pushed):
   ```bash
   git push -u origin HEAD
   ```

5. **Compose the PR title and body.** Use the commit list and diff stats to draft the content following this structure:

   - **Title**: Conventional commit format (e.g., `feat:`, `fix:`, `refactor:`), under 72 characters.
   - **Body**:
     - **Summary** — 2-3 sentence overview.
     - **What's Included** — Changes grouped by feature area (not commit order). Use bullet points.
     - **Files Changed** — Table of areas and file basenames.
     - **Testing** — What was actually tested.

6. **Create the pull request** using GitHub CLI:
   ```bash
   gh pr create --title "<title>" --body "<body>" --base develop
   ```
   - If the user specifies a different base branch, use that instead of `main`.
   - If the user requests a draft PR, add the `--draft` flag.

## Guidelines

- **Grouping**: Organize changes by feature area, not by commit order. Combine related commits.
- **Brevity**: Reviewers skim — use bullets, not paragraphs.
- **Omit noise**: Don't list every single file if there are many migrations or lock files. Group them.
- **Testing section**: Mention what was actually tested, not aspirational test plans.
