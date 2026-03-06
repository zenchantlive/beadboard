# BeadBoard Daemon Attachment Substrate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the first real BeadBoard daemon substrate so a user-owned `bb` daemon can stay running on the host machine, expose a control API, and become the future attachment point for local or remote BeadBoard frontends, starting with a TUI-first host experience and Pi-oriented runtime hooks.

**Architecture:** Introduce a real BeadBoard daemon lifecycle inside the CLI/runtime layer instead of only in-app in-memory orchestration. The daemon will be user-owned and host-resident, with project registration, orchestrator bootstrap, launch/event APIs, and a first TUI surface for observing and steering runtime state locally. The Next frontend integration remains a client of this daemon substrate, not the owner of execution. Use the existing runtime-manager model for install/runtime placement, and borrow ideas from `pi-mono` packages (`pi-tui`, `pi-web-ui`, coding-agent docs) where useful without coupling BeadBoard to their internal app assumptions.

**Tech Stack:** Node.js, TypeScript, Next.js App Router APIs, existing `bb` CLI/runtime-manager, server-sent events, in-process singleton daemon for local v1 bootstrap evolving toward a long-lived process, BeadBoard TUI scaffolding, Pi runtime integration points.

---

## Context and constraints

- This plan assumes the canonical architecture direction is:
  - **each user runs their own local `bb` / `beadboard` daemon**
  - the daemon is **host-resident and long-lived**
  - any frontend (local, personal Vercel, future separate deployment) attaches to that daemon
  - there is **no centralized hosted runtime service** in the current architecture
- Later B2B deployment may use a cloud VM running `bb`, but that belongs to a separate later PRD and must not distort this implementation.
- Current implementation work already added:
  - left sidebar orchestrator mode
  - runtime console UI
  - in-app embedded runtime scaffolding
  - in-app runtime API routes
- That existing work is transitional and must now be refactored toward a true daemon-first model.
- Use TDD and frequent verification.
- Leave work uncommitted unless the user explicitly asks otherwise.

---

## Phase 0: Align the runtime target and document the host-resident daemon contract

### Task 0.1: Add a daemon contract ADR / plan note

**Files:**
- Create: `docs/adr/2026-03-05-bb-daemon-attachment-model.md`
- Modify: `docs/plans/2026-03-05-embedded-pi-prd.md`
- Test: `tests/docs/bb-daemon-attachment-contract.test.ts`

**Step 1: Write the failing doc contract test**

Create `tests/docs/bb-daemon-attachment-contract.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('bb daemon attachment ADR defines user-owned host-resident model', async () => {
  const raw = await fs.readFile(path.resolve('docs/adr/2026-03-05-bb-daemon-attachment-model.md'), 'utf8');
  assert.match(raw, /user-owned/i);
  assert.match(raw, /host-resident/i);
  assert.match(raw, /frontend attaches to daemon/i);
  assert.match(raw, /not a centralized hosted runtime/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /home/clawdbot/clawd/repos/beadboard
node --import tsx --test tests/docs/bb-daemon-attachment-contract.test.ts
```

Expected: FAIL because the ADR file does not exist yet.

**Step 3: Write the minimal ADR and PRD alignment**

Document:
- user-owned daemon model
- local host ownership
- remote/local frontend attachment model
- distinction between current local attachment and future remote attachment
- how this differs from centralized hosted service
- that the daemon is the durable execution anchor

In the PRD, add one clarifying note that the frontend is a client of the daemon and not the runtime owner.

**Step 4: Run test to verify it passes**

Run:

```bash
node --import tsx --test tests/docs/bb-daemon-attachment-contract.test.ts
```

Expected: PASS.

---

## Phase 1: Introduce a real daemon state module and CLI-facing lifecycle

### Task 1.1: Extract daemon state and lifecycle API from transient runtime scaffolding

**Files:**
- Modify: `src/lib/embedded-daemon.ts`
- Create: `src/lib/bb-daemon.ts`
- Modify: `tests/lib/embedded-daemon.test.ts`
- Create: `tests/lib/bb-daemon.test.ts`

**Step 1: Write the failing daemon lifecycle tests**

Create `tests/lib/bb-daemon.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBbDaemon } from '../../src/lib/bb-daemon';

test('bb daemon starts in stopped state', () => {
  const daemon = createBbDaemon();
  assert.equal(daemon.getLifecycle().status, 'stopped');
});

test('bb daemon can start and expose started lifecycle metadata', async () => {
  const daemon = createBbDaemon();
  await daemon.start();
  const lifecycle = daemon.getLifecycle();
  assert.equal(lifecycle.status, 'running');
  assert.ok(lifecycle.startedAt);
});

test('bb daemon stop transitions back to stopped', async () => {
  const daemon = createBbDaemon();
  await daemon.start();
  await daemon.stop();
  assert.equal(daemon.getLifecycle().status, 'stopped');
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test tests/lib/bb-daemon.test.ts
```

Expected: FAIL because `src/lib/bb-daemon.ts` does not exist.

**Step 3: Implement minimal daemon lifecycle module**

Create `src/lib/bb-daemon.ts` with:
- daemon lifecycle state: `stopped | starting | running | stopping | failed`
- `createBbDaemon()`
- `start()`
- `stop()`
- `getLifecycle()`
- project registry wiring using the existing embedded daemon state as backing storage for now

Keep this DRY and explicitly transitional: lifecycle + project/orchestrator/event store, but still in-process for the first cut.

**Step 4: Refactor `embedded-daemon.ts` to become the runtime state store, not the top-level daemon abstraction**

Preserve current API compatibility only where needed.

**Step 5: Run tests to verify they pass**

Run:

```bash
node --import tsx --test tests/lib/embedded-daemon.test.ts tests/lib/bb-daemon.test.ts
```

Expected: PASS.

---

### Task 1.2: Add CLI daemon commands to `bb`

**Files:**
- Modify: `src/cli/beadboard-cli.ts`
- Create: `tests/cli/beadboard-daemon-cli.test.ts`
- Modify: `tests/cli/beadboard-help-output.test.ts`

**Step 1: Write failing CLI tests**

Create `tests/cli/beadboard-daemon-cli.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../../src/cli/beadboard-cli';

test('bb daemon help renders daemon commands', async () => {
  const result = await runCli(['daemon', '--help']);
  assert.equal(result.ok, true);
  assert.match(String(result.text ?? ''), /start/i);
  assert.match(String(result.text ?? ''), /status/i);
  assert.match(String(result.text ?? ''), /stop/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test tests/cli/beadboard-daemon-cli.test.ts
```

Expected: FAIL because daemon CLI support is missing.

**Step 3: Implement minimal daemon subcommands**

Extend CLI with:
- `bb daemon start`
- `bb daemon status`
- `bb daemon stop`
- `bb daemon tui` (stub/help text if full TUI is not ready yet)

Return structured JSON/text output consistent with current CLI style.

**Step 4: Update help output tests**

Add daemon command expectations to the global help tests.

**Step 5: Run tests to verify pass**

Run:

```bash
node --import tsx --test tests/cli/beadboard-daemon-cli.test.ts tests/cli/beadboard-help-output.test.ts
```

Expected: PASS.

---

## Phase 2: Make runtime API routes daemon-backed instead of ad hoc shell-backed

### Task 2.1: Route all runtime endpoints through `bb-daemon`

**Files:**
- Modify: `src/app/api/runtime/status/route.ts`
- Modify: `src/app/api/runtime/orchestrator/route.ts`
- Modify: `src/app/api/runtime/events/route.ts`
- Modify: `src/app/api/runtime/launch/route.ts`
- Modify: `tests/api/runtime-routes.test.ts`

**Step 1: Write failing/expanded route tests**

Add tests for:
- daemon status included in `/api/runtime/status`
- `/api/runtime/orchestrator` requires running or auto-starts the daemon
- `/api/runtime/launch` returns daemon lifecycle metadata along with launch result
- `/api/runtime/events` is project-scoped and daemon-backed

**Step 2: Run tests to verify gaps**

Run:

```bash
node --import tsx --test tests/api/runtime-routes.test.ts
```

Expected: at least one FAIL after new expectations are added.

**Step 3: Implement route refactor**

Use `bb-daemon` as the single route dependency.
Do not create parallel state stores in route files.

**Step 4: Run tests to verify pass**

Run:

```bash
node --import tsx --test tests/api/runtime-routes.test.ts
```

Expected: PASS.

---

## Phase 3: Add daemon event streaming suitable for frontend attachment

### Task 3.1: Add daemon-scoped SSE stream

**Files:**
- Create: `src/app/api/runtime/stream/route.ts`
- Create: `tests/api/runtime-stream-route.test.ts`
- Modify: `src/lib/bb-daemon.ts`

**Step 1: Write failing stream route test**

Create `tests/api/runtime-stream-route.test.ts` that verifies:
- connection succeeds
- connected frame is emitted
- daemon events for a project can be streamed

Keep the test simple and focused on frame presence, not browser-specific behavior.

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test tests/api/runtime-stream-route.test.ts
```

Expected: FAIL because route does not exist.

**Step 3: Implement minimal SSE route**

Use the same general style as existing `/api/events`, but scoped to daemon/runtime events.
The route should accept at least:
- `projectRoot`

It should emit:
- connected frame
- daemon/runtime events for the given project
- heartbeat frames

**Step 4: Run test to verify pass**

Run:

```bash
node --import tsx --test tests/api/runtime-stream-route.test.ts
```

Expected: PASS.

---

## Phase 4: Add a first TUI host surface for the daemon

### Task 4.1: Build a minimal daemon TUI instead of frontend dependency first

**Files:**
- Create: `src/tui/bb-daemon-tui.ts`
- Create: `tests/tui/bb-daemon-tui.test.ts`
- Modify: `src/cli/beadboard-cli.ts`

**Step 1: Write failing TUI contract test**

Create `tests/tui/bb-daemon-tui.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDaemonTuiSnapshot } from '../../src/tui/bb-daemon-tui';

test('daemon TUI snapshot includes daemon status and orchestrator summary', () => {
  const lines = renderDaemonTuiSnapshot({
    daemonStatus: 'running',
    projects: [{ projectRoot: '/tmp/project-a', orchestratorStatus: 'idle', eventCount: 2 }],
  });
  const text = lines.join('\n');
  assert.match(text, /running/i);
  assert.match(text, /project-a/i);
  assert.match(text, /orchestrator/i);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test tests/tui/bb-daemon-tui.test.ts
```

Expected: FAIL because file does not exist.

**Step 3: Implement minimal TUI snapshot layer**

Start simple:
- pure renderer returning lines
- show daemon lifecycle
- show registered projects
- show orchestrator per project
- show recent runtime events

If using ideas from `pi-mono`, borrow rendering/layout ideas from `packages/tui`, but do not over-integrate external package machinery yet. Keep BeadBoard's first TUI testable and local.

**Step 4: Wire `bb daemon tui` to render this TUI**

At first it may be a basic terminal loop or even a single-render proof if full interactive TUI is too much for one task.

**Step 5: Run tests to verify pass**

Run:

```bash
node --import tsx --test tests/tui/bb-daemon-tui.test.ts tests/cli/beadboard-daemon-cli.test.ts
```

Expected: PASS.

---

## Phase 5: Add first Pi integration hook for daemon-managed orchestrator bootstrap

### Task 5.1: Define a daemon-to-Pi bootstrap contract

**Files:**
- Create: `src/lib/pi-daemon-adapter.ts`
- Create: `tests/lib/pi-daemon-adapter.test.ts`
- Modify: `src/lib/bb-daemon.ts`

**Step 1: Write failing adapter test**

The adapter test should verify:
- `ensureProjectOrchestrator(projectRoot)` returns a daemon-managed orchestrator binding
- adapter can describe a future external Pi daemon endpoint or launch target
- BeadBoard runtime concepts remain BeadBoard-native

Example test skeleton:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPiDaemonAdapter } from '../../src/lib/pi-daemon-adapter';

test('pi daemon adapter exposes ensureProjectOrchestrator contract', async () => {
  const adapter = createPiDaemonAdapter();
  const result = await adapter.ensureProjectOrchestrator('/tmp/project-a');
  assert.equal(result.backend, 'pi');
  assert.equal(result.kind, 'orchestrator');
  assert.ok(result.id);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test tests/lib/pi-daemon-adapter.test.ts
```

Expected: FAIL because adapter does not exist.

**Step 3: Implement minimal adapter**

For this stage, the adapter may still be local/in-process, but it must:
- be clearly named as Pi-daemon oriented
- provide a seam for future real host-level Pi daemon attach/spawn logic
- avoid leaking raw Pi details into route or UI layers

**Step 4: Refactor `bb-daemon` to depend on the adapter**

Use dependency injection where practical.

**Step 5: Run tests to verify pass**

Run:

```bash
node --import tsx --test tests/lib/pi-daemon-adapter.test.ts tests/lib/bb-daemon.test.ts tests/api/runtime-routes.test.ts
```

Expected: PASS.

---

## Phase 6: Hook current frontend runtime scaffolding to the daemon stream and daemon launch contract

### Task 6.1: Replace direct optimistic-only shell runtime behavior with daemon attachment behavior

**Files:**
- Modify: `src/components/shared/unified-shell.tsx`
- Create: `tests/components/unified-shell-runtime-daemon.test.tsx`
- Possibly modify: `src/components/shared/runtime-console.tsx`
- Possibly modify: `src/components/shared/orchestrator-panel.tsx`

**Step 1: Write failing shell runtime-daemon test**

Test for:
- shell bootstraps from daemon status/orchestrator endpoints
- shell can receive event list from daemon endpoint
- ask-orchestrator action uses daemon launch endpoint
- no duplicate local-only runtime ownership assumptions remain in the shell

**Step 2: Run test to verify it fails**

Run:

```bash
node --import tsx --test tests/components/unified-shell-runtime-daemon.test.tsx
```

Expected: FAIL before implementation.

**Step 3: Refactor shell to be daemon-client-first**

Keep optimistic UX if useful, but source of truth must be daemon state.

**Step 4: Run tests to verify pass**

Run:

```bash
node --import tsx --test tests/components/unified-shell-runtime-daemon.test.tsx tests/components/unified-shell.test.tsx
```

Expected: PASS.

---

## Phase 7: Verification and evidence gates

### Task 7.1: Add targeted regression suite to package test script

**Files:**
- Modify: `package.json`

**Step 1: Ensure all new targeted tests are included**

Add to `package.json` test script:
- `tests/docs/bb-daemon-attachment-contract.test.ts`
- `tests/lib/bb-daemon.test.ts`
- `tests/lib/embedded-daemon.test.ts`
- `tests/api/runtime-routes.test.ts`
- `tests/api/runtime-stream-route.test.ts`
- `tests/tui/bb-daemon-tui.test.ts`
- `tests/lib/pi-daemon-adapter.test.ts`
- `tests/components/unified-shell-runtime-daemon.test.tsx`
- `tests/cli/beadboard-daemon-cli.test.ts`

**Step 2: Run targeted verification batch**

Run:

```bash
cd /home/clawdbot/clawd/repos/beadboard
npx eslint src/lib/bb-daemon.ts src/lib/embedded-daemon.ts src/lib/pi-daemon-adapter.ts src/app/api/runtime/status/route.ts src/app/api/runtime/orchestrator/route.ts src/app/api/runtime/events/route.ts src/app/api/runtime/launch/route.ts src/app/api/runtime/stream/route.ts src/tui/bb-daemon-tui.ts src/cli/beadboard-cli.ts src/components/shared/unified-shell.tsx src/components/shared/runtime-console.tsx src/components/shared/orchestrator-panel.tsx tests/lib/bb-daemon.test.ts tests/lib/embedded-daemon.test.ts tests/lib/pi-daemon-adapter.test.ts tests/api/runtime-routes.test.ts tests/api/runtime-stream-route.test.ts tests/tui/bb-daemon-tui.test.ts tests/components/unified-shell-runtime-daemon.test.tsx tests/cli/beadboard-daemon-cli.test.ts tests/docs/bb-daemon-attachment-contract.test.ts
```

Then run:

```bash
node --import tsx --test tests/docs/bb-daemon-attachment-contract.test.ts tests/lib/bb-daemon.test.ts tests/lib/embedded-daemon.test.ts tests/api/runtime-routes.test.ts tests/api/runtime-stream-route.test.ts tests/tui/bb-daemon-tui.test.ts tests/lib/pi-daemon-adapter.test.ts tests/components/unified-shell-runtime-daemon.test.tsx tests/cli/beadboard-daemon-cli.test.ts
```

Expected: PASS.

**Step 3: Run broader repo checks relevant to touched code**

Run:

```bash
npm run typecheck
```

If it fails, distinguish clearly between:
- pre-existing unrelated failures
- failures introduced by this work

---

## Reference notes from `pi-mono`

These are references, not mandates:

- `packages/tui/README.md`
  - useful for differential TUI rendering ideas and minimal component structure
- `packages/web-ui/README.md`
  - useful later for attachment/client ideas, not the first daemon milestone
- `packages/coding-agent/README.md`
  - useful for understanding runtime modes and integration philosophy
- root `README.md`
  - reinforces package boundaries and monorepo structure

Do **not** copy their architecture blindly. Use them as implementation references where they reduce risk or speed up TUI/runtime integration.

---

## Definition of done for this plan

This plan is complete only when all of the following are true:

- BeadBoard has a real daemon abstraction rather than only ad hoc in-app runtime state
- CLI exposes daemon lifecycle commands
- runtime API routes are daemon-backed
- daemon event streaming exists for frontend attachment
- a first daemon TUI exists for host-side local usage
- a Pi daemon adapter seam exists for real orchestrator bootstrap
- current frontend runtime shell behaves as a daemon client, not as the runtime owner
- targeted lint and test verification pass with fresh evidence

---

Plan complete and saved to `docs/plans/2026-03-05-bb-daemon-attachment-substrate-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
