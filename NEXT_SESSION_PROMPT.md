# Next Session: Embedded Pi in BeadBoard

## Current status

Embedded Pi is now actively implemented and no longer PRD-only.

Working as of 2026-03-06:
- managed Pi runtime/bootstrap path exists
- embedded project orchestrator session can be created
- frontend prompt route exists and left-panel orchestrator input works
- bottom runtime console shows telemetry and is minimizable
- left panel has chat-style orchestrator transcript instead of raw telemetry cards
- event ingestion duplication was debugged and deduped in `UnifiedShell` and `ActivityPanel`
- prompt flow was changed to return immediately instead of blocking on full agent completion
- runtime stream now surfaces newly appended daemon events live
- orchestrator can execute BeadBoard tools from the embedded frontend path
- module-loading path progressed past the earlier hard failure; orchestrator now reaches tool execution from the frontend

## Current known issue / first priority

The main remaining Embedded Pi bug is:
- the orchestrator appears to stall after tool execution in some turns
- the left chat panel now shows user messages and assistant draft/reply projection, but we still need to verify/finalize post-tool assistant completion behavior so the frontend matches the TUI more closely

Most recent observed behavior:
- `Orchestrator Responding`
- `Tool: bb_dolt_read_issues`
- `Tool Complete: bb_dolt_read_issues`
- then another `Orchestrator Responding`
- but no clearly finalized assistant answer yet in some flows

This means:
- Pi is loading and running
- tools are executing
- current debugging target is session-event-to-chat/finalization behavior after tool execution, not the original bootstrap issue

## Read first

### Product / planning docs
- `docs/plans/2026-03-05-embedded-pi-prd.md`
- `docs/plans/2026-03-05-embedded-pi-roadmap.md`

### Core implementation files
- `src/lib/pi-daemon-adapter.ts`
- `src/lib/bb-daemon.ts`
- `src/lib/embedded-daemon.ts`
- `src/lib/pi-runtime-detection.ts`
- `src/lib/orchestrator-chat.ts`
- `src/components/shared/orchestrator-panel.tsx`
- `src/components/shared/unified-shell.tsx`
- `src/components/activity/activity-panel.tsx`

### Working TUI reference
- `src/tui/bb-agent-tui.ts`
- `src/tui/system-prompt.ts`
- `src/tui/tools/bb-dolt-read.ts`
- `src/tui/tools/bb-deviation.ts`
- `src/tui/tools/bb-mailbox.ts`
- `src/tui/tools/bb-presence.ts`

## Immediate debugging objective

Compare the working TUI Pi session event handling against the embedded frontend daemon path and verify:
1. `thinking_delta` projection
2. `text_delta` projection
3. `text_done` projection
4. `agent_end` finalization
5. whether the orchestrator is truly hanging after tool completion or whether the frontend still is not projecting the final assistant turn correctly

## Important lessons already learned

- Do not render raw runtime telemetry directly in the left chat panel
- Project runtime/session events into user/assistant chat messages
- Keep telemetry in runtime console, not chat transcript
- Dedupe event ingestion across bootstrap fetch, SSE replay, optimistic inserts, and merged activity lists by event ID
- Pi streamed text uses `assistantMessageEvent.delta` for `text_delta`, matching the TUI
- When projecting assistant replies, do not merge across turns; reset merge state on each user message
- Prompt-triggered events must be pushed to live subscribers or the UI requires reloads
- Even when backend streaming is flaky, the left panel should optimistically show the user’s submitted message immediately

## Suggested next implementation order

1. Finish post-tool assistant completion / final reply handling
2. Harden shared Pi loader path so TUI and embedded daemon do not drift
3. Add worker-agent spawning support
4. Add archetype-backed execution config
5. Add template-first orchestration / deviation approval flow
6. Add tests for embedded Pi session/chat behavior

## Verification approach

Before claiming the embedded orchestrator is fully fixed, confirm all of these in the browser:
- user message appears immediately in left chat
- assistant reply appears without refresh
- second message works
- chat history preserves older turns
- bottom runtime console still shows tool telemetry
- no duplicate-key errors in runtime/chat/activity surfaces
- orchestrator completes at least one real prompt-turn end-to-end after using tools
