---
name: code-rules
description: >
  SignalCanvas code quality rules. Load for any code task in this repo.
  Enforces file size limits, DRY, naming, coupling, error handling, and
  no magic numbers. These rules apply to all languages and all repos in
  the SignalCanvas monorepo.
---

# SignalCanvas Code Rules

These rules apply to every file you touch. Check them before finishing any task.

## The Rules

**Rule 1: Separate Concerns**
Every file, function, and module has ONE clear responsibility. If a function does two unrelated things, split it. If a file handles both UI and business logic, break it apart.

**Rule 2: Keep Files Small**
700 lines max — hard limit. Ideally under 500. If a file is growing past 500, refactor into smaller focused modules. Never use 700 as a target — it's a ceiling, not a goal.

**Rule 3: Write Meaningful Unit Tests**
Test actual behavior, not just existence. Cover edge cases, error paths, and real-world scenarios — not just the happy path. Run `npm run audit:tests` (frontend) to verify all tests pass after any change.

**Rule 4: DRY — Don't Repeat Yourself**
Same logic in two places → extract it. Duplicated code means duplicated bugs.

**Rule 5: Use Clear, Descriptive Names**
No vague names like `data`, `result`, `temp`, `handler`, `utils`. Names reveal intent — a reader should understand what something does without reading its implementation.

**Rule 6: Keep Coupling Loose**
Modules depend on each other as little as possible. If changing one file forces changes in five others, refactor to reduce those dependencies.

**Rule 7: YAGNI**
Only build what is needed right now. No speculative features, premature abstractions, or "just in case" code.

**Rule 8: Handle Errors Explicitly**
Every function that can fail handles its errors. No silent failures, no swallowed exceptions, no empty catch blocks.

**Rule 9: No Magic Numbers or Strings**
Hardcoded values like `86400`, `"admin"`, `0.15`, `300` (animation ms), `9999` (z-index) must be named constants. This applies to CSS-in-JS, animation durations, z-index layers, timeouts — everything.

**Rule 10: Read Before You Write**
Read and understand existing code patterns, naming conventions, and architecture before modifying. Match the style already in use. Do not introduce new conventions without discussion.

## Periodic Review Checklist

Stop and check for:
- Files exceeding 500 lines
- Functions doing more than one thing
- Duplicated logic across files
- Vague or misleading names
- Tight coupling between modules
- Missing or shallow tests
- Unhandled error paths
- Magic numbers or hardcoded strings

## Never Use `rm`

Use `trash` instead. Always.

```bash
trash file.txt      # correct
rm file.txt         # FORBIDDEN
```
