# RFC-001 Agent Coordination Protocol

Date: 2026-02-13  
Owner: `bb-dcv.1`  
Status: Draft  
Scope: Define a CLI-first, issue-linked protocol for multi-agent coordination in BeadBoard.

## 0) Reference Position

`mcp_agent_mail` is used as a pattern reference only (identity registration, inbox/ack workflow, reservations).  
We are not integrating MCP mail transport into BeadBoard for this phase.

Decision:
1. Borrow concepts.
2. Implement a local thin-layer `bb agent` CLI.
3. Keep Beads as issue/dependency system of record.

## 1) Problem Statement

BeadBoard needs reliable agent-to-agent coordination that does not depend on chat context and does not mutate `.beads/issues.jsonl` directly. Today, ownership is partially covered by Beads (`bd update --claim`), but directed communication, acknowledgements, and short-lived work-surface reservations are not standardized.

This RFC defines:
1. Agent identity conventions.
2. Handoff/blocker/decision communication protocol.
3. Assignment/claim expectations.
4. The required thin-layer `bb agent` CLI capabilities.

## 2) Design Goals and Non-Goals

Goals:
1. Keep Beads as source of truth for issue lifecycle and dependencies.
2. Add durable coordination metadata with clear auditability.
3. Require explicit bead linkage for coordination events.
4. Support parallel work without accidental overlap.

Non-goals:
1. Replacing Beads issue state with a new tracker.
2. Direct writes to Beads JSONL outside `bd`.
3. Introducing MCP requirements for core local workflows.

## 3) Identity Standard

Each automation participant uses a stable `agent_id` (example: `agent-ui-1`, `agent-graph-1`).

Rules:
1. `agent_id` is globally unique within a repo.
2. `agent_id` is immutable after registration.
3. Operator identity and agent identity are both retained in logs.

Canonical fields:
1. `agent_id`
2. `display_name`
3. `role` (`ui`, `graph`, `infra`, `qa`, etc.)
4. `created_at`
5. `last_seen_at`
6. `status` (`idle`, `working`, `blocked`, `done`)

## 4) Assignment and Ownership Protocol

Ownership remains Beads-native:
1. Claim issue with `bd update <id> --claim`.
2. Move lifecycle through normal `bd` commands.
3. Use Beads dependencies as execution truth.

Agent protocol requirements:
1. Every coordination message includes `bead_id`.
2. Any handoff sets a clear next owner or recipient.
3. Any blocker message includes a requested action and urgency.

## 5) Communication Protocol

Message categories:
1. `HANDOFF`: work transition with current state and next action.
2. `BLOCKED`: hard blocker requiring external action.
3. `DECISION`: decision record with rationale.
4. `INFO`: non-blocking operational context.

Required message envelope:
1. `message_id`
2. `thread_id` (default `bead:<id>`)
3. `bead_id`
4. `from_agent`
5. `to_agent` (or `broadcast`)
6. `category`
7. `subject`
8. `body`
9. `created_at`
10. `state` (`unread`, `read`, `acked`)

Ack requirement:
1. `BLOCKED` and `HANDOFF` messages require acknowledgement.
2. `DECISION` and `INFO` acknowledgements are optional.

## 6) Reservation Protocol

Reservations are advisory by default with TTL:
1. Reserve scope before edits on contested surfaces.
2. Scope examples: `src/components/graph/*`, `kanban-surface`, `api/mutations`.
3. Expired reservations are considered stale and available for takeover.

Required reservation fields:
1. `reservation_id`
2. `scope`
3. `agent_id`
4. `bead_id`
5. `created_at`
6. `expires_at`
7. `state` (`active`, `released`, `expired`)

## 7) Gap Analysis (Current vs Required)

Available now:
1. `bd update --claim` provides atomic issue claim.
2. `bd` dependency graph provides blocked/ready sequencing.
3. `bd agent state/heartbeat` can report liveness for agent beads.

Missing (must be added):
1. Agent registration and identity registry commands.
2. Directed message transport with unread/read/acked lifecycle.
3. Reservation commands with TTL and stale handling.
4. Unified status view tying claim + message + reservation state.

Command matrix:
1. Have now: `bd update --claim`, `bd update`, `bd close`, `bd dep`, `bd comments`.
2. Need build: `bb agent register/list/show`.
3. Need build: `bb agent send/inbox/read/ack`.
4. Need build: `bb agent reserve/release/status`.

Failure modes to handle:
1. Duplicate `agent_id` registration.
2. Unknown sender or recipient in send flow.
3. Missing `bead_id` on required message categories.
4. Reservation conflicts and stale-expiry takeover behavior.
5. Ack on unknown or already terminal message state.

## 8) Required Thin-Layer CLI Surface

Proposed commands (`bb agent`):
1. `register`, `list`, `show`
2. `send`, `inbox`, `read`, `ack`
3. `reserve`, `release`, `status`

Storage:
1. `.beadboard/agent/agents/*.json`
2. `.beadboard/agent/messages/*.jsonl`
3. `.beadboard/agent/reservations/*.json`
4. `.beadboard/agent/index/*.json` (optional fast lookup)

Safety rules:
1. No direct writes to `.beads/issues.jsonl`.
2. Bead lifecycle mutations remain via `bd`.
3. All timestamps are UTC ISO-8601.

## 9) Acceptance Criteria Mapping

Identity covered: Section 3.  
Handoff covered: Sections 4 and 5 (`HANDOFF`).  
Blocker signaling covered: Sections 5 and 6 (`BLOCKED`, reservation escalation).  
Assignment covered: Section 4 (`bd --claim` as ownership source).  
Gap analysis covered: Section 7.

## 10) Rejected Alternatives

1. Full MCP-native mail integration now.
Reason: unnecessary platform dependency for immediate local workflow goals.

2. Keep coordination only in ad-hoc bead comments.
Reason: no directed inbox/ack semantics and weak reservation signaling.

3. Replace Beads lifecycle with custom coordination store.
Reason: duplicates existing dependency/lifecycle truth and raises migration risk.
