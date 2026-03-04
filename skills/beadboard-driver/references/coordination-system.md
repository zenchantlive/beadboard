# Coordination System Reference

This document is the canonical reference for BeadBoard agent coordination via `bb agent` and `bd mail` delegation.

## Command Surface

All commands are available through the global CLI:

```bash
bb agent <command> [flags]
```

### Identity Commands

Register/update an agent:

```bash
bb agent register --name silver-scribe --role ui [--display "Silver Scribe"] [--force-update]
```

List agents (optional filters):

```bash
bb agent list [--role ui] [--status working]
```

Show one agent:

```bash
bb agent show --agent silver-scribe
```

Refresh liveness lease:

```bash
bb agent activity-lease --agent silver-scribe
```

### Mail Commands

Send message:

```bash
bb agent send \
  --from silver-scribe \
  --to graph-scout \
  --bead beadboard-izs.4 \
  --category HANDOFF \
  --subject "UI wiring complete" \
  --body "Please verify graph parity" \
  [--thread bead:beadboard-izs.4]
```

List inbox:

```bash
bb agent inbox --agent graph-scout [--state unread|read|acked] [--bead beadboard-izs.4] [--limit 25]
```

Mark as read:

```bash
bb agent read --agent graph-scout --message msg_20260304_001122_abcd
```

Acknowledge:

```bash
bb agent ack --agent graph-scout --message msg_20260304_001122_abcd
```

### Reservation Commands

Reserve scope:

```bash
bb agent reserve --agent silver-scribe --scope src/components/social --bead beadboard-izs.4 [--ttl 120] [--takeover-stale]
```

Release scope:

```bash
bb agent release --agent silver-scribe --scope src/components/social
```

Show reservation/message status:

```bash
bb agent status [--agent silver-scribe] [--bead beadboard-izs.4]
```

## Message Model

Categories:
- `HANDOFF`
- `BLOCKED`
- `DECISION`
- `INFO`

States:
- `unread`
- `read`
- `acked`

State machine:
- `unread -> read -> acked`
- `ack` on unread implicitly sets `read_at` and `acked_at`

Required acknowledgment:
- `requires_ack=true` for `HANDOFF` and `BLOCKED`
- `requires_ack=false` for `DECISION` and `INFO`

## WHEN-to-Use Trigger Map

1. Task completed and ownership moves to another agent: send `HANDOFF`.
2. Work blocked by dependency, missing input, or failing environment: send `BLOCKED`.
3. Input needed but not a hard blocker: send `DECISION`.
4. FYI telemetry or non-blocking update: send `INFO`.
5. You receive a required-ack (`HANDOFF`/`BLOCKED`) message and have processed it: run `ack`.
6. You receive a message and need to indicate it was seen but not completed: run `read`.
7. You start modifying a scoped area: `reserve`.
8. You finish scoped work: `release`.

## Inbox Polling Protocol

Minimum polling moments:
- Session start (before claiming work)
- Before switching beads
- Before closing a bead
- Whenever local state becomes stuck

Recommended interval:
- Every 60-120 seconds during active execution

Handling required-ack backlog:
- Prioritize unacked `BLOCKED` first, then `HANDOFF`
- If action taken, run `ack` immediately
- If waiting on external input, reply with `DECISION` or `INFO` and keep task status accurate

## Reservation Conflict Policy

Conflict semantics for same/overlapping scope:
- Active owner blocks takeover: `RESERVATION_CONFLICT`
- Stale/evicted/expired owner requires explicit intent: `RESERVATION_STALE_FOUND` unless `--takeover-stale`
- Same owner can refresh reservation without conflict

Operational rule:
- Never force takeover without `--takeover-stale` when warned
- Include bead id in every reserve action for traceability

## Worked HANDOFF Flow (End-to-End)

1. Sender completes implementation:
```bash
bb agent send \
  --from silver-scribe \
  --to graph-scout \
  --bead beadboard-izs.4 \
  --category HANDOFF \
  --subject "Social badges complete" \
  --body "Please validate edge cases and close" 
```

2. Recipient checks inbox:
```bash
bb agent inbox --agent graph-scout --state unread
```

3. Recipient reads details:
```bash
bb agent read --agent graph-scout --message <message-id>
```

4. Recipient validates and accepts handoff:
```bash
bb agent ack --agent graph-scout --message <message-id>
```

5. Recipient proceeds with assigned bead work and updates `bd` status/notes.

## `bd mail` Delegate Setup (bb-backed)

`bd mail` delegates to external provider using:
- `BEADS_MAIL_DELEGATE` / `BD_MAIL_DELEGATE` env vars
- or `mail.delegate` config key

For BeadBoard driver skill, session preflight configures:

```bash
bd config set mail.delegate "node <abs-path>/skills/beadboard-driver/scripts/bb-mail-shim.mjs"
```

Then:
- `bd mail inbox` -> `bb agent inbox --agent <BB_AGENT>`
- `bd mail send ...` -> `bb agent send --from <BB_AGENT> ...`
- `bd mail read <id>` -> `bb agent read --agent <BB_AGENT> --message <id>`
- `bd mail ack <id>` -> `bb agent ack --agent <BB_AGENT> --message <id>`

Required env:

```bash
export BB_AGENT=silver-scribe
```

Fallback behavior if `bb` is missing:
- Shim exits non-zero and prints: `bb-mail-shim: bb command not found in PATH.`
