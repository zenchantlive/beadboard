# Agent Operating Manual (BeadBoard)

This repo is execution-first, evidence-first, and beads-driven.

## Core Rules

1. Use `bd` as the source of truth for work state.
2. When user says "what's up" or "yo" or any introductory phrase, that means figure out what beads were recently closed and what beads are now unblocked and suggest the next bead to work on.
3. No direct writes to `.beads/issues.jsonl`; mutate via `bd` commands only.
4. Evidence before assertions: do not claim fixed/passing/done without fresh command output.
5. Keep language simple in user-facing labels and UI copy.
6. Reuse shared code paths/components; avoid one-off logic drift across pages.
7. Treat BeadBoard as a multi-agent coordination + communication system first; optimize feature decisions for swarm execution clarity before cosmetic/layout preferences.
8. Runtime UI route surface is query-driven from `/` (`view=social|graph|activity`); do not reintroduce direct App Router page sprawl without explicit approval.

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

## Runtime Surface Guardrails

1. Keep the active runtime page surface minimal under `src/app`.
2. Preserve deprecated/legacy page implementations in `reference/routes/**` when useful for reuse.
3. Maintain backward-compatible redirects in `next.config.ts` when route contracts change.

## Realtime / Refresh Bug Triage Pattern

When status updates are stale or require refresh:

1. Verify source-of-truth parity (`bd show` vs app output).
2. Confirm read path prefers live BD data when needed.
3. Confirm watcher coverage for active project scope roots and relevant agent/message files.
4. Confirm SSE event flow and client subscription behavior across all active views.
5. Add regression tests for watcher/events behavior and scope switching.

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
8. Documentation drift:
   - Do not claim features in `README.md` that are not currently shipped, unless clearly labeled as roadmap.

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

<!-- BEGIN BEADS INTEGRATION -->
## Issue Tracking with bd (beads)

**IMPORTANT**: This project uses **bd (beads)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

**Check for ready work:**

```bash
bd ready --json
```

**Create new issues:**

```bash
bd create "Issue title" --description="Detailed context" -t bug|feature|task -p 0-4 --json
bd create "Issue title" --description="What this issue is about" -p 1 --deps discovered-from:bd-123 --json
```

**Claim and update:**

```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

**Complete work:**

```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `bd ready` shows unblocked issues
2. **Claim your task**: `bd update <id> --status in_progress`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked issue:
   - `bd create "Found bug" --description="Details about what was found" -p 1 --deps discovered-from:<parent-id>`
5. **Complete**: `bd close <id> --reason "Done"`

### Auto-Sync

bd automatically syncs with git:

- Exports to `.beads/issues.jsonl` after changes (5s debounce)
- Imports from JSONL when newer (e.g., after `git pull`)
- No manual export/import needed!

### Important Rules

- ✅ Use bd for ALL task tracking
- ✅ Always use `--json` flag for programmatic use
- ✅ Link discovered work with `discovered-from` dependencies
- ✅ Check `bd ready` before asking "what should I work on?"
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems

For more details, see README.md and docs/QUICKSTART.md.

## Data Backend & Platform Notes

BeadBoard reads issues from the Dolt SQL server (`bd`'s native backend since bd 0.56+). The Dolt server runs locally at `127.0.0.1:3307` and is started automatically by the `bd` daemon.

### Single-platform setups (most users)

- **WSL2 only**: frontend + `bd` + Dolt all in WSL2 → just works.
- **Windows only**: frontend + `bd` + Dolt all in Windows → just works.

### Mixed WSL2 + Windows (workaround required)

If you run the Next.js frontend in Windows PowerShell but `bd` / Dolt in WSL2 (or vice versa), `127.0.0.1` refers to different loopbacks and the frontend can't reach the Dolt server.

**Workaround**: enable WSL2 mirrored networking so `localhost` is shared between Windows and WSL2.

Create `C:\Users\<you>\.wslconfig`:
```ini
[wsl2]
networkingMode=mirrored
```

Then restart WSL2:
```powershell
wsl --shutdown
```

This is a one-time setup for mixed environments only. It is **not required** for single-platform contributors.

### How the read path works

BeadBoard (`src/lib/read-issues.ts`) queries Dolt SQL directly via `mysql2` (`src/lib/dolt-client.ts`). On every page load or SSE-triggered refresh:

1. `readIssuesFromDisk()` → tries `readIssuesViaDolt(projectRoot)` first
2. If Dolt unreachable → logs a warning and falls back to reading `issues.jsonl`

`issues.jsonl` is a **deprecated fallback** — no manual export step is required. The file is kept on disk by `bd` for git history, but BeadBoard does not rely on it when the Dolt server is running.

**SSE real-time updates**: `bd` touches `.beads/last-touched` on every write. Chokidar detects this change, triggers a snapshot diff, and fires an SSE event if anything changed — fetching fresh data from Dolt automatically.

<!-- END BEADS INTEGRATION -->
