# BD Audit Coordination Schema (Draft)

Date: 2026-02-28  
Status: Draft for skill migration planning  
Scope: Replace `bb` coordination semantics with `bd`-native event/audit contracts

Related protocol baseline:
- `docs/protocols/operative-protocol-v1.md`

## Intent

Use `bd` as the only required system in agent work repos. Keep coordination state in append-only audit events, and keep human context in bead comments.

Primary storage:
- protocol state: `bd audit record --stdin`
- lifecycle state: `bd update`, `bd close`, `bd agent state`, `bd agent heartbeat`
- narrative context: `bd comments add`

## Why Audit-First

1. Append-only event log fits protocol timelines.
2. Dolt history gives immutable version snapshots and diffability across event evolution.
3. Frontend projections (inbox, reservation map, takeover eligibility) can be derived deterministically from event history.

## Event Envelope (v1)

Every coordination event SHOULD use this envelope (JSON sent through `bd audit record --stdin`):

```json
{
  "version": "coord.v1",
  "kind": "coord_event",
  "issue_id": "bb-123",
  "actor": "amber-otter",
  "timestamp": "2026-02-28T18:00:00.000Z",
  "data": {
    "event_type": "RESERVE",
    "event_id": "evt_01JN6Y1Q7R80E8P6K1Q5",
    "project_root": "/abs/path/to/repo",
    "to_agent": "cobalt-harbor",
    "scope": "src/lib/*",
    "state": "unread",
    "takeover_mode": "none",
    "reason": "",
    "payload": {}
  }
}
```

Notes:
- `kind` remains compatible with `bd audit` entry typing.
- protocol-specific fields live under `data`.
- `event_id` MUST be globally unique and stable for dedupe.

## Canonical Event Types

Required for parity with current `bb` behavior:
1. `SEND`: directed message created (`to_agent` required, `state=unread`)
2. `READ`: message seen (`event_ref` to prior `SEND`)
3. `ACK`: message accepted (`event_ref` to prior `SEND`)
4. `RESERVE`: scope reservation created
5. `RELEASE`: scope reservation released
6. `TAKEOVER`: stale/evicted reservation force-acquired
7. `RESUME`: identity adoption event
8. `BLOCKED`: explicit blocker signal
9. `HANDOFF`: explicit transfer signal
10. `INCURSION`: overlap warning signal

## Required Fields by Event

Shared required fields:
- `event_type`
- `event_id`
- `project_root`
- `issue_id`
- `actor`
- `timestamp`

Extra required fields:
- `SEND`: `to_agent`, `payload.subject`, `payload.body`
- `READ`: `event_ref`
- `ACK`: `event_ref`
- `RESERVE`: `scope`, `payload.ttl_minutes`
- `RELEASE`: `scope`
- `TAKEOVER`: `scope`, `takeover_mode` (`stale` | `evicted`), `reason`
- `RESUME`: `payload.prior_agent`, `reason` (`uncommitted_scope` | `in_progress_ownership`)
- `BLOCKED`: `to_agent`, `payload.blocker`, `payload.requested_action`
- `HANDOFF`: `to_agent`, `payload.summary`, `payload.next_action`
- `INCURSION`: `scope`, `payload.incursion_kind` (`exact` | `partial`), `payload.owner_liveness`

## Derivation Rules (Frontend/API)

Inbox projection:
- unread: `SEND` with no later `READ`/`ACK` on same `event_id`
- read: `READ` exists, no later `ACK`
- acked: `ACK` exists

Reservation projection:
- active reservation = latest event for `(project_root, scope)` is `RESERVE` or `TAKEOVER` and not superseded by `RELEASE`
- owner liveness from `bd agent heartbeat/state`

Takeover policy:
- owner active: deny takeover
- owner stale: allow only explicit stale takeover mode
- owner evicted: allow takeover and mark prior reservation expired in projection

## Dolt Considerations

1. Never rewrite prior protocol events; only append.
2. Treat projections as computed views, never source of truth.
3. Use Dolt history for postmortems (`bd history`/`bd diff`) against protocol incidents.
4. Keep schema versioned (`coord.v1` -> future upgrades by additive fields and new event types).

## Skill Migration Guidance (Later Work)

When updating `skills/beadboard-driver`, use this contract:
1. Replace `bb agent send/inbox/read/ack` with `bd audit` event writes + API-derived inbox reads.
2. Replace `bb reserve/release/status` with `bd audit` reservation events + API overlap/liveness checks.
3. Keep `bd` lifecycle commands unchanged.
4. Keep human summaries in `bd comments` for operator readability.
