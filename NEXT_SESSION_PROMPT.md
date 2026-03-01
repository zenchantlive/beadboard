# Next Session: Dolt Direct SQL Integration (beadboard-550)

## What This Session Accomplished

This session completed **Phase 0** and **Phase 1** of the UX redesign PRD, then pivoted to a more important infrastructure fix: replacing the stale `issues.jsonl` read path with direct Dolt SQL queries.

### Phase 0 + 1 (done, committed as `7d37d02` and `a2e523b`)
- `unified-shell.tsx`: wired `blockedOnly` to SocialPage, TopBar with live counts
- `thread-drawer.tsx`: dynamic status instead of hardcoded "In Progress"
- `social-page.tsx`: fixed `onJumpToActivity` dead URL
- `contextual-right-panel.tsx`: added `taskId` branch (ThreadDrawer embedded) and `swarmId` branch (MissionInspector via SwarmIdBranch inner component)
- `AGENTS.md`: documented WSL2 mirrored networking workaround for mixed environments

### Why we pivoted to beadboard-550
The frontend reads `issues.jsonl` as its data source, but `bd` in dolt-native mode writes to a Dolt SQL server (`127.0.0.1:3307`). In mixed WSL2+Windows environments (and whenever Windows `bd` fails with a CGO error), the JSONL gets stale and the frontend shows outdated data.

The right fix: **BeadBoard connects to Dolt directly via `mysql2`** — same MySQL wire protocol, no CGO needed, no sync step, and it unlocks Dolt's time-travel version history for future history/audit views.

---

## Active Epic: beadboard-550

```
bd show beadboard-550
```

**4 sequential child tasks:**

| Bead | Status | What |
|---|---|---|
| `beadboard-550.1` | in_progress (mysql2 installed, bead claimed) | Install mysql2, create `src/lib/dolt-client.ts` |
| `beadboard-550.2` | blocked on 550.1 | `readIssuesViaDolt()` — JOIN issues+deps+labels |
| `beadboard-550.3` | blocked on 550.2 | Wire Dolt as primary path in `readIssuesFromDisk()` |
| `beadboard-550.4` | blocked on 550.3 | Verify SSE/watcher still fires, remove manual export from AGENTS.md |

---

## Session Start Protocol

```bash
cd /mnt/c/Users/Zenchant/codex/beadboard
bd show beadboard-550.1   # read the full spec
bd ready                  # confirm 550.1 is the only unblocked task
npm run typecheck         # baseline should pass (pre-existing status-badge error is expected)
```

---

## Key Technical Context

### Dolt schema (confirmed this session)

The Dolt server runs at `127.0.0.1:3307`, database `beadboard`. Key tables:

- **`issues`** — main table, all fields including `metadata` (JSON column), `status`, `issue_type`, `priority`, `close_reason`, etc.
- **`dependencies`** — `(issue_id, depends_on_id, type, created_at, created_by)` — maps to `BeadDependency[]`
- **`labels`** — `(issue_id, label)` — maps to `string[]`

Connection config lives in `.beads/metadata.json`:
```json
{
  "database": "dolt",
  "dolt_server_port": 3307,
  "dolt_database": "beadboard",
  "backend": "dolt"
}
```
Host defaults to `127.0.0.1` (not in metadata.json).

### Current read path (what to replace)

`src/app/page.tsx` calls `readIssuesForScope({ preferBd: true })`:
1. `preferBd: true` → `readIssuesViaBd()` → runs `bd list --all --json` via CLI → works in WSL2, fails in Windows (CGO error)
2. Falls back to `readIssuesFromDisk()` → reads `issues.jsonl` → stale

Target: replace step 1 with `readIssuesViaDolt()` → `mysql2` → always works regardless of platform.

### BeadIssue shape (what mysql2 rows must normalize to)

See `src/lib/types.ts` for the full `BeadIssue` interface. Key fields:
- `id`, `title`, `description`, `status`, `priority`, `issue_type`
- `labels: string[]` — from `labels` table
- `dependencies: BeadDependency[]` — from `dependencies` table
- `created_at`, `updated_at`, `closed_at` — ISO strings (Dolt returns Date objects from mysql2)
- `metadata: Record<string, unknown>` — Dolt stores as JSON column, mysql2 auto-parses to object

### normalizeBdIssue() already exists

`src/lib/read-issues.ts` has `normalizeBdIssue()` which handles the JSON→BeadIssue mapping from `bd list --json` output. The Dolt SQL rows will have the same field names, so reuse this function (or factor it out) for 550.2.

### SSE / watcher (concern for 550.4)

`src/lib/watcher.ts` watches `.beads/issues.jsonl` + `.beads/last_touched` for changes and fires SSE events. Need to check whether `bd` still updates `last_touched` when writing to Dolt — if yes, watcher fires correctly and no change needed. If no, need a lightweight poll.

---

## Skills to Use

This is an implementation task — use the standard hyperpowers workflow:

```
hyperpowers:executing-plans  — execute one task at a time, STOP after each
hyperpowers:test-driven-development — write test before implementation
hyperpowers:verification-before-completion — run typecheck+lint+test before closing any bead
```

Per `hyperpowers:executing-plans`: execute ONE bead, verify, close it, STOP for user review, then run `/hyperpowers:execute-plan` again to continue.

---

## Files to Read Before Starting

```
src/lib/read-issues.ts          — current read path, normalizeBdIssue(), readIssuesViaBd()
src/lib/types.ts                — BeadIssue, BeadDependency interfaces
src/lib/bridge.ts               — runBdCommand (the CLI path being replaced)
src/app/page.tsx                — how preferBd: true is called
.beads/metadata.json            — Dolt connection config
```

---

## Verification Gates (every bead before closing)

```bash
npm run typecheck && npm run lint && npm run test
```

Pre-existing known failure: `status-badge.tsx TS2307: Cannot find module '@/lib/types'` — ignore, it predates this work.

---

## What Comes After beadboard-550

The UX phases (Phase 2–5) are still waiting:
- **Phase 2** (`beadboard-0fi`) — operator identity (now unblocked since Phase 1 closed)
- **Phase 3** (`beadboard-8ij`) — coordination layer
- **Phase 4** (`beadboard-x3l`) — agent presence
- **Phase 5** (`beadboard-d2x`) — blocked triage modal

But those have lower urgency than 550 (data infrastructure correctness > UI features).

---

## Platform Note (WSL2 + Windows)

The Dolt server runs in WSL2 at `127.0.0.1:3307`. If the frontend runs in Windows PowerShell, enable WSL2 mirrored networking first (one-time):

```
C:\Users\<you>\.wslconfig:
[wsl2]
networkingMode=mirrored
```

Then `wsl --shutdown`. Not required for single-platform setups. See `AGENTS.md` Data Backend section for full details.
