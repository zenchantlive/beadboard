# Parallel Launch Order

## 1) Start Agent A + Agent B in Parallel

Terminal A:
```powershell
cd C:\Users\Zenchant\codex\beadboard\.worktrees\agent-a
```
Use prompt: `docs/dispatch/agent-a-registry-api.md`

Terminal B:
```powershell
cd C:\Users\Zenchant\codex\beadboard\.worktrees\agent-b
```
Use prompt: `docs/dispatch/agent-b-kanban.md`

## 2) Start Agent C After Registry Persistence Completes

Terminal C:
```powershell
cd C:\Users\Zenchant\codex\beadboard\.worktrees\agent-c
```
Use prompt: `docs/dispatch/agent-c-scanner.md`

## 3) Integration Gate

From root `C:\Users\Zenchant\codex\beadboard`:
```powershell
npm run typecheck
npm run test
```

