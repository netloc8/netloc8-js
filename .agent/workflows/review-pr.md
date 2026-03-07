---
description: Read Copilot (or other reviewer) PR comments, implement fixes, commit, push, and reply to each comment
---

// turbo-all

# Workflow: Review PR Comments

Read review comments on a pull request, implement fixes, commit, push, and reply to each comment.

## Steps

1. **Identify the PR number.** If the user doesn't provide one, detect from the current branch:
   ```bash
   gh pr view --json number --jq '.number'
   ```

2. **Fetch all reviews and inline comments in two commands:**

   Get the review rounds (to identify the latest reviewer pass):
   ```bash
   gh pr view <PR> --json reviews \
     --jq '.reviews[] | select(.author.login != "<your-username>") | "ReviewID: \(.id) | \(.author.login) | \(.state) | \(.submittedAt)"'
   ```

   Get all top-level inline comments grouped by review round, showing which are already replied to:
   ```bash
   gh api "repos/{owner}/{repo}/pulls/<PR>/comments?per_page=100" --jq '
     [.[] | select(.in_reply_to_id == null)] as $tops |
     [.[] | select(.in_reply_to_id != null) | .in_reply_to_id] as $replied |
     $tops | group_by(.pull_request_review_id)[] |
     "=== Review \(.[0].pull_request_review_id) (\(length) comments) ===",
     (.[] | "  \(if ([.id] | inside($replied)) then "✓" else "NEW" end) [\(.id)] \(.path):\(.line // .original_line) — \(.body | split("\n") | first)")
   '
   ```

   This single command shows all comments across all review rounds, marking each as `✓` (already replied) or `NEW` (needs attention). Focus only on `NEW` comments.

3. **For NEW comments, fetch the full body** (the summary above truncates to the first line):
   ```bash
   gh api "repos/{owner}/{repo}/pulls/<PR>/comments?per_page=100" --jq '
     [.[] | select(.in_reply_to_id != null) | .in_reply_to_id] as $replied |
     [.[] | select(.in_reply_to_id == null) | select([.id] | inside($replied) | not)] |
     .[] | "---\nID: \(.id)\nFile: \(.path):\(.line // .original_line)\nBody: \(.body)\n"
   '
   ```

4. **Triage each NEW comment.** For each one, assess:
   - ✅ **Agree** — clear improvement, implement it
   - ⚖️ **Partial** — valid concern but existing code already handles it partially; implement a targeted fix
   - ❌ **Disagree** — the reviewer misunderstood the code; reply with an explanation only

   Present the triage to the user as a summary table before proceeding.

5. **Implement fixes** for all agreed/partial comments. Make the code changes.

6. **Verify** the changes pass tests:
   ```bash
   bun test packages/
   ```

7. **Stage, commit, and push.** Use a single commit if all changes are related:
   ```bash
   git add <files>
   git commit -m 'fix(<scope>): address PR review feedback

   <enumerate each fix>'
   git push
   ```

8. **Reply to each comment** on the PR. Use the correct GitHub API:
   ```bash
   gh api repos/{owner}/{repo}/pulls/<PR>/comments \
     -f body="<reply text>" \
     -F in_reply_to=<comment_id> \
     --jq '.html_url'
   ```

   Reply guidelines:
   - Reference the commit hash (short form) if a code change was made
   - Briefly describe what was changed and why
   - For disagreed comments, explain the reasoning respectfully

## Guidelines

- **Always triage first.** Don't blindly implement every suggestion — some may conflict with project conventions or misunderstand the code's intent.
- **One commit for review fixes.** Group all review feedback fixes into a single commit unless they span fundamentally different concerns.
- **Reply to every comment.** Even if no code change was needed, reply to acknowledge the feedback.
- **Reference the fix commit.** Every reply should start with "Fixed in {hash}." or "No change needed." so reviewers can verify.
