# Orchestrator v2 Roadmap

**Date**: 2026-03-26
**Branch**: `feature/orchestrator-v2`
**Status**: Active — infrastructure complete, UX gaps remain

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

### Tier 3 — Nice to have, not blocking release

| # | Flow | Description | Status |
|---|------|-------------|--------|
| 8 | **Multi-project** | Aggregate multiple repos | 55% — works for basics |
| 9 | **Cost & history** | Token usage, session replay, audit trail | 0% — Epic 6rp, defer to v0.3.0 |

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

## What We Don't Have (Gaps)

### Gap 1: Agent Presence (Biggest Gap)
**Blocks**: Flows 1, 5, 7
**What's missing**: You cannot see which agent is working on which task in either the Social or Graph view.
- No agent avatar/liveness dot on social cards
- No agent overlay on graph nodes
- `livenessMap` computed in deprecated Sessions page, not available in shell
- PRD Phase 4

### Gap 2: Right Panel Context
**Blocks**: Flows 3, 7
**What's missing**: Clicking a task/swarm/agent in the UI does nothing in the right panel.
- `ContextualRightPanel` only branches on `epicId`
- No default content when nothing selected (should show ActivityPanel)
- PRD Phase 1

### Gap 3: PRD Phase 0 Wiring
**Blocks**: Flows 1, 3
**What's missing**: 4 small wiring fixes that are prerequisites for everything else.
- P0.1: `blockedOnly` not passed to SocialPage
- P0.2: ActivityPanel not shown as right panel default
- P0.4: Thread drawer status badge hardcoded "In Progress"
- P0.5: TopBar metric tiles partially wired (blocked count works, agent counts don't)

### Gap 4: Blocked Triage Workflow
**Blocks**: Flow 3
**What's missing**: Dedicated surface for triaging blocked items.
- No BlockedTriageModal with blocker chain context
- No inline archetype/agent assignment from blocked view
- `buildBlockedByTree` exists but no UI uses it
- PRD Phase 5

### Gap 5: Swarm Launch from UI
**Blocks**: Flow 4
**What's missing**: No way to launch a swarm without typing in the chat.
- LaunchSwarmDialog exists but not wired to TopBar or left panel
- No "Launch Swarm" button on epic rows
- PRD Phase 3

### Gap 6: Proactive Notifications
**Blocks**: Flows 2, 5
**What's missing**: User isn't notified when agents complete or need attention.
- BLOCKED notification works (we built it)
- No completion notification ("Engineer 01 finished task X")
- No progress notifications ("Engineer 01 is 50% done")
- User has to ask "what's the status?" in chat

### Gap 7: Review Workflow
**Blocks**: Flow 6
**What's missing**: No way to review, accept, or reject agent work from the UI.
- Worker results accessible only via chat tool
- No diff view, no file list, no accept/reject buttons
- Dolt-based review surface (Epic 6rp) deferred

---

## Build Order

Priority is based on: (a) which flows are Tier 1, (b) dependency chain, (c) effort.

### Phase A: Wiring Fixes (PRD Phase 0)
**Effort**: Small — 4 independent one-line to ten-line fixes
**Unblocks**: Everything else

1. Wire `blockedOnly` to SocialPage (1 line in unified-shell.tsx)
2. Wire ActivityPanel as right panel default (contextual-right-panel.tsx)
3. Fix thread drawer status badge (thread-drawer.tsx)
4. Wire remaining TopBar metrics (agent counts)

### Phase B: Right Panel Context (PRD Phase 1)
**Effort**: Medium — extend ContextualRightPanel branching
**Unblocks**: Flows 3, 7

1. Pass taskId/agentId/swarmId from URL state to ContextualRightPanel
2. `?task=X` → show task thread + agent assignment
3. `?swarm=X` → show MissionInspector (already exists)
4. `?agent=X` → show agent details + current task
5. No selection → show ActivityPanel (done in Phase A)

### Phase C: Agent Presence (PRD Phase 4)
**Effort**: Medium-Large — the most impactful visual change
**Unblocks**: Flows 1, 5

1. Move `livenessMap` computation to UnifiedShell level
2. Pass liveness data to SocialCard — render agent avatar + status dot
3. Pass liveness data to SmartDag — render agent overlay on nodes
4. Pulse animation for stuck/stale agents
5. Update TopBar idle/busy counts from liveness data

### Phase D: Completion Notifications
**Effort**: Small-Medium
**Unblocks**: Flow 2, 5

1. Emit completion events when workers finish (alongside existing runtime events)
2. Add green "completed" badge to top bar (similar to BLOCKED amber badge)
3. Auto-append completion summary as assistant turn in orchestrator chat
4. Badge clears after user views results

### Phase E: Swarm Launch UI (PRD Phase 3)
**Effort**: Medium
**Unblocks**: Flow 4

1. Add "Launch Swarm" button to epic rows in left panel
2. Wire LaunchSwarmDialog to TopBar as global action
3. Post-launch: navigate to `?swarm=X` to show swarm in right panel

### Phase F: Blocked Triage (PRD Phase 5)
**Effort**: Medium
**Unblocks**: Flow 3

1. Build BlockedTriageModal with blocker chain context
2. Inline agent assignment from triage view
3. Wire TopBar blocked button to open modal instead of navigating

### Phase G: Review Workflow (Future)
**Effort**: Large — deferred to v0.3.0
**Unblocks**: Flow 6

---

## Release Criteria for v0.2.0

All of these must be true before cutting `release/v0.2.0`:

- [ ] Agent presence visible on social cards (Phase C)
- [ ] Right panel responds to task/swarm selection (Phase B)
- [ ] Blocked filter works end-to-end (Phase A)
- [ ] Completion notifications in chat (Phase D)
- [ ] Orchestrator chat is reliable (done)
- [ ] State survives refresh (done)
- [ ] No silent failures (done)
- [ ] 0 typecheck errors (done)
- [ ] All new code has tests (mostly done, API route tests added)

---

## Files Reference

### Core runtime (stable, tested)
- `src/lib/orchestrator-chat.ts` — ConversationTurnStore
- `src/lib/embedded-daemon.ts` — event + turn store, blocked detection, persistence
- `src/lib/pi-daemon-adapter.ts` — Pi SDK session management, turn emission
- `src/lib/runtime-persistence.ts` — JSONL read/write/atomic
- `src/lib/worker-session-manager.ts` — worker lifecycle
- `src/lib/validate-project-root.ts` — path traversal protection

### UI (needs Phase A-F work)
- `src/components/shared/unified-shell.tsx` — root layout, state hub
- `src/components/shared/orchestrator-panel.tsx` — chat + onboarding + restart
- `src/components/shared/top-bar.tsx` — blocked badge, metrics
- `src/components/shared/runtime-console.tsx` — telemetry + stop buttons
- `src/components/shared/left-panel.tsx` — navigation, epic tree
- `src/components/activity/contextual-right-panel.tsx` — context inspector (needs Phase B)
- `src/components/social/social-card.tsx` — needs agent presence (Phase C)
- `src/components/graph/smart-dag.tsx` — needs agent overlay (Phase C)

### Agent definitions
- `.beads/archetypes/*.json` — 6 agent types
- `.beads/templates/*.json` — team presets
- `src/tui/system-prompt.ts` — orchestrator context + decision tree
- `skills/beadboard-driver/SKILL.md` — agent coordination protocol
