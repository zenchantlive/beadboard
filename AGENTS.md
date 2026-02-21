# Agent Operating Manual (BeadBoard)

This repo is execution-first, evidence-first, and beads-driven.

## Core Rules

1. Use `bd` as the source of truth for work state.
2. When user says "what's up" or "yo" or any introductory phrase, that means figure out what beads were recently closed and what beads are now unblocked and suggest the next bead to work on.
3. No direct writes to `.beads/issues.jsonl`; mutate via `bd` commands only.
4. Evidence before assertions: do not claim fixed/passing/done without fresh command output.
5. Keep language simple in user-facing labels and UI copy.
6. Reuse shared code paths/components; avoid one-off logic drift across pages.

## Quick Beads Workflow

```bash
bd ready
bd show <id>
bd update <id> --status in_progress --notes "<plan>"
bd update <id> --notes "<progress/evidence>"
bd close <id> --reason "<what was completed>"
bd sync
```

## Bead Prompting Standard

1. When creating or rewriting bead details, follow `docs/protocols/bead-prompting.md`.
2. Bead descriptions must be model-facing prompts, not internal prose notes.
3. Include explicit `Scope` and `Out of Scope` in every bead.
4. Treat `Success Criteria` as the completion contract.
5. Keep dependency flow minimal and execution-correct.

## Start-of-Task Protocol

1. Read the target bead and acceptance criteria (`bd show <id>`).
2. Confirm dependency direction before coding.
3. Write a short implementation plan with explicit verification steps.
4. Claim the bead `in_progress` with a note describing scope.

## Dependency Discipline (Critical)

1. Dependencies model execution order, not visual order.
2. Validate that "ready/blocked/done" logic matches dependency semantics in all views.
3. If a bead should be parallelizable, do not chain it unnecessarily.
4. After closing a bead, confirm newly unblocked beads with `bd close <id> --suggest-next`.

## Test-First Implementation

1. Write failing tests first for every behavior change.
2. Run the failing test and capture the failure reason.
3. Implement the smallest change to pass.
4. Re-run focused tests, then full gates.

## Verification Gates (Required)

Run these before closing a bead that changes code:

```bash
npm run typecheck
npm run lint
npm run test
```

If UI changed, refresh screenshots and record artifact paths.

## Realtime / Refresh Bug Triage Pattern

When status updates are stale or require refresh:

1. Verify source-of-truth parity (`bd show` vs app output).
2. Confirm read path prefers live BD data when needed.
3. Confirm watcher inputs include DB + WAL + touch markers.
4. Confirm SSE fallback compares mtime/timestamps, not only static file content.
5. Add regression tests for watcher/events behavior.

## Parallel Agent Pattern

Use parallel agents for independent beads.

1. Parent agent owns orchestration and integration.
2. Worker agent owns one bead only, claims it, tests it, verifies it, closes it.
3. Worker reports exact files changed and command results.
4. Parent re-verifies full repo gates before final status claims.

## PR and Diff Hygiene

1. Keep diffs scoped to intended files.
2. Include test files with feature/bugfix code.
3. Do not mix unrelated cleanup in the same bead.
4. Update bead notes with concrete evidence (commands + results).

## Common Failure Patterns (Do Not Repeat)

1. Wrong `bd` flags:
   - `bd create` uses `--acceptance`, not `--acceptance-criteria`.
   - `bd close` does not support `--notes`; add notes with `bd update <id> --notes "..."` first, then close.
2. Premature completion claims:
   - Never say a bead is done before running fresh `npm run typecheck`, `npm run lint`, `npm run test`.
3. Scope confusion in parallel work:
   - Worker agents must own one bead only and avoid touching unrelated files.
4. Dependency direction mistakes:
   - Validate blockers/ready semantics against dependency graph before changing status logic.
5. Duplicate fixes across views:
   - If logic affects Kanban and Graph, centralize shared logic; do not patch one page only.
6. Stale realtime assumptions:
   - Confirm DB + WAL + touch markers are watched and SSE fallback uses mtime/timestamps.
7. Missing test registration:
   - New test files must be included in `npm run test` script if the suite is explicitly enumerated.

## Session Completion (Landing the Plane)

When ending a coding session:

1. Create beads for remaining follow-ups.
2. Run quality gates if code changed.
3. Update/close beads with notes and evidence.
4. Sync and push:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status
   ```
5. Hand off with:
   - what changed,
   - what is verified,
   - open risks/gaps,
   - exact next bead(s).

## Non-Negotiable Honesty Rule

Never claim:
- "done",
- "passing",
- "fixed",
- "closed"

unless you have run the proving command(s) in the current session and can cite results.
