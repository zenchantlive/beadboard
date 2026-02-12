# Agent B Dispatch: Tracer Bullet 1 Kanban

## Branch + Worktree
- Branch: `feat/kanban-baseline`
- Worktree: `C:\Users\Zenchant\codex\beadboard\.worktrees\agent-b`

## Beads
- `bb-trz.1` (in_progress, assignee `agent-b`)
- `bb-trz.2` (in_progress, assignee `agent-b`)
- `bb-trz.3` (in_progress, assignee `agent-b`)
- `bb-trz.4` (in_progress, assignee `agent-b`)

## Scope
- Deliver tracer bullet 1 baseline:
  - status columns (`open`, `in_progress`, `blocked`, `deferred`, `closed`)
  - bead cards (priority/type/labels/assignee/dependency count)
  - detail panel
  - search/filter/stats controls
- Use real read path (`.beads/issues.jsonl`) from server layer, not demo-only data

## File Ownership
- `src/app/page.tsx`
- `src/components/kanban/*`
- `src/components/shared/*`
- `src/lib/kanban.ts`
- `src/lib/read-issues.ts`
- `tests/lib/kanban.test.ts`

## Hard Constraints
- Read boundary only for this phase
- No write path to JSONL
- Keep Windows-safe path handling in read layer

## Verification
```powershell
npm run typecheck
npm run test
npm run dev
```

