# BeadBoard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Windows-native Beads dashboard that reads `.beads/issues.jsonl` directly and performs all mutations through `bd.exe`.

**Architecture:** The app uses Next.js App Router APIs for filesystem reads, project scanning, watcher lifecycle, SSE broadcasting, and CLI mutation bridging. Frontend uses React Query for server-state synchronization and Zustand for UI-local state plus optimistic transition coordination. Windows path normalization is centralized and enforced at all boundaries to prevent cross-drive and casing inconsistencies.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS, Zustand, TanStack Query, chokidar, React Flow, `child_process.execFile`.

---

### Task 1: Repository Bootstrap and Runtime Guardrails

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `LICENSE`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Step 1: Write failing environment checks**
- Add a smoke test placeholder for app boot and runtime config verification.

**Step 2: Run verification to confirm missing implementation**
- Run: `npm run test` (expected to fail before setup).

**Step 3: Implement minimal app bootstrap**
- Initialize Next.js 15 + React 19 + TypeScript strict setup.
- Add MIT license file.

**Step 4: Re-run checks**
- Run: `npm run lint` and `npm run typecheck`.

**Step 5: Commit**
- Commit message: `chore: bootstrap beadboard foundation`

### Task 2: Canonical Types and JSONL Parser

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/parser.ts`
- Create: `tests/lib/parser.test.ts`

**Step 1: Write failing parser tests**
- Cover defaults, malformed lines, tombstone filtering, `priority=0` preservation.

**Step 2: Run targeted test**
- Run: `npm run test -- tests/lib/parser.test.ts` (expected fail).

**Step 3: Implement parser + DTO normalization**
- Parse one JSON object per line, skip malformed lines, apply defaults.

**Step 4: Run tests**
- Run parser tests and full typecheck.

**Step 5: Commit**
- Commit message: `feat: add beads schema and robust jsonl parser`

### Task 3: Windows Pathing + Project Registry

**Files:**
- Create: `src/lib/pathing.ts`
- Create: `src/lib/projects-registry.ts`
- Create: `src/app/api/projects/route.ts`
- Test: `tests/lib/pathing.test.ts`

**Step 1: Write failing path tests**
- Validate canonicalization for `C:\` and `D:\`, stable key generation.

**Step 2: Implement path utility + registry persistence**
- Use `%USERPROFILE%\\.beadboard\\projects.json` as registry location.

**Step 3: Implement API route**
- Support add/list/remove with validation and normalized identity.

**Step 4: Verify**
- Run path tests + API handler tests.

**Step 5: Commit**
- Commit message: `feat: add windows path normalization and project registry`

### Task 4: Read API and Multi-Project Aggregation

**Files:**
- Create: `src/app/api/beads/route.ts`
- Create: `src/lib/read-service.ts`
- Test: `tests/api/beads-route.test.ts`

**Step 1: Write failing API tests**
- Single project read, aggregate read, filter params, error behavior.

**Step 2: Implement read service**
- Read `.beads/issues.jsonl` directly via `fs`.

**Step 3: Implement route layer**
- Query support for project, status, type, priority, assignee, label.

**Step 4: Verify**
- Run route tests and typecheck.

**Step 5: Commit**
- Commit message: `feat: add beads read api for single and aggregate views`

### Task 5: Scanner and Discovery Controls

**Files:**
- Create: `src/lib/scanner.ts`
- Create: `src/app/api/scan/route.ts`
- Test: `tests/lib/scanner.test.ts`

**Step 1: Write failing scanner tests**
- Depth limits, ignore patterns, profile-root default behavior.

**Step 2: Implement scanner**
- Default root `%USERPROFILE%`, plus user-added roots.
- Add explicit full-drive mode action.

**Step 3: Implement scan API**
- Trigger scan + return discovered project candidates.

**Step 4: Verify**
- Run scanner tests.

**Step 5: Commit**
- Commit message: `feat: add windows-safe project scanner and scan api`

### Task 6: Watcher + SSE Event Bus

**Files:**
- Create: `src/lib/watcher.ts`
- Create: `src/lib/sse-bus.ts`
- Create: `src/app/api/events/route.ts`
- Test: `tests/lib/watcher.test.ts`

**Step 1: Write failing watcher tests**
- Debounced change emission, lock retry behavior, multi-project handling.

**Step 2: Implement watcher manager**
- Chokidar watchers for registered projects.

**Step 3: Implement SSE endpoint**
- Heartbeat, reconnect-safe events, project-scoped payloads.

**Step 4: Verify**
- Run watcher/event tests.

**Step 5: Commit**
- Commit message: `feat: add live file watching and sse updates`

### Task 7: bd.exe Mutation Bridge + API

**Files:**
- Create: `src/lib/bd-bridge.ts`
- Create: `src/app/api/mutate/route.ts`
- Test: `tests/lib/bd-bridge.test.ts`

**Step 1: Write failing bridge tests**
- Command invocation, cwd routing, stdout/stderr error mapping.

**Step 2: Implement execFile bridge**
- Resolve `bd.exe` from PATH, enforce project CWD, parse outputs.

**Step 3: Implement mutate API**
- `create`, `update`, `close`, `reopen`, `comment` actions.

**Step 4: Verify**
- Run bridge tests and mutation route tests.

**Step 5: Commit**
- Commit message: `feat: add bd cli mutation bridge and api`

### Task 8: Frontend State and Realtime Sync

**Files:**
- Create: `src/lib/query-client.ts`
- Create: `src/lib/store.ts`
- Create: `src/lib/sse-client.ts`
- Modify: `src/app/layout.tsx`

**Step 1: Write failing state tests**
- Query invalidation + optimistic rollback cases.

**Step 2: Implement Query + Zustand providers**
- Distinguish server cache from UI-local state.

**Step 3: Implement SSE client integration**
- Auto reconnect and scoped invalidation for changed projects.

**Step 4: Verify**
- Run state/integration tests.

**Step 5: Commit**
- Commit message: `feat: wire react-query zustand and realtime invalidation`

### Task 9: Feature Views (Kanban, Graph, Timeline, Sessions)

**Files:**
- Create: `src/components/kanban/*`
- Create: `src/components/graph/*`
- Create: `src/components/timeline/*`
- Create: `src/components/agents/*`
- Create: `src/app/graph/page.tsx`
- Create: `src/app/timeline/page.tsx`
- Create: `src/app/agents/page.tsx`

**Step 1: Write failing UI tests**
- Column rendering, card detail open, graph node interaction, timeline grouping.

**Step 2: Implement Kanban baseline**
- Columns, card metadata, details panel, filters/stats.

**Step 3: Implement Graph with React Flow**
- Edges from dependencies, pan/zoom/select, blocked-chain highlighting.

**Step 4: Implement Timeline + Session views**
- Derived activity and session grouping/metrics.

**Step 5: Verify**
- Run component tests and visual smoke check.

**Step 6: Commit**
- Commit message: `feat: deliver dashboard views for kanban graph timeline and sessions`

### Task 10: Quality Gates and Boundary Enforcement

**Files:**
- Create: `tests/guards/no-direct-jsonl-write.test.ts`
- Create: `docs/architecture/read-write-boundary.md`
- Modify: `package.json`

**Step 1: Write failing guard test**
- Detect direct writes to `.beads/issues.jsonl` in application code.

**Step 2: Implement boundary guard tooling**
- Add CI script and local verification command.

**Step 3: Add performance checks**
- Parser benchmark and SSE latency smoke measurements.

**Step 4: Verify full pipeline**
- Run `npm run lint && npm run typecheck && npm run test`.

**Step 5: Commit**
- Commit message: `chore: enforce read-write boundaries and quality gates`

## Execution Sequence and Parallelization
- Sequential core chain: Task 1 -> Task 2 -> Task 3 -> Task 4 -> Task 6 -> Task 7 -> Task 8
- Parallel branch A (after Task 3): Task 5
- Parallel branch B (after Task 4 and Task 8): Task 9
- Final gate: Task 10

## Completion Criteria
- Windows-native workflow validated in PowerShell/CMD
- Reads from JSONL only
- Mutations executed only via `bd.exe`
- Real-time updates delivered via SSE
- Kanban, Graph, Timeline, Agent Session views functional
- Boundary guard test prevents direct JSONL writes
