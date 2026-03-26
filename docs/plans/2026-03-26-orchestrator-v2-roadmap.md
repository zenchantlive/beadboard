# Orchestrator v2 Roadmap

**Date**: 2026-03-26
**Branch**: `feature/orchestrator-v2`
**Status**: Active — infrastructure complete, UX gaps remain
**Last revised**: 2026-03-26 (post-critique revision)

---

## Vision

BeadBoard is an **agent-first operations console**. The human opens it and immediately sees:
- Who is working what, right now
- What is blocked and why
- Progress without asking

The orchestrator chat is the primary interface — you talk to it like a project manager. The dashboard (Social + Graph views) is the passive monitoring surface. Together they make multi-agent work visible, controllable, and trustworthy.

---

## 10 User Flows (Priority Ordered)

These are the actual things a human does with BeadBoard. Everything we build should serve one of these.

### Tier 1 — Must work for v0.2.0

| # | Flow | Description | Status |
|---|------|-------------|--------|
| 1 | **Morning check-in** | Open app, see agents working, blocked items, progress at a glance | 40% — counts work, no agent presence on cards |
| 2 | **Chat orchestration** | Talk to orchestrator, spawn agents, get results | 65% — chat works, persistence works, no proactive notifications |
| 3 | **Blocked triage** | See what's stuck, understand why, assign someone to fix it | 25% — detection works, no triage UI |
| 5 | **Monitor agents** | Watch real-time work, see who's doing what | 45% — telemetry exists, not surfaced on cards/nodes |
| 10 | **Intervention** | Stop a worker, restart orchestrator, change direction | 60% — individual controls work, no bulk ops |

### Tier 2 — Should work for v0.2.0

| # | Flow | Description | Status |
|---|------|-------------|--------|
| 4 | **Spawn a team** | Pick a template, launch agents on an epic | 40% — works from chat, no UI launch points |
| 7 | **Graph exploration** | See dependencies, click nodes, plan work | 50% — renders, but right panel ignores selection |
| 6 | **Review work** | See what agents finished, verify quality | 15% — data exists, no review UI |

### Tier 3 — Defer to v0.3.0

| # | Flow | Description | Status |
|---|------|-------------|--------|
| 8 | **Multi-project** | Aggregate multiple repos | 55% — works for basics |
| 9 | **Cost & history** | Token usage, session replay, audit trail | 0% — Epic 6rp |

---

## What We Have (Shipped)

### Infrastructure (Epic 0cf — Complete)
- ConversationTurnStore — first-class chat model, no string-matching
- State persistence — events, turns, workers survive refresh via .beadboard/runtime/ JSONL
- Async tool handlers — no event loop blocking from bd subprocess calls
- Session race fix — concurrent prompts share one session creation
- Event cap — 1000 events in memory, oldest-first eviction
- Atomic writes, corrupt-line-safe reads
- Path traversal protection on all API routes

### Orchestrator UX (Epic 1zb — Complete)
- Suggested prompts in empty orchestrator panel
- BLOCKED notification badge in top bar (amber, derived from SSE events)
- Stop worker button per active worker
- Restart orchestrator with confirmation + disk cleanup
- Error surfacing — silent failures now show as error turns and inline messages

### Bug Fixes
- Double-reply rendering (beadboard-sen)
- Unbounded event array (beadboard-28z)
- Hardcoded dev path (beadboard-bnx)
- Silent failures (beadboard-cho)
- Session race condition (beadboard-4v7)

### Test Coverage
- 41 new tests (orchestrator-chat, runtime-persistence, validateProjectRoot, writeJsonlAtomic)
- 0 typecheck errors (Pi SDK type stubs added)

---

## Pi Runtime Boundary

BeadBoard is not implementing an agent runtime from scratch. It is building an orchestration product on top of Pi session, tool-calling, and event-streaming primitives, then persisting and projecting that runtime state into BeadBoard-specific UI surfaces.

**Pi-backed concerns:**
- Session creation and lifecycle (`createAgentSession`, provider/model selection, runtime bootstrapping)
- Assistant and tool event streaming
- Worker session execution and completion/failure signaling
- Transport/reconnect behavior that affects SSE delivery and deduplication

**BeadBoard-owned concerns:**
- Runtime console projections and persisted JSONL snapshots
- Orchestrator chat turn store and right-panel destinations
- Social/Graph presence rendering
- Blocked triage, swarm launch UX, and review flows

**Planning implication:** Phases 1, 3, and 4 are not pure shell work. They depend on correct Pi session/event behavior and should be verified against the Pi runtime boundary, not only against UI state.

---

## What We Don't Have (Gaps)

### Gap 1: Agent Identity Data Contract (Shared Prerequisite)
**Blocks**: Gaps 2, 3, 4, 5, 6
**What's missing**: A single, stable source of agent/session identity data that all UI surfaces can consume.

Agent presence, busy/idle counts, agent details in the right panel, swarm launch affordances, and blocked triage assignment all depend on knowing: which agents exist, what they're working on, and whether they're alive. Today this data is fragmented:
- `workerSessionManager` tracks in-memory workers (lost on refresh for active session state)
- `livenessMap` is computed in the deprecated Sessions page via `useSessionFeed`
- `.beads/agents.jsonl` persists agent registration (but not live status)
- `embeddedPiDaemon` tracks runtime events (worker.spawned, worker.completed, etc.)

**Required deliverable**: An `AgentStateProvider` (React context or hook) at the UnifiedShell level that:
- Derives live agent state from the SSE event stream (spawned, working, completed, failed, blocked)
- Exposes: `agents: AgentState[]`, `agentsByTask: Map<taskId, AgentState>`, `busyCount`, `idleCount`, `blockedCount`
- Is the single source consumed by TopBar metrics, SocialCard presence, SmartDag overlays, ContextualRightPanel agent details, and BlockedTriageModal assignment
- Survives page refresh (persisted worker state provides initial snapshot, SSE provides live updates)

This contract must be defined and implemented before any UI feature that shows agent data.
This is a BeadBoard projection layer over Pi worker/session events, not a replacement for Pi runtime state.

### Gap 2: Agent Presence (Biggest Visual Gap)
**Blocks**: Flows 1, 5, 7
**Depends on**: Gap 1 (AgentStateProvider)
**What's missing**: You cannot see which agent is working on which task in either view.
- No agent avatar/liveness dot on social cards
- No agent overlay on graph nodes
- PRD Phase 4

### Gap 3: Right Panel Context
**Blocks**: Flows 3, 7
**Depends on**: Gap 1 (for `?agent=X` branch)
**What's missing**: Clicking a task/swarm/agent in the UI does nothing in the right panel.
- `ContextualRightPanel` only branches on `epicId`
- No default content when nothing selected
- PRD Phase 1

### Gap 4: Blocked Triage Workflow
**Blocks**: Flow 3
**Depends on**: Gap 1 (for inline assignment), Gap 3 (right panel context)
**What's missing**: Dedicated surface for triaging blocked items.
- No BlockedTriageModal with blocker chain context
- No inline agent assignment from triage view
- `buildBlockedByTree` exists but no UI uses it
- PRD Phase 5

### Gap 5: Swarm Launch from UI
**Blocks**: Flow 4
**Depends on**: Gap 1 (for agent type selection)
**What's missing**: No way to launch a swarm without typing in the chat.
- LaunchSwarmDialog exists but not wired to TopBar or left panel
- No "Launch Swarm" button on epic rows
- PRD Phase 3

### Gap 6: Completion Notifications + Minimal Review
**Blocks**: Flows 2, 5, 6
**Depends on**: Gap 1 (to know when agents finish), Gap 3 (to give notifications a destination)
**What's missing**: User isn't notified when agents complete, and has nowhere to inspect results.
- No completion notification ("Engineer 01 finished task X")
- No "what finished" landing surface — notifications need a destination
- Worker results accessible only via chat tool
- A minimal review surface (task thread + files changed + accept/reopen) is needed before notifications have value

### Gap 7: Shell State Stabilization (PRD Phase 0)
**Blocks**: Flows 1, 3
**What's missing**: Cross-cutting wiring fixes that affect shell state routing, panel defaults, and metric accuracy.
- `blockedOnly` not passed to SocialPage
- ActivityPanel not shown as right panel default
- Thread drawer status badge hardcoded "In Progress"
- TopBar agent counts hardcoded to 0 (depends on Gap 1 for real data)

These are not trivial — they change how `UnifiedShell` routes state to child components and alter user-visible defaults. They require regression tests covering URL-state routing and right-panel selection behavior.

---

## Build Order

The critique identified that the original phasing mixed prerequisites with feature work, sequenced notifications before they had a destination, and placed blocked triage too late for a release that calls blocked visibility core. This revision addresses all of those.

**Critical path**: Phase 0 -> Phase 1 Part A -> Phase 1 Part B -> Phase 2a -> Phase 2b + Phase 3 -> Phase 4 -> Phase 5

### Phase 0: Shell Stabilization + Regression Tests
**Effort**: Small-Medium (the fixes are small; the test coverage is not)
**Unblocks**: Everything else
**Regression risk**: HIGH — touches UnifiedShell state routing

**Work:**
1. Wire `blockedOnly` to SocialPage
2. Wire ActivityPanel as right panel default (no selection state)
3. Fix thread drawer status badge
4. Remove "Jump to Activity" dead-end navigation from SocialCard

**Required tests:**
- URL-state routing: `?view=social&blocked=1` filters feed
- Right panel: no selection → ActivityPanel rendered
- Right panel: `?epic=X` → epic content rendered (existing behavior preserved)
- Thread drawer: status badge reflects actual issue status
- SocialCard: no navigation to `?view=activity` dead end

**Exit criteria**: All 4 fixes verified with tests. No regression in existing URL-state or panel behavior.

### Phase 1: Agent Identity Contract
**Effort**: Medium — this is architecture, not UI
**Unblocks**: Phases 2a, 2b, 3, 4, 5
**Regression risk**: LOW — new code, no existing behavior changed
**Pi touchpoint**: HIGH — this phase depends on Pi worker/session events and persisted worker restore semantics being interpreted correctly

This phase has two explicit parts. Part A (data model) must be proven by tests before Part B (shell consumers) begins. This prevents the phase from sprawling into ad hoc wiring.

**Part A — Data model + hook:**
1. Define `AgentState` interface: `{ id, displayName, agentTypeId, taskId, beadId, status, lastHeartbeat }`
2. Build `useAgentState()` hook that derives live state from SSE runtime events
3. Persist and restore from `workers.jsonl` (already exists) for refresh survival
4. Expose: `agents`, `agentsByTask`, `busyCount`, `idleCount`, `blockedAgentCount`

**Part A tests (must pass before Part B starts):**
- Hook unit tests: derives correct agent states from event sequences
- Refresh survival: restored workers populate initial state
- Count accuracy: busy/idle/blocked counts match expected given known events
- SSE resubscribe after restart/reconnect does not duplicate agents or inflate counts

**Part A exit criteria**: `useAgentState()` works in isolation with tests. No shell wiring yet.

**Part B — Shell consumers:**
5. Mount `useAgentState()` at UnifiedShell level
6. Wire TopBar metrics to real counts (replacing hardcoded 0s)

**Part B exit criteria**: TopBar shows real agent counts derived from Part A hook.

### Phase 2a: Right Panel Context Routing
**Effort**: Medium
**Unblocks**: Flows 7, and Phase 2b + Phase 4 (both need a right panel destination)
**Depends on**: Phase 1 Part A (agent data for `?agent=X` branch)

**Work:**
1. Extend ContextualRightPanel to accept and branch on `taskId`, `agentId`, `swarmId`
2. `?task=X` → task thread + assigned agent (from Phase 1 data) + reassign affordance
3. `?swarm=X` → MissionInspector (already exists, just wire it)
4. `?agent=X` → agent details + current task + status from `useAgentState()`

**Required tests:**
- Right panel renders correct content for each URL context
- Selection changes update right panel without full re-render
- Deselection returns to ActivityPanel default (Phase 0)

**Exit criteria**: Clicking any entity shows its detail in the right panel.

### Phase 2b: Blocked Triage Workflow
**Effort**: Medium
**Unblocks**: Flow 3
**Depends on**: Phase 1 (agent data for assignment), Phase 2a (right panel routing for drill-down)

Separated from 2a because this is a standalone modal + assignment workflow, not panel routing. Both land before v0.2.0 but they are independently shippable and testable.

**Work:**
1. Build BlockedTriageModal: list of blocked tasks, blocker chain via `buildBlockedByTree`
2. Inline agent assignment using Phase 1 data
3. Wire TopBar blocked indicator to open BlockedTriageModal (currently navigates to orchestrator)
4. Drill-down from triage modal to `?task=X` right panel (Phase 2a)

**Required tests:**
- BlockedTriageModal shows correct blocker chains
- Agent assignment from triage modal updates bead state
- Triage modal → task drill-down navigates correctly

**Exit criteria**: Blocked button opens triage modal. Blocker chains visible. Agent assignment works inline.

### Phase 3: Agent Presence
**Effort**: Medium-Large — the most impactful visual change
**Unblocks**: Flows 1, 5
**Depends on**: Phase 1 (AgentStateProvider)
**Pi touchpoint**: MEDIUM — presence rendering is UI work, but its correctness depends on Pi-backed agent/session state being reduced correctly

**Work:**
1. SocialCard: render agent avatar + liveness dot using `agentsByTask` from Phase 1
2. SmartDag: render agent avatar overlay on active graph nodes
3. Pulse animation for stuck/stale agents (no heartbeat in >60s)
4. Consistent representation: same avatar component, same status colors, both views

**Required tests:**
- SocialCard renders agent avatar when agent is assigned to task
- SocialCard shows no avatar when task is unassigned
- Graph node shows overlay when agent is active
- Stale detection: agent with old heartbeat shows warning treatment
- Cross-view consistency: same agent on same task shows in both Social and Graph

**Operational criteria:**
- Agent presence must be live (updates within 1 SSE cycle, ~500ms)
- Agent presence must be accurate after page refresh (restored from persisted worker state)
- Agent presence must be consistent across Social and Graph views for the same task

**Exit criteria**: Opening either view immediately shows which agents are working on which tasks.

### Phase 4: Completion Notifications + Minimal Review Surface
**Effort**: Medium
**Unblocks**: Flows 2, 5, 6
**Depends on**: Phase 2a (right panel context gives notifications a destination)
**Pi touchpoint**: HIGH — completion and reconnect behavior depend on Pi worker lifecycle events and transport semantics, not just TopBar/UI wiring

Notifications are sequenced after right panel context so they have somewhere to land. A "task completed" notification that opens the right panel to show what changed is useful. A notification with no destination is noise.

**Work:**
1. Emit completion events to SSE when workers finish
2. Add green "completed" badge to TopBar (count of recently completed, clears on view)
3. Auto-append completion summary as assistant turn in orchestrator chat
4. Clicking notification navigates to `?task=X` → right panel shows task thread with completion evidence
5. Minimal review surface in right panel: files changed list + accept (close bead) or reopen button

**Review evidence source: bead notes only.** The accept/reopen path uses `bd show <id>` notes field as the review evidence. This is not a diff view — it shows whatever the agent recorded as evidence (commands run, files changed, test output). The agent is responsible for writing good notes; the review surface just displays them. Full diff-quality review (Dolt-based) is Phase 6/v0.3.0.

**Required tests:**
- Completion badge appears when worker finishes
- Badge count decrements after user clicks through
- Right panel shows completion evidence for finished task
- Accept/reopen buttons update bead status
- SSE resubscribe after restart does not re-emit already-seen completions

**Exit criteria**: When an agent finishes, the user sees it without asking, can click through to see what was done, and can accept or reopen.

### Phase 5: Swarm Launch UI
**Effort**: Medium
**Unblocks**: Flow 4
**Depends on**: Phase 1 (agent types for template selection), Phase 2a (`?swarm=X` right-panel destination)

**Work:**
1. Add "Launch Swarm" button to epic rows in left panel
2. Wire LaunchSwarmDialog to TopBar as global action
3. Post-launch: navigate to `?swarm=X` to show swarm in right panel (Phase 2)
4. Bulk cancel: stop all workers in a swarm with one action

**Exit criteria**: Launching a swarm is one click from the left panel or top bar. Active swarm is visible in right panel.

### Phase 6: Review Workflow (v0.3.0)
**Effort**: Large — deferred
**Unblocks**: Flow 6 (full version)

Full diff view, Dolt-based session replay, cost visibility. Not blocking v0.2.0 release — the minimal review surface from Phase 4 is sufficient.

---

## Release Criteria for v0.2.0

### Functional
- [ ] Agent presence visible on social cards and graph nodes (Phase 3)
- [ ] Right panel responds to task/swarm/agent selection (Phase 2a)
- [ ] Blocked filter works end-to-end: TopBar toggle → SocialPage filters (Phase 0)
- [ ] Blocked triage modal shows blocker chains with inline assignment (Phase 2b)
- [ ] Completion notifications with click-through to results (Phase 4)
- [ ] Orchestrator chat is reliable — no double-replies, no lost messages (done)
- [ ] State survives refresh — events, turns, workers persist (done)
- [ ] No silent failures — errors surface as visible UI feedback (done)
- [ ] Swarm launch possible from UI without chat (Phase 5)

### Operational
- [ ] Agent presence updates within 1 SSE cycle (~500ms) of state change
- [ ] Agent presence is accurate after page refresh (restored from persisted state)
- [ ] Agent presence is consistent between Social and Graph views for the same task
- [ ] Blocked count in TopBar matches actual blocked items in SocialPage filter
- [ ] Right panel content updates on selection change without full page re-render
- [ ] No stale state visible after orchestrator restart (memory and disk cleared)
- [ ] Conversations with 100+ turns render without visible lag
- [ ] Restart/reconnect does not duplicate completion or blocked notifications after SSE resubscribe

### Quality
- [ ] 0 typecheck errors (done)
- [ ] Named regression tests for: URL-state routing, SSE-driven updates, right-panel selection behavior, liveness projection accuracy
- [ ] All new API routes have at least happy-path + validation-failure tests
- [ ] No `as any` casts in new code outside Pi SDK dynamic import boundary

---

## Files Reference

### Core runtime (stable, tested)
- `src/lib/orchestrator-chat.ts` — ConversationTurnStore
- `src/lib/embedded-daemon.ts` — event + turn store, blocked detection, persistence
- `src/lib/pi-daemon-adapter.ts` — Pi SDK session management, turn emission
- `src/lib/runtime-persistence.ts` — JSONL read/write/atomic
- `src/lib/worker-session-manager.ts` — worker lifecycle
- `src/lib/validate-project-root.ts` — path traversal protection

### Pi upstream reference (source of runtime behavior)
- `/Users/jordanhindo/agent-desktop/pi-mono/packages/agent/src/agent.ts` — Pi agent session lifecycle and event streaming
- `/Users/jordanhindo/agent-desktop/pi-mono/packages/agent/src/types.ts` — Pi agent state and event contracts
- `/Users/jordanhindo/agent-desktop/pi-mono/packages/ai/README.md` — provider/model/transport layer used underneath Pi sessions
- `/Users/jordanhindo/agent-desktop/pi-mono/packages/web-ui/src/` — Pi UI/runtime interface patterns and browser-facing runtime surfaces

### UI (needs Phase 0-5 work)
- `src/components/shared/unified-shell.tsx` — root layout, state hub, will host AgentStateProvider
- `src/components/shared/orchestrator-panel.tsx` — chat + onboarding + restart
- `src/components/shared/top-bar.tsx` — blocked badge, metrics (needs real agent counts)
- `src/components/shared/runtime-console.tsx` — telemetry + stop buttons
- `src/components/shared/left-panel.tsx` — navigation, epic tree (needs swarm launch)
- `src/components/activity/contextual-right-panel.tsx` — context inspector (needs Phase 2)
- `src/components/social/social-card.tsx` — needs agent presence (Phase 3)
- `src/components/graph/smart-dag.tsx` — needs agent overlay (Phase 3)

### Agent definitions
- `.beads/archetypes/*.json` — 6 agent types
- `.beads/templates/*.json` — team presets
- `src/tui/system-prompt.ts` — orchestrator context + decision tree
- `skills/beadboard-driver/SKILL.md` — agent coordination protocol
