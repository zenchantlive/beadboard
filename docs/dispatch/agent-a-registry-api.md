# Agent A Dispatch: Registry/API

## Branch + Worktree
- Branch: `feat/registry-api`
- Worktree: `C:\Users\Zenchant\codex\beadboard\.worktrees\agent-a`

## Beads
- `bb-6aj.1` (in_progress, assignee `agent-a`)
- `bb-6aj.2` (open, assignee `agent-a`) after `bb-6aj.1` closes

## Scope
- Implement registry persistence at `%USERPROFILE%\.beadboard\projects.json`
- Implement projects API route for add/remove/list
- Windows-safe normalization only

## File Ownership
- `src/lib/registry.ts`
- `src/app/api/projects/route.ts`
- `tests/lib/registry.test.ts`
- `tests/api/projects-route.test.ts`

## Hard Constraints
- Never write directly to `.beads/issues.jsonl`
- No Unix-only assumptions
- Validate and normalize project paths consistently

## Verification
```powershell
npm run typecheck
npm run test
```

