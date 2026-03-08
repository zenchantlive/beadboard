# Phase 6 - Runtime Hardening

**Status:** Planning
**Created:** 2026-03-07
**Goal:** Improve robustness of embedded Pi runtime, reconnect behavior, and error recovery

---

## Current Issues

1. Session disconnect requires manual restart
2. Stuck/hung agents have no clear diagnostics
3. Drift between TUI Pi loader and embedded Pi loader
4. No automatic recovery from failures

---

## Implementation Plan

### Step 1: Session Health Monitoring
- Add heartbeat check for orchestrator session
- Detect when session is unresponsive
- Show clear status in UI

**Files:**
- `src/lib/pi-daemon-adapter.ts` - health check
- `src/lib/embedded-daemon.ts` - monitoring

### Step 2: Automatic Reconnect
- On session disconnect, attempt reconnect
- Preserve conversation history
- Show reconnect status to user

**Files:**
- `src/lib/pi-daemon-adapter.ts`
- `src/components/shared/left-panel.tsx` - reconnect UI

### Step 3: Stuck Agent Diagnostics
- Detect agents stuck in "spawning" for too long
- Provide diagnostic information
- Allow user to cancel/retry

**Files:**
- `src/lib/worker-session-manager.ts`
- `src/components/agents/agent-status-panel.tsx`

### Step 4: Error Recovery UX
- Clear error messages when things fail
- Retry buttons for failed operations
- Logs for debugging

**Files:**
- Error handling across runtime components
- UI for error display

---

## Blocked Items

None identified.

---

## Success Criteria

- [ ] Session health monitored and shown in UI
- [ ] Automatic reconnect on disconnect
- [ ] Stuck agents detected and reported
- [ ] Clear error messages with recovery options

---

## Estimated Effort

3-4 hours
