# bb agent CLI Contract (bb-dcv.2)

Date: 2026-02-13  
Owner: `bb-dcv.2`  
Status: Draft implementation contract

## 1) Scope

Define exact command and data contracts for the thin coordination layer:
1. `register`, `list`, `show`
2. `send`, `inbox`, `read`, `ack`
3. `reserve`, `release`, `status`

Out of scope:
1. Beads lifecycle/dependency mutation semantics.
2. MCP transport.
3. Skill packaging (`bb-dcv.8`).

## 2) System Boundary

Source of truth split:
1. `bd` owns issue lifecycle, status, dependencies, and claim.
2. `bb agent` owns coordination metadata (identity, messages, reservations).

Hard rule:
1. No direct writes to `.beads/issues.jsonl`.

## 3) Root Paths and Storage

Root:
1. `.beadboard/agent/`

Layout:
1. `.beadboard/agent/agents/<agent_id>.json`
2. `.beadboard/agent/messages/<agent_id>.jsonl` (recipient inbox stream)
3. `.beadboard/agent/messages/index/<message_id>.json` (message metadata)
4. `.beadboard/agent/reservations/active.json`
5. `.beadboard/agent/reservations/history.jsonl`

File semantics:
1. `*.json` files are full-state snapshots.
2. `*.jsonl` files are append-only event logs.
3. Timestamps use UTC ISO-8601.

## 4) Common CLI Conventions

Output modes:
1. Human-readable default.
2. `--json` machine-readable.

Common JSON response envelope:
```json
{
  "ok": true,
  "command": "agent send",
  "data": {},
  "error": null
}
```

Error envelope:
```json
{
  "ok": false,
  "command": "agent send",
  "data": null,
  "error": {
    "code": "UNKNOWN_RECIPIENT",
    "message": "Recipient agent is not registered."
  }
}
```

## 5) Identity Commands

### 5.1 `bb agent register`

Input:
1. `--name <agent_id>` required.
2. `--display <display_name>` optional.
3. `--role <role>` required.
4. `--force-update` optional (updates display/role only; never renames id).

Validation:
1. `agent_id` regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
2. `agent_id` length: 3..48.
3. `role` non-empty.

Behavior:
1. Create new agent if not present.
2. If present and no `--force-update`, fail with `DUPLICATE_AGENT_ID`.
3. Set `status=idle` on create.

Stored schema (`agents/<agent_id>.json`):
```json
{
  "agent_id": "agent-ui-1",
  "display_name": "UI Agent 1",
  "role": "ui",
  "status": "idle",
  "created_at": "2026-02-13T22:00:00.000Z",
  "last_seen_at": "2026-02-13T22:00:00.000Z",
  "version": 1
}
```

### 5.2 `bb agent list`

Input:
1. `--role <role>` optional filter.
2. `--status <status>` optional filter.

Output:
1. Sorted by `agent_id` asc.

### 5.3 `bb agent show`

Input:
1. `--agent <agent_id>` required.

Errors:
1. `AGENT_NOT_FOUND`.

## 6) Messaging Commands

Message categories:
1. `HANDOFF`
2. `BLOCKED`
3. `DECISION`
4. `INFO`

Ack policy:
1. Required for `HANDOFF`, `BLOCKED`.
2. Optional for `DECISION`, `INFO`.

Message schema:
```json
{
  "message_id": "msg_20260213_220001_7f3c",
  "thread_id": "bead:bb-dcv.6",
  "bead_id": "bb-dcv.6",
  "from_agent": "agent-ui-1",
  "to_agent": "agent-graph-1",
  "category": "HANDOFF",
  "subject": "Edge direction patch ready",
  "body": "Graph directionality normalized. Please validate screenshots.",
  "state": "unread",
  "requires_ack": true,
  "created_at": "2026-02-13T22:00:01.000Z",
  "read_at": null,
  "acked_at": null
}
```

### 6.1 `bb agent send`

Input:
1. `--from <agent_id>` required.
2. `--to <agent_id|broadcast>` required.
3. `--bead <bead_id>` required.
4. `--category <HANDOFF|BLOCKED|DECISION|INFO>` required.
5. `--subject <text>` required.
6. `--body <text>` required.
7. `--thread <thread_id>` optional (default `bead:<bead_id>`).

Validation:
1. Sender and recipient must be registered (`broadcast` exempt).
2. `bead_id` required, non-empty.
3. `subject` and `body` non-empty.

Errors:
1. `UNKNOWN_SENDER`
2. `UNKNOWN_RECIPIENT`
3. `MISSING_BEAD_ID`
4. `INVALID_CATEGORY`

### 6.2 `bb agent inbox`

Input:
1. `--agent <agent_id>` required.
2. `--state <unread|read|acked>` optional.
3. `--bead <bead_id>` optional.
4. `--limit <n>` optional, default `50`, max `500`.

Output order:
1. `created_at` desc.

### 6.3 `bb agent read`

Input:
1. `--agent <agent_id>` required.
2. `--message <message_id>` required.

Behavior:
1. Mark `state=read` if currently `unread`.
2. Keep `acked` as terminal.

### 6.4 `bb agent ack`

Input:
1. `--agent <agent_id>` required.
2. `--message <message_id>` required.

Validation:
1. Only recipient may ack.
2. `requires_ack=false` messages may still be acked.

Behavior:
1. Set `state=acked`.
2. Set `acked_at` if null.

Errors:
1. `MESSAGE_NOT_FOUND`
2. `ACK_FORBIDDEN`

## 7) Reservation Commands

Reservation schema:
```json
{
  "reservation_id": "res_20260213_220900_e1a4",
  "scope": "src/components/graph/*",
  "agent_id": "agent-graph-1",
  "bead_id": "bb-dcv.4",
  "state": "active",
  "created_at": "2026-02-13T22:09:00.000Z",
  "expires_at": "2026-02-14T00:09:00.000Z",
  "released_at": null
}
```

### 7.1 `bb agent reserve`

Input:
1. `--agent <agent_id>` required.
2. `--scope <scope>` required.
3. `--bead <bead_id>` required.
4. `--ttl <minutes>` optional, default `120`, range `5..1440`.
5. `--takeover-stale` optional.

Behavior:
1. If active reservation exists and not expired, fail with `RESERVATION_CONFLICT`.
2. If expired and `--takeover-stale` absent, return `RESERVATION_STALE_FOUND`.
3. If expired and `--takeover-stale`, mark old as expired and create new active record.

### 7.2 `bb agent release`

Input:
1. `--agent <agent_id>` required.
2. `--scope <scope>` required.

Behavior:
1. Only owner may release active reservation.
2. Mark as `released` and append history event.

Errors:
1. `RESERVATION_NOT_FOUND`
2. `RELEASE_FORBIDDEN`

### 7.3 `bb agent status`

Input:
1. `--bead <bead_id>` optional.
2. `--agent <agent_id>` optional.

Output:
1. Active reservations.
2. Unacked required-ack messages.
3. Optional summary counts by state.

## 8) Cross-Command Invariants

1. Every message and reservation must include `bead_id`.
2. Deleting coordination data is disallowed in v1.
3. `message_id` and `reservation_id` are globally unique.
4. All write operations are atomic at file level (write temp + rename).

## 9) Error Code Registry (v1)

1. `INVALID_ARGS`
2. `AGENT_NOT_FOUND`
3. `DUPLICATE_AGENT_ID`
4. `UNKNOWN_SENDER`
5. `UNKNOWN_RECIPIENT`
6. `MISSING_BEAD_ID`
7. `INVALID_CATEGORY`
8. `MESSAGE_NOT_FOUND`
9. `ACK_FORBIDDEN`
10. `RESERVATION_CONFLICT`
11. `RESERVATION_STALE_FOUND`
12. `RESERVATION_NOT_FOUND`
13. `RELEASE_FORBIDDEN`
14. `IO_WRITE_FAILED`
15. `IO_READ_FAILED`

## 10) Test Matrix for Follow-on Tasks

Identity (`bb-dcv.7`):
1. Register success.
2. Duplicate fails.
3. Force update allowed.
4. Show/list filters.

Mail (`bb-dcv.6`):
1. Send success.
2. Unknown sender/recipient failure.
3. Inbox state filtering.
4. Read transition (`unread` -> `read`).
5. Ack transition to `acked`.

Reservations (`bb-dcv.4`):
1. Reserve success.
2. Conflict on active reservation.
3. Expired stale detection.
4. Takeover stale flow.
5. Owner-only release.

Workflow (`bb-dcv.5`):
1. `bd --claim` + `bb agent` happy path.
2. Missing bead id rejection.
3. Status summary correctness with mixed states.

