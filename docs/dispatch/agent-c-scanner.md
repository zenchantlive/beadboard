# Agent C Dispatch: Scanner

## Branch + Worktree
- Branch: `feat/scanner`
- Worktree: `C:\Users\Zenchant\codex\beadboard\.worktrees\agent-c`

## Beads
- `bb-6aj.3` (open, assignee `agent-c`) start only after `bb-6aj.1` closure
- `bb-6aj.3.1` optional follow-up

## Scope
- Scanner rooted to `%USERPROFILE%` by default
- Bounded recursion and ignore patterns
- Full-drive (`C:\`, `D:\`) scan must be explicit opt-in only

## File Ownership
- `src/lib/scanner.ts`
- `src/app/api/scan/route.ts` (if needed)
- `tests/lib/scanner.test.ts`

## Hard Constraints
- No default full-drive crawl
- No Unix-only shell assumptions
- Keep path normalization consistent

## Verification
```powershell
npm run typecheck
npm run test
```

