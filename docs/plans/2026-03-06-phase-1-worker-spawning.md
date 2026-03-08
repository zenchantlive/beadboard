# Phase 1: Worker Agent Spawning

**Date:** 2026-03-06
**Status:** Ready for implementation
**PRD Reference:** `docs/plans/2026-03-05-embedded-pi-prd.md`
**Roadmap Reference:** `docs/plans/2026-03-05-embedded-pi-roadmap.md`

---

## Goal

Enable the orchestrator Pi to spawn real worker Pi instances for parallel task execution.

This is the biggest gap between "embedded chat" and "true BeadBoard execution substrate."

---

## Current State

- One orchestrator Pi per project (working)
- Orchestrator can receive prompts and execute tools
- BeadBoard tools exist: `bb_dolt_read`, `bb_mailbox`, `bb_presence`, `bb_deviation`
- Runtime events flow to frontend via SSE
- Left panel shows orchestrator chat

---

## Target State

- Orchestrator can spawn worker Pi instances
- Each worker has isolated session/context
- Workers execute tasks independently
- Worker status/progress visible in UI
- Worker results merge back to orchestrator

---

## Architecture

### Session Model

```
Project
├── Orchestrator Session (long-lived)
│   └── Spawns workers, coordinates, reviews results
│
├── Worker Session 1 (task-scoped, ephemeral)
│   └── Executes specific task, reports back
│
├── Worker Session 2 (task-scoped, ephemeral)
│   └── Executes specific task, reports back
│
└── Worker Session N...
```

### Key Distinctions

| Aspect | Orchestrator | Worker |
|--------|--------------|--------|
| Lifetime | Long-lived (project-scoped) | Ephemeral (task-scoped) |
| Context | Full project context | Task-specific context |
| Tools | All tools + spawn tool | Subset (no spawn) |
| Status | Always visible | Visible while running |
| Session | Reused across prompts | Created per task, destroyed on completion |

---

## Implementation Tasks

### Task 1: Worker Session Manager

**File:** `src/lib/worker-session-manager.ts`

**Purpose:** Manage worker Pi session lifecycle separate from orchestrator.

**What to build:**
```typescript
interface WorkerSession {
  id: string;
  projectId: string;
  taskId: string;
  status: 'spawning' | 'working' | 'completed' | 'failed';
  session: any; // Pi SDK session
  createdAt: string;
  completedAt: string | null;
  result: string | null;
  error: string | null;
}

class WorkerSessionManager {
  private workers = new Map<string, WorkerSession>();
  
  async spawnWorker(params: {
    projectRoot: string;
    taskId: string;
    taskContext: string;
    archetype?: string;
  }): Promise<WorkerSession>;
  
  getWorker(workerId: string): WorkerSession | undefined;
  listWorkers(projectRoot: string): WorkerSession[];
  terminateWorker(workerId: string): Promise<void>;
  waitForWorker(workerId: string): Promise<string>;
}
```

**Test file:** `tests/lib/worker-session-manager.test.ts`

**Commands:**
```bash
cd /home/clawdbot/clawd/repos/beadboard
touch src/lib/worker-session-manager.ts
touch tests/lib/worker-session-manager.test.ts
```

---

### Task 2: Worker Spawning Tool

**File:** `src/tui/tools/bb-spawn-worker.ts`

**Purpose:** Tool that orchestrator calls to spawn a worker.

**What to build:**
```typescript
import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';

export function createSpawnWorkerTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_spawn_worker',
    label: 'Spawn Worker Agent',
    description: 'Spawn a worker agent to execute a specific task in parallel. The worker will work independently and report back results.',
    parameters: Type.Object({
      task_id: Type.String({ description: 'The ID of the task for the worker to work on' }),
      task_context: Type.String({ description: 'Context/instructions for the worker' }),
      archetype: Type.Optional(Type.String({ description: 'Optional archetype for worker behavior (e.g., "coder", "reviewer", "tester")' })),
    }),
    async execute(_toolCallId, params: any) {
      // 1. Validate task exists
      // 2. Spawn worker session via WorkerSessionManager
      // 3. Emit worker.spawned event
      // 4. Return worker ID and status
    },
  };
}
```

**Test file:** `tests/tui/tools/bb-spawn-worker.test.ts`

**Commands:**
```bash
cd /home/clawdbot/clawd/repos/beadboard
touch src/tui/tools/bb-spawn-worker.ts
touch tests/tui/tools/bb-spawn-worker.test.ts
```

---

### Task 3: Worker Status Tool

**File:** `src/tui/tools/bb-worker-status.ts`

**Purpose:** Tool for orchestrator to check worker status.

**What to build:**
```typescript
export function createWorkerStatusTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_worker_status',
    label: 'Check Worker Status',
    description: 'Check the status of a spawned worker agent.',
    parameters: Type.Object({
      worker_id: Type.String({ description: 'The ID of the worker to check' }),
    }),
    async execute(_toolCallId, params: any) {
      // Return worker status, progress, result (if completed)
    },
  };
}
```

**Test file:** `tests/tui/tools/bb-worker-status.test.ts`

**Commands:**
```bash
cd /home/clawdbot/clawd/repos/beadboard
touch src/tui/tools/bb-worker-status.ts
touch tests/tui/tools/bb-worker-status.test.ts
```

---

### Task 4: Update Pi Daemon Adapter for Workers

**File:** `src/lib/pi-daemon-adapter.ts`

**Changes:**
1. Import worker tools
2. Pass worker session manager reference
3. Add worker events to session subscription

**Specific edits:**

After line 64 (tools array), add:
```typescript
// Import worker tools
const { createSpawnWorkerTool } = await import('../tui/tools/bb-spawn-worker');
const { createWorkerStatusTool } = await import('../tui/tools/bb-worker-status');
```

In customTools array, add:
```typescript
{ tool: createSpawnWorkerTool(projectRoot) },
{ tool: createWorkerStatusTool(projectRoot) },
```

---

### Task 5: Runtime Event Types for Workers

**File:** `src/lib/embedded-runtime.ts`

**Already has:**
- `worker.spawned`
- `worker.updated`
- `worker.completed`
- `worker.failed`

**Verify these are used correctly in event emission.**

---

### Task 6: Worker Events in Daemon

**File:** `src/lib/embedded-daemon.ts`

**Add helper method:**
```typescript
appendWorkerEvent(projectRoot: string, workerId: string, event: {
  kind: 'worker.spawned' | 'worker.updated' | 'worker.completed' | 'worker.failed';
  title: string;
  detail: string;
  status?: RuntimeConsoleEvent['status'];
}): void {
  this.appendEvent(projectRoot, {
    kind: event.kind,
    title: event.title,
    detail: event.detail,
    status: event.status,
    metadata: { workerId },
  });
}
```

---

### Task 7: Frontend Worker Status Display

**File:** `src/components/shared/runtime-console.tsx`

**Changes:**
1. Add worker event rendering (distinct from orchestrator events)
2. Show worker spawn/complete/fail with visual indicators
3. Display worker ID and task association

**File:** `src/components/shared/orchestrator-panel.tsx`

**Changes:**
1. Show active workers count
2. List workers with status badges
3. Click to expand worker details

---

### Task 8: Worker Isolation

**File:** `src/lib/worker-session-manager.ts`

**Ensure:**
1. Workers use separate session from orchestrator
2. Worker context is task-scoped, not project-scoped
3. Worker cannot spawn more workers (no recursion)
4. Worker results are captured, not lost

**Worker system prompt:**
```typescript
const workerPrompt = `
You are a worker agent for BeadBoard. Your job is to execute a specific task.

Task ID: ${taskId}
Task Context: ${taskContext}

Rules:
- Focus only on this task
- Report progress via bb_presence tool
- When complete, summarize what you did
- If blocked, report why
- You cannot spawn more workers
`;
```

---

### Task 9: Integration Tests

**File:** `tests/integration/worker-spawning.test.ts`

**Test scenarios:**
1. Orchestrator spawns worker successfully
2. Worker executes task and reports completion
3. Worker failure is captured and reported
4. Multiple workers can run in parallel
5. Worker status tool returns correct state
6. Events flow to frontend correctly

**Commands:**
```bash
cd /home/clawdbot/clawd/repos/beadboard
mkdir -p tests/integration
touch tests/integration/worker-spawning.test.ts
```

---

### Task 10: Manual E2E Test

**Steps:**
1. Start BeadBoard dev server
2. Open left panel orchestrator chat
3. Send prompt: "Spawn a worker to read the README.md and summarize it"
4. Verify:
   - `worker.spawned` event appears in console
   - Worker status shows in UI
   - Worker completes with result
   - `worker.completed` event appears
   - Orchestrator receives result summary

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/worker-session-manager.ts` | Create | Manage worker lifecycle |
| `src/tui/tools/bb-spawn-worker.ts` | Create | Tool for spawning |
| `src/tui/tools/bb-worker-status.ts` | Create | Tool for status checks |
| `src/lib/pi-daemon-adapter.ts` | Edit | Add worker tools |
| `src/lib/embedded-daemon.ts` | Edit | Add worker event helper |
| `src/components/shared/runtime-console.tsx` | Edit | Display worker events |
| `src/components/shared/orchestrator-panel.tsx` | Edit | Show worker list |
| `tests/lib/worker-session-manager.test.ts` | Create | Unit tests |
| `tests/tui/tools/bb-spawn-worker.test.ts` | Create | Tool tests |
| `tests/tui/tools/bb-worker-status.test.ts` | Create | Tool tests |
| `tests/integration/worker-spawning.test.ts` | Create | Integration tests |

---

## Success Criteria

- [ ] Orchestrator can call `bb_spawn_worker` tool
- [ ] Worker session is created and tracked
- [ ] Worker executes task independently
- [ ] Worker events appear in runtime console
- [ ] Worker status is queryable via `bb_worker_status`
- [ ] Worker completion/failure is captured
- [ ] Multiple workers can run in parallel
- [ ] Workers cannot spawn more workers
- [ ] All tests pass

---

## Risks

| Risk | Mitigation |
|------|------------|
| Worker context bleeds into orchestrator | Separate session objects, isolated state |
| Too many workers spawn | Limit max concurrent workers per project |
| Worker hangs | Add timeout, auto-terminate stuck workers |
| Events duplicate | Use dedupe logic already in place |

---

## Estimated Effort

- Tasks 1-3 (Core): 2-3 hours
- Tasks 4-6 (Integration): 1-2 hours
- Tasks 7-8 (UI + Isolation): 2-3 hours
- Tasks 9-10 (Testing): 1-2 hours

**Total:** 6-10 hours

---

## Execution Order

Recommended sequence:
1. Task 1 → 2 → 3 (Core tools)
2. Task 4 → 5 → 6 (Integration)
3. Task 8 (Isolation - critical before testing)
4. Task 7 (UI)
5. Task 9 → 10 (Testing)

---

## Dependencies

- Pi SDK (already integrated)
- Existing daemon/adapter infrastructure
- Runtime event system (already working)

---

## Next After Phase 1

Once workers can spawn and execute:
- **Phase 2:** Archetype-backed execution configs
- **Phase 3:** Template-first orchestration with workers
- **Phase 5:** Show workers in social/graph views
