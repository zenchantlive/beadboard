# BeadBoard Embedded Pi Roadmap

**Date:** 2026-03-05
**Last Updated:** 2026-03-06
**Companion PRD:** `docs/plans/2026-03-05-embedded-pi-prd.md`
**Purpose:** Track what has already shipped for Embedded Pi in BeadBoard, what is partially complete, and what remains to reach the full PRD vision.

---

## Current status

Embedded Pi is no longer PRD-only.

We now have a working embedded orchestrator path inside BeadBoard with:
- BeadBoard-managed Pi bootstrap/runtime plumbing
- project orchestrator session creation
- frontend prompt submission from the left panel
- realtime runtime telemetry in the app
- chat-style orchestrator transcript in the left panel
- BeadBoard-aware tools usable by the orchestrator
- working end-to-end proof that the orchestrator can read project state and execute tools

The biggest remaining gap is still **worker-agent spawning and template-first orchestration**, not basic embedded-chat connectivity.

---

## What is done

### Done: Runtime substrate / managed Pi foundation
- Managed Pi bootstrap exists via `src/lib/bb-pi-bootstrap.ts`
- Pi runtime detection exists via `src/lib/pi-runtime-detection.ts`
- BeadBoard-specific Pi settings + agent dir setup exist
- Embedded daemon/orchestrator substrate exists via:
  - `src/lib/embedded-daemon.ts`
  - `src/lib/bb-daemon.ts`
  - `src/lib/pi-daemon-adapter.ts`

### Done: Orchestrator session integration
- Per-project orchestrator session can be created and reused
- Pi SDK session is initialized through the embedded adapter
- The orchestrator can receive prompts from the frontend
- The orchestrator can execute BeadBoard tools from the frontend path

### Done: BeadBoard-aware orchestrator context
- Dynamic system prompt exists in `src/tui/system-prompt.ts`
- Prompt includes:
  - active tasks
  - archetypes
  - templates
- Deviation recording tool exists:
  - `src/tui/tools/bb-deviation.ts`

### Done: Frontend prompt + telemetry plumbing
- Prompt route exists: `src/app/api/runtime/prompt/route.ts`
- Runtime event stream exists: `src/app/api/runtime/stream/route.ts`
- Runtime events endpoint exists: `src/app/api/runtime/events/route.ts`
- Left-panel orchestrator UI exists and can submit prompts
- Bottom runtime console exists and is now minimizable

### Done: Left-panel orchestrator chat UX foundation
- Left panel supports orchestrator mode
- Left panel now renders chat-style bubbles instead of raw telemetry cards
- User prompts can appear immediately in chat
- Assistant replies are projected from Pi session/runtime events
- Session/runtime errors are kept out of the main chat transcript surface

### Done: Realtime / event-ingestion hardening
- Duplicate runtime-event ingestion was debugged and deduped in the app shell
- Activity panel merging was deduped to stop repeated React key collisions
- Prompt path was changed so frontend requests return immediately instead of blocking on full agent completion
- Runtime stream now continuously surfaces new daemon events without requiring manual refresh for each turn

---

## Partially complete

### Partial: Sessions / conversation model
What works now:
- one embedded project orchestrator
- left-panel conversation surface
- runtime console telemetry

What is still missing:
- robust multi-session model
- explicit worker-session UI
- Full activity panel integration for orchestrator + worker histories
- clearer separation of orchestrator conversation vs mission/worker conversation surfaces

### Partial: Runtime observability
What works now:
- tool execution visibility
- runtime stream
- prompt submission + visible orchestrator progress

What is still missing:
- stronger stuck-session diagnostics
- clearer "thinking vs waiting vs blocked vs completed" state presentation
- better recovery/restart UX when a live session fails

### Partial: Launch plumbing
What works now:
- orchestrator prompt flow in the left panel
- UI-triggered launch route exists

What is still missing:
- launch-anywhere completion across all PRD surfaces
- more complete task/graph/swarm/mission launch affordances
- better contextual launch packaging per surface

---

## Remaining roadmap

## Phase 1 - Worker agents / sub-agents
**Status:** ✅ DONE (2026-03-06)
**Plan:** `docs/plans/2026-03-06-phase-1-worker-spawning.md`

### Shipped
- ✅ Worker spawning tool (`bb_spawn_worker`)
- ✅ Worker status tool (`bb_worker_status`)
- ✅ Worker session manager with isolated sessions
- ✅ Worker events in runtime console with "Worker" badge
- ✅ Worker lifecycle (spawning → working → completed/failed)
- ✅ Multiple parallel workers supported
- ✅ Archetype parameter support
- ✅ Worker results merge back to orchestrator chat

---

## Phase 2 - Archetypes as executable agent types
**Status:** Partially designed, not implemented

### Remaining work
1. Map archetypes to real execution configs
2. Support archetype-based worker creation
3. Layer archetype prompt/tool/model overrides safely
4. Distinguish agent type vs agent instance in runtime/UI state more explicitly

---

## Phase 3 - Template-first orchestration
**Status:** Foundation exists, orchestration behavior not done

### Already done
- templates are included in orchestrator prompt context
- deviation recording tool exists

### Remaining work
1. Implement true template-first planning behavior
2. Let orchestrator choose worker composition from templates
3. Require explanation when deviating from templates
4. Add major-deviation confirmation flow / approval UX
5. Surface deviations consistently across timeline, sessions, and mission contexts

---

## Phase 4 - Multi-surface launch-anywhere UX
**Status:** Partially done

### Remaining work
1. Complete launch affordances on:
   - task cards
   - graph nodes
   - swarm views
   - mission inspectors
   - sessions contexts
   - blocked triage contexts
2. Ensure each launch path packages the right local context automatically
3. Make orchestrator interactions feel consistent across surfaces

---

## Phase 5 - Agent presence in social/graph/activity views
**Status:** Not done

### Remaining work
1. Make orchestrator + worker sessions visible in social cards, graph nodes, and activity panel
2. Support switching between active workers via left-panel orchestrator
3. Preserve longer conversation history cleanly
4. Add intervention / redirection UX for active worker sessions

---

## Phase 6 - Runtime hardening and persistence
**Status:** Partially done

### Remaining work
1. Reduce drift between TUI Pi loader path and embedded Pi loader path
2. Harden reconnect/restart behavior for embedded sessions
3. Improve stuck/hung agent diagnostics
4. Clarify true host-daemon vs in-process lifecycle direction
5. Strengthen project-scoped persistence and restoration guarantees

---

## Phase 7 — Tests and verification
**Status:** Mostly not done

### Remaining work
1. Unit coverage for runtime path resolution / event projection / chat projection
2. Contract tests for adapter and runtime event schemas
3. Integration tests for orchestrator session creation + prompt flow
4. UI tests for left-panel orchestrator chat behavior
5. End-to-end tests for prompt → tool → reply flow
6. Failure-path tests for runtime import/session/tool errors

---

## Phase 8 — Unified Settings System (Future)
**Status:** Not started, documented in PRD Section 24

### Goal
Comprehensive settings for CLI and frontend: model selection, provider auth, UI preferences, runtime config.

### See
`docs/plans/2026-03-05-embedded-pi-prd.md` Section 24 for full requirements.

---

## Suggested next build order

1. **Worker spawning tool + worker session model**
2. **Archetype-backed execution config**
3. **Template-first orchestration behavior**
4. **Activity panel integration for orchestrator/workers**
5. **Launch-anywhere UX completion**
6. **Runtime hardening + automated tests**

---

## Files most relevant to current Embedded Pi implementation

### Core runtime
- `src/lib/bb-daemon.ts`
- `src/lib/embedded-daemon.ts`
- `src/lib/pi-daemon-adapter.ts`
- `src/lib/pi-runtime-detection.ts`
- `src/lib/bb-pi-bootstrap.ts`

### TUI / shared Pi integration references
- `src/tui/bb-agent-tui.ts`
- `src/tui/system-prompt.ts`
- `src/tui/tools/bb-dolt-read.ts`
- `src/tui/tools/bb-deviation.ts`
- `src/tui/tools/bb-mailbox.ts`
- `src/tui/tools/bb-presence.ts`

### Frontend surfaces
- `src/components/shared/orchestrator-panel.tsx`
- `src/components/shared/runtime-console.tsx`
- `src/components/shared/unified-shell.tsx`
- `src/components/shared/left-panel-new.tsx`
- `src/lib/orchestrator-chat.ts`

---

## Summary

Embedded Pi has crossed the line from concept to working substrate.

What is proven now is:
- embedded orchestrator runtime
- frontend prompt path
- realtime telemetry
- basic left-panel orchestrator chat
- BeadBoard-aware tool execution

What remains is the higher-order BeadBoard vision:
- worker spawning
- archetype-backed execution
- template-first orchestration
- multi-session / multi-surface execution UX
- hardened persistence and tests
