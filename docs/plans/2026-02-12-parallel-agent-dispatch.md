# BeadBoard Parallel Agent Dispatch Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Run the next BeadBoard implementation phase in parallel with low merge risk, while preserving strict read/write boundaries (`issues.jsonl` read-only, writes only through `bd.exe`).

**Architecture:** Split work by subsystem with clear file ownership: registry persistence + API, scanner, and Kanban UI baseline. Keep each agent on dependency-safe beads and synchronize through an integration lead at checkpoints.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Node `fs`, Windows path utilities, React Query, Zustand.

---

## Parallelization Model

### Agent Roles

1. **Agent A (Registry/API Track)**
- Primary beads: `bb-6aj.1`, then `bb-6aj.2`
- Scope: profile-scoped project registry + API endpoints for add/remove/list
- Files expected:
  - `src/lib/registry.ts`
  - `src/app/api/projects/route.ts`
  - tests under `tests/lib/` and `tests/api/`

2. **Agent B (Kanban UI Track)**
- Primary beads: `bb-trz.1`, then `bb-trz.2`, then `bb-trz.3`, then `bb-trz.4`
- Scope: tracer bullet 1 Kanban baseline (demo-inspired UI with production typing)
- Files expected:
  - `src/app/page.tsx`
  - `src/components/kanban/*`
  - `src/components/shared/*`
  - UI tests under `tests/`

3. **Agent C (Scanner Track)**
- Primary beads: `bb-6aj.3`, then `bb-6aj.3.1` (optional if time remains)
- Scope: bounded scanner rooted at `%USERPROFILE%` with explicit full-drive opt-in mode
- Files expected:
  - `src/lib/scanner.ts`
  - `src/app/api/scan/route.ts` (if created in this phase)
  - tests under `tests/lib/`

4. **Lead Agent (Integrator/Verifier)**
- No primary feature bead; owns integration + verification
- Scope: merges, resolves small conflicts, runs checks, updates bead states

---

## Dependency Rules (Do Not Break)

1. `bb-6aj.2` must start only after `bb-6aj.1` is complete (hard dependency).
2. `bb-6aj.3` depends on `bb-6aj.1` (hard dependency).
3. `bb-trz.2` depends on `bb-trz.1`.
4. `bb-trz.3` and `bb-trz.4` depend on `bb-trz.2`.
5. No direct writes to `.beads/issues.jsonl` under any condition.

---

## Checkpoint Sequence

### Checkpoint 0: Branch Preparation
1. Create feature branches from current baseline:
- `feat/registry-api`
- `feat/kanban-baseline`
- `feat/scanner`
2. Each agent works only in its branch.

### Checkpoint 1: Foundation Delivery
1. Agent A finishes `bb-6aj.1`.
2. Agent B finishes `bb-trz.1`.
3. Agent C remains blocked until `bb-6aj.1` closes, then starts `bb-6aj.3`.
4. Lead verifies:
- `npm run typecheck`
- `npm run test`

### Checkpoint 2: Mid-Phase Delivery
1. Agent A completes `bb-6aj.2`.
2. Agent B completes `bb-trz.2`.
3. Agent C completes `bb-6aj.3`.
4. Lead rebases/merges and reruns:
- `npm run typecheck`
- `npm run test`
- `npm run dev` (startup sanity)

### Checkpoint 3: Tracer-1 Completion
1. Agent B completes `bb-trz.3` and `bb-trz.4`.
2. Lead runs manual UI smoke for Kanban baseline.
3. Lead optionally uses browser automation for verification once app is up.

---

## Agent Prompt Pack

### Prompt: Agent A (Registry/API)

```text
You are Agent A on BeadBoard.

Mission:
1) Complete bb-6aj.1
2) Complete bb-6aj.2

Constraints:
- Windows-native paths only
- Persist registry at %USERPROFILE%\.beadboard\projects.json
- Normalize paths safely (no Unix assumptions)
- No direct writes to .beads/issues.jsonl
- Maintain strict TS types and add tests

Deliverables:
- src/lib/registry.ts (or equivalent)
- src/app/api/projects/route.ts with add/remove/list
- tests covering malformed paths, duplicate normalization, lazy file creation
- bead updates with concise implementation notes

Verification before close:
- npm run typecheck
- npm run test
```

### Prompt: Agent B (Kanban Baseline)

```text
You are Agent B on BeadBoard.

Mission:
1) Complete bb-trz.1
2) Complete bb-trz.2
3) Complete bb-trz.3
4) Complete bb-trz.4

Constraints:
- Rebuild demo style as production Next.js/TS components
- Use real parser data path, no sample-data-only architecture
- Preserve status ordering: open, in_progress, blocked, deferred, closed
- Read boundary only; all writes are future bd bridge work
- Keep components modular and typed

Deliverables:
- Kanban columns
- Card component with id/priority/type/labels/assignee/dep count
- Detail panel with timestamps/dependencies
- Search/filter/stats controls
- tests for rendering and filtering behavior

Verification before close:
- npm run typecheck
- npm run test
- npm run dev (manual check of kanban page)
```

### Prompt: Agent C (Scanner)

```text
You are Agent C on BeadBoard.

Mission:
1) Complete bb-6aj.3
2) Optionally complete bb-6aj.3.1 if time permits

Constraints:
- Default scan root is %USERPROFILE%, not full-drive crawl
- Implement bounded recursion and ignore patterns
- Explicit full-drive scan must be opt-in only
- Windows-safe path normalization throughout
- No shell-specific assumptions

Deliverables:
- src/lib/scanner.ts
- optional scan API route if needed for invoking scanner
- tests for depth limit, ignore behavior, and root selection

Verification before close:
- npm run typecheck
- npm run test
```

### Prompt: Lead Agent (Integration)

```text
You are Lead Agent for BeadBoard integration.

Mission:
1) Integrate outputs from Agent A/B/C at checkpoints
2) Keep bead statuses accurate
3) Run verification and capture failures with file-level notes

Rules:
- Do not mask failing tests
- Resolve merge conflicts without changing boundary contracts
- Ensure no direct writes to .beads/issues.jsonl

Verification gates:
- npm run typecheck
- npm run test
- npm run dev startup check

Completion condition:
- Tracer bullet 1 Kanban baseline visible and functional
- Registry + scanner foundations merged and passing checks
```

---

## First Task to Start Now

1. Start **Agent A** on `bb-6aj.1` (unblocks both `bb-6aj.2` and `bb-6aj.3`).
2. In parallel, start **Agent B** on `bb-trz.1`.
3. Start **Agent C** only after `bb-6aj.1` is closed.

---

## Run Commands (Lead)

```powershell
# show ready tasks
bd ready

# claim task
bd update bb-6aj.1 --claim

# run verification
npm run typecheck
npm run test
npm run dev
```

