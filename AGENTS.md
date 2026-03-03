# Agent Operating Manual (BeadBoard)

Execution-first, evidence-first, beads-driven.

## Core Rules

0. Memory lives in `bd` decision beads, not markdown files. See **Native Memory Workflow** below.
1. **Bead naming format is MANDATORY**: `beadboard-<epic>.x.x` for tasks and subtasks.
   - Example: `beadboard-05a.1` (task under epic beadboard-05a), `beadboard-05a.1.1` (subtask)
   - **WHY**: Tasks without parent-child relationships to an epic are ORPHANS and will NOT appear in the left panel navigation.
   - Always run `bd dep relate <epic-id> <task-id> --type parent-child` after creating a task bead.
2. Working directory: `codex/beadboard`. Run all `bd` and `npm` commands from here.
3. `bd` is the source of truth for work state. No direct writes to `.beads/issues.jsonl`.
4. **"yo" / "what's up" / any greeting** → run `bd query "status=closed" --sort closed --reverse --limit 10` and `bd ready`, then suggest the next bead.
5. Evidence before assertions: never claim fixed/passing/done without fresh command output.
6. Keep user-facing labels and UI copy simple and explicit.
6. Reuse shared code paths/components; avoid one-off logic drift across views.
7. BeadBoard is a multi-agent coordination system first. Optimize for swarm execution clarity over cosmetics.
8. Runtime UI is query-driven from `/` (`view=social|graph`). Do not reintroduce App Router page sprawl without approval.
9. Keep the active page surface minimal under `src/app`. Maintain backward-compatible redirects in `next.config.ts` when route contracts change.

## Craft Standards

- **Demand Elegance**: For non-trivial changes, ask "is there a more elegant way?" before presenting. Skip for simple, obvious fixes.
- **Autonomous Bug Fixes**: When given a bug report, diagnose and fix it. Point at evidence (logs, tests, diffs) — don't ask for hand-holding.
- **Learn from Corrections**: After any user correction, create or supersede a `mem-canonical` decision bead capturing the pattern so the mistake isn't repeated.

## Agent Identity (Required)

Every agent — orchestrator or worker — must have an agent bead before claiming any work.

1. **On session start**, create your agent bead:
   ```bash
   bd create --title="Agent: <role-name>" --description="<what this agent does>" --type=task --priority=0 --label="gt:agent,role:<orchestrator|ui|graph|backend|infra>"
   ```
2. **When claiming work**, always include `--assignee`:
   ```bash
   bd update <task-id> --status in_progress --assignee <your-agent-bead-id>
   ```
3. **When dispatching sub-agents**, their prompt must include:
   - Step 1: create their own `gt:agent` bead
   - Every `bd update --status in_progress` must include `--assignee <their-bead-id>`

Agent presence in the UI (liveness dots, graph node overlays) depends on assignee fields being populated.

## Agent Workflow

```bash
# 1. Read memory
bd show beadboard-116 beadboard-60a beadboard-zas   # hard rules

# 2. Find work
bd ready
bd show <id>                                         # read full spec + acceptance criteria

# 3. Create your agent bead (if not already done this session)
bd create --title="Agent: <role>" --type=task --priority=0 --label="gt:agent,role:<role>"

# 4. Claim
bd update <id> --status in_progress --assignee <your-agent-bead-id>

# 5. Implement (TDD: write failing test first, then code)

# 6. Verify
npm run typecheck && npm run lint && npm run test

# 7. Record evidence + close
bd update <id> --notes "<commands run and their output>"
bd close <id> --reason "<what was completed>"

# 8. Memory review
# If reusable lesson → create/supersede canonical memory node
# If no lesson → bd update <id> --notes "Memory review: no new reusable memory."

# 9. Sync
bd dolt pull && bd dolt push
```

**Wrong flags to avoid:**
- `bd close` does not support `--notes` — update first, then close
- `bd create` uses `--label` not `--labels`

## Native Memory Workflow (Required)

Memory source-of-truth is `bd` + Dolt history. Canonical memories are `type=decision` beads.

**Labels:** `mem-canonical, mem-hard|mem-soft, memory, memory-<domain>`

**Domain anchors:**
| Anchor | Domain |
|---|---|
| `beadboard-76p` | Architecture |
| `beadboard-nq9` | Workflow Protocol |
| `beadboard-5r1` | Agent Operations |
| `beadboard-fld` | UI/UX |
| `beadboard-8st` | Reliability & Errors |

**Key canonical memories (read at session start):**
- `beadboard-116` — [HARD] Evidence before completion claims
- `beadboard-60a` — [HARD] Dependencies model execution order
- `beadboard-zas` — [HARD] Shared logic for cross-view behavior
- `beadboard-dvp` — [SOFT] Parallelize independent work
- `beadboard-6fv` — [HARD] Triage stale-state via parity + watcher checks

**Creating a canonical memory:**
```bash
bd create --title="[MEMORY][DOMAIN][HARD|SOFT] Rule" \
  --description="Scope: ...\nOut of Scope: ...\nRule: ...\nRationale: ...\nFailure Mode: ..." \
  --type=decision --priority=1 \
  --label="mem-canonical,mem-hard,memory,memory-<domain>"
bd dep relate <anchor-id> <memory-id>          # link to domain anchor
bd dep relate <memory-id> <source-bead-id>     # link to 2–5 evidence beads
```

**Rules:**
1. Memory indexing uses `bd dep relate`, not blocker edges.
2. Memory evolution uses `bd supersede <old> --with <new>`; do not rewrite history.
3. Fresh agents validate provenance: `bd show <memory-id>` + `bd dep list <memory-id>`.
4. Apply noise budget from `help/memory/schema_and_noise_budget.txt` before adding nodes.

## Bead Prompting Standard

1. Follow `docs/protocols/bead-prompting.md` when creating or rewriting bead details.
2. Descriptions are model-facing prompts, not prose notes.
3. Every bead needs explicit `Scope`, `Out of Scope`, and `Success Criteria`.
4. Dependency flow must be minimal and execution-correct.

## Dependency Discipline

1. Dependencies model execution order, not visual order.
2. If a bead is parallelizable, do not chain it unnecessarily.
3. After closing a bead, run `bd ready` to confirm what's now unblocked.

## Test-First Implementation

1. Write the failing test first. Run it. Confirm the right failure reason.
2. Implement the smallest code to pass.
3. Re-run focused tests, then full gates.
4. New test files must be added to the `test` script in `package.json` — the suite is explicitly enumerated.

## Verification Gates (Required)

Run before closing any bead that changes code:

```bash
npm run typecheck
npm run lint
npm run test
```

**Non-negotiable:** Never claim done/passing/fixed/closed without running these in the current session and citing their output.

## Parallel Agent Pattern

1. Parent agent owns orchestration and integration.
2. Worker agent owns one bead only — claims it, tests it, verifies it, closes it.
3. Worker reports exact files changed and command output.
4. Parent re-verifies full repo gates before final status claims.
5. Keep diffs scoped to intended files; include test files with feature/bugfix code; do not mix unrelated cleanup in the same bead.

## Realtime / Refresh Bug Triage

When status updates are stale or require refresh:

1. Verify source-of-truth parity (`bd show` vs app output).
2. Confirm read path prefers live Dolt data.
3. Confirm watcher coverage: DB + WAL + `.beads/last-touched`.
4. Confirm SSE event flow and client subscription across all active views.
5. Add regression tests for watcher/events behavior.

## Common Failure Patterns (Do Not Repeat)

1. **Wrong `bd` flags**: `bd close` has no `--notes`; update first then close.
2. **Premature completion**: never close before running fresh typecheck + lint + test.
3. **Scope creep in parallel work**: worker agents touch only their assigned files.
4. **Dependency direction mistakes**: validate blockers/ready semantics before changing status logic.
5. **Duplicate fixes across views**: centralize shared logic; do not patch one surface only.
6. **Stale realtime assumptions**: confirm watcher inputs include DB + WAL + touch markers.
7. **Missing test registration**: new test files must be in the `npm run test` script.
8. **Documentation drift**: do not claim features in `README.md` that are not shipped.

## Session Completion (Landing the Plane)

1. Create beads for remaining follow-ups.
2. Run quality gates if code changed.
3. Update/close beads with notes and evidence.
4. Memory review: create/supersede canonical nodes for reusable lessons, or note "Memory review: no new reusable memory."
5. Update `NEXT_SESSION_PROMPT.md` with: what changed, what is verified, open risks, exact next bead(s), skills used, memory nodes created.
6. Sync:
   ```bash
   bd dolt pull && bd dolt push
   git add -p && git commit -m "..." && git push
   ```

## Data Backend & Platform Notes

Dolt SQL server at `127.0.0.1:3307`. Read path: `readIssuesViaDolt()` → Dolt (primary), falls back to `issues.jsonl` if unreachable. SSE real-time: `bd` touches `.beads/last-touched` on every write → Chokidar fires → SSE event.

**Mixed WSL2 + Windows**: if frontend and `bd` run on different platforms, enable mirrored networking:
```
# C:\Users\<you>\.wslconfig
[wsl2]
networkingMode=mirrored
```
Then `wsl --shutdown`. Not required for single-platform setups.
