---
description: Perform a comprehensive code review of staged/unstaged changes or a branch diff
---

// turbo-all

# Workflow: Review Code

Perform a structured code review of the current working tree changes, staged changes, or a full branch diff.

## Steps

1. **Determine the diff scope.** Use one of the following depending on context:
   - If the user specifies a branch or commit: `git diff <base>..HEAD`
   - If there are staged changes: `git diff --cached`
   - Otherwise, diff against the upstream branch: `git diff $(git merge-base HEAD develop)..HEAD`

   Get the stat summary and the full diff:
   ```bash
   git diff <scope> --stat
   git diff <scope>
   ```

2. **Read each changed file in full.** For every file in the diff, open and read the complete file (not just the diff hunks). Reviewing only hunks misses context — you need to see surrounding code, imports, and how functions are called.

3. **Analyze each file against these review areas:**

   **Security**
   - Input validation and sanitization (user input, headers, query params)
   - Authentication and authorization boundaries (scope checks, ownership)
   - Data exposure (secrets in responses, stack traces, internal IDs)
   - Injection vectors (SQL, command, regex, template)
   - Cryptographic correctness (randomness source, hashing, timing attacks)

   **Correctness**
   - Logic errors, off-by-one, edge cases (null, empty, boundary values)
   - Error handling (swallowed errors, missing catch blocks, unsafe fallbacks)
   - Race conditions and concurrency issues
   - Type mismatches (wrong JSON parse assumptions, implicit coercion)
   - TypeScript type safety (proper use of generics, narrowing, no unnecessary `any`)

   **Architecture**
   - Separation of concerns (server logic in client code, mixed layers)
   - Duplication (same logic in two places, should be a shared utility)
   - Dependency direction (circular imports, tight coupling)
   - Consistency with existing patterns in the codebase

   **Performance**
   - N+1 queries, unbounded loops, missing pagination
   - Unnecessary re-renders or re-computations
   - Missing caching where appropriate
   - Large payloads or uncompressed responses

   **Testing & Documentation**
   - Are new code paths covered by tests?
   - Are edge cases tested (null input, empty arrays, auth failures)?
   - Are TypeScript types accurate and complete?
   - Do error messages help the developer debug?

4. **Classify each finding:**

   - 🔴 **Critical** — Must fix before merge. Security vulnerability, data loss risk, or broken functionality.
   - 🟡 **Suggestion** — Improvement worth considering. Code smell, minor inefficiency, or readability issue.
   - 🟢 **Nitpick** — Stylistic preference or very minor cleanup. Optional.
   - ✅ **Praise** — Highlight something done well. Reinforces good patterns.

5. **Format the output** as a structured report:

   For each finding, include:
   - The file and line number(s)
   - The classification emoji and label
   - A clear one-line summary
   - Explanation of why it matters
   - A concrete fix (code suggestion) if applicable

   Group findings by file. Lead with 🔴 Critical, then 🟡 Suggestions, then 🟢 Nitpicks. End with ✅ Praise.

   After all per-file findings, include an **Overall Assessment** section:
   - Is this safe to merge? (Yes / Yes with reservations / No)
   - Summary of the most important items

6. **If the user asks to fix issues**, implement the fixes, run tests, and commit using the `/commit` workflow.

## Rules

- **Read full files, not just diffs.** Context is everything. A function that looks fine in isolation may be dangerous when you see how it's called.
- **Be specific.** "This could be better" is useless. "Line 42: `JSON.parse` without try/catch will crash on malformed input" is actionable.
- **Don't nitpick style if the project has a formatter.** Focus on logic, security, and architecture.
- **Praise good work.** Code review is not just about finding problems.
- **If you find nothing wrong, say so.** Don't invent issues to seem thorough.
