# Plan: Agent Sessions UX v1 (Task-First Social Feed, Epic-Organized) + Next-Session Execution Prompt

  ## Summary

  Implement bb-u6f as a distinct “session operations” surface with this locked UX model:

  - Information architecture: Epic Buckets -> Sortable Task Feed -> Conversation Drawer
  - Interaction style: social-thread feel on each task/session card (Facebook-group-like), but operationally
    strict
  - Communication language: plain labels (Passed to, Needs input, Seen, Accepted)
  - Write scope v1: Read + light write only (bd comments + bb read/ack), not full bb send/reserve composer
  - Core requirement: users can sort tasks easily, click any task, view conversation context, and add comments/ack
    actions inline

  This keeps one coherent page model (no lane clutter) while making communication prominent and auditable.

  ———

  ## Current State (Grounded Facts)

  - Timeline foundation exists and is implemented (/timeline, activity bus, activity API).
  - bb-xhm.1/.2/.3 are closed, so timeline dependency work is technically done.
  - bb-u6f.1/.2/.3 remain open and are the right implementation target.
  - Agent communication backend exists (agent-registry, agent-mail, agent-reservations), with tested command
    handlers.
  - bb CLI now supports discoverable help and stable invocation patterns.

  ———

  ## UX/Product Spec (Decision Complete)

  ## 1. Primary Page

  - New route: /sessions
  - Top area:
      - Session hero title/subtitle
      - Epic bucket chips (default = “All Epics”)
      - Sort controls
      - Live summary pills: In Progress, Needs Input, Waiting Seen/Accepted, Idle Agents
  - Main area:
      - Task/session feed cards (single-column mobile, two-column desktop)
  - Drilldown:
      - Right-side (desktop) / bottom-sheet (mobile) conversation drawer for selected task

  ## 2. Feed Card Structure

  Each card represents one task in session context:

  - Task identity: id, title, epic, priority
  - Work status: open/in_progress/blocked/deferred/closed (existing truth from bd)
  - Session state (derived): Active, Reviewing, Deciding, Needs Input, Completed, Stale
  - Agent context:
      - current owner/assignee
      - last actor
      - last activity timestamp
  - Communication summary:
      - unread count
      - pending required Seen/Accepted
      - latest thread snippet
  - Quick actions:
      - Open conversation
      - Add comment (bd comment)
      - Mark Seen / Accepted on selected required message

  ## 3. Conversation Drawer

  - Header:
      - task id/title + current state chips
  - Body:
      - chronological thread items (task-related communication + key activity entries)
  - Composer area (v1):
      - Add comment (writes via existing beads comment API)
      - Seen / Accepted buttons for required messages (writes via agent-mail read/ack API wrappers)
  - Not in v1:
      - full bb send composer
      - reservation create/release controls

  ## 4. Plain-Language Label Mapping

  Use UI-only mappings while preserving underlying protocol values:

  - HANDOFF -> Passed to
  - BLOCKED -> Needs input
  - ACK required -> Seen / Accepted
  - INFO -> Update

  ———

  ## Important API / Interface Additions

  ## 1. New Session Aggregation Library

  - File: src/lib/agent-sessions.ts
  - Exports:
      - AgentSessionState union: active | reviewing | deciding | needs_input | completed | stale
      - SessionTaskCard interface
      - buildSessionTaskFeed(issues, activityEvents, communicationSummary) -> SessionTaskCard[]
  - Rules:
      - Group primarily by task (bead id) under epic buckets
      - derive state from status + recent activity + pending ack-required messages

  ## 2. New API Endpoints

  - GET /api/sessions
      - Returns epic-grouped, sortable task feed payload
      - Query params:
          - epic (optional)
          - sort (recent|priority|needs_input|owner)
          - projectRoot (optional)
  - GET /api/sessions/:beadId/conversation
      - Returns conversation timeline for one task
      - Includes:
          - relevant activity events
          - related agent-mail messages
  - POST /api/sessions/:beadId/comment
      - Proxy to existing beads comment route
  - POST /api/sessions/:beadId/messages/:messageId/read
  - POST /api/sessions/:beadId/messages/:messageId/ack
      - Wrap readAgentMessage/ackAgentMessage

  ## 3. Frontend Components

  - src/app/sessions/page.tsx
  - src/components/sessions/sessions-page.tsx
  - src/components/sessions/session-feed-card.tsx
  - src/components/sessions/conversation-drawer.tsx
  - src/components/sessions/sessions-filters.tsx
  - Reuse: workspace-hero, epic-chip-strip, shared stat/chip primitives

  ———

  ## Data Flow

  1. Server loads project-scoped issues + activity history + communication summary.
  2. buildSessionTaskFeed derives card model.
  3. Client renders epic bucket + sorted feed.
  4. Selecting a card fetches conversation endpoint.
  5. Comment/read/ack actions call session endpoints; optimistic update local drawer/feed state.
  6. SSE activity updates prepend to session feed and refresh affected card state.

  ———

  ## Edge Cases / Failure Modes (Must Implement)

  1. Task has no communication history: show “No conversation yet” empty state.
  2. Message flood: collapse older thread items with “show more.”
  3. Conflicting reactions (Accepted + Needs changes semantics): show conflict chip.
  4. Stale tasks: mark stale when no activity above threshold.
  5. Missing owner: warning badge Unassigned.
  6. Cross-epic ambiguity: fall back to “Uncategorized” bucket.
  7. Broken communication read/ack call: non-destructive error toast, no status corruption.
  8. SSE disconnection: fallback polling + reconnection indicator.
  9. Unknown protocol category: display as generic Update.

  ———

  ## Testing & Verification Plan

  ## Unit Tests

  - tests/lib/agent-sessions.test.ts
      - state derivation rules
      - bucket grouping by epic
      - sort behavior
      - plain-language mapping

  ## API Tests

  - tests/api/sessions-route.test.ts
      - /api/sessions filters/sorts
      - conversation payload shape
      - comment/read/ack endpoints success + error paths

  ## UI/Behavior Tests

  - tests/components/sessions/*.test.tsx (or existing project pattern equivalent)
      - feed render
      - drawer open/close
      - action button behavior
      - plain labels rendered

  ## Gate Commands

  - npm run typecheck
  - npm run lint
  - npm run test

  ———

  ## Bead Sequencing / Dependency Hygiene

  1. Verify/repair stale blockers:
      - update bb-u6f dependency on bb-xhm to reflect closed timeline tasks if needed.
  2. Execute in order:
      - bb-u6f.1 (data model + aggregation)
      - bb-u6f.2 (session feed UI + conversation drawer)
      - bb-u6f.3 (metrics overlays)
  3. Close bb-u6f only after full gates pass and notes include evidence.

  ———

  ## Assumptions / Defaults

  - Existing timeline/activity infrastructure remains source for historical events.
  - bd remains lifecycle authority; session UI does not bypass bead mutation constraints.
  - Communication prominence is achieved through conversation drawer + card summary, not a separate inbox app.
  - v1 write scope is intentionally limited to comment/read/ack.

  ———

  ## Ready-to-Paste Next-Session Prompt

  You are taking over bb-u6f implementation in C:\Users\Zenchant\codex\beadboard on branch feat/ui-polish-aero-
  chrome.

  Non-negotiables:

  - No direct writes to .beads/issues.jsonl
  - Use bd for lifecycle writes and existing API wrappers for comment/read/ack
  - Keep UX distinct from Kanban/Graph; this is a session operations page
  - Communication must be prominent and plain-language (no HANDOFF/BLOCKED/ACK jargon shown raw)
  - Evidence before assertions (run gates before close claims)

  Build target:

  - New /sessions page with Epic Buckets -> Sortable Task Feed -> Conversation Drawer
  - Feed cards are task/session objects with work status + communication summary
  - Drawer shows thread + light write actions:
      - add bd comment
      - mark message Seen / Accepted (read/ack)

  Implement files:

  - src/lib/agent-sessions.ts
  - src/app/api/sessions/route.ts
  - src/app/api/sessions/[beadId]/conversation/route.ts
  - src/app/api/sessions/[beadId]/comment/route.ts
  - src/app/api/sessions/[beadId]/messages/[messageId]/read/route.ts
  - src/app/api/sessions/[beadId]/messages/[messageId]/ack/route.ts
  - src/app/sessions/page.tsx
  - src/components/sessions/* (page, card, drawer, filters)

  Label mapping (UI):

  - HANDOFF => Passed to
  - BLOCKED => Needs input
  - required ack => Seen / Accepted
  - INFO => Update

  Edge handling required:

  - empty conversation
  - stale sessions
  - unassigned task
  - SSE disconnect fallback
  - unknown message category safe render

  Tests required:

  - tests/lib/agent-sessions.test.ts
  - tests/api/sessions-route.test.ts
  - session component behavior tests per existing project pattern

  Execution order:

  1. claim bb-u6f.1 and implement aggregation + tests
  2. claim bb-u6f.2 and implement page/drawer + tests
  3. claim bb-u6f.3 and implement metrics + tests
  4. run:
      - npm run typecheck
      - npm run lint
      - npm run test
  5. post evidence in bead notes, then close beads in dependency order

  Before closing anything:

  - verify bb-u6f dependency bookkeeping is accurate (timeline blocker stale check)
  - include exact command outputs in notes