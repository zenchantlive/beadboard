# Coordination Events, Sessions, and Acknowledgment

This guide defines how agents coordinate work using the live BeadBoard surface:
- `bb agent send|inbox|read|ack`
- `bd mail` delegated to `bb agent` through `bb-mail-shim.mjs`

For full command reference, see `coordination-system.md`.

## Canonical Event Categories

Use only these categories:
- `HANDOFF`
- `BLOCKED`
- `DECISION`
- `INFO`

Do not use deprecated categories such as `RESUME` or `INCURSION`.

## Message Lifecycle and ACK Rules

Message states are:
- `unread`
- `read`
- `acked`

Rules:
- `HANDOFF` and `BLOCKED` set `requires_ack=true` automatically.
- `DECISION` and `INFO` set `requires_ack=false`.
- `bb agent ack` on an unread message advances state to `acked` and sets both read/ack timestamps.
- Only the recipient can `read`/`ack` a message.

## WHEN-to-Use Trigger Map

1. You finished your slice and someone else now owns the next step: send `HANDOFF`.
2. You are hard blocked by dependency/input/env: send `BLOCKED` and set your agent state to `stuck`.
3. You need a decision but can still make partial progress: send `DECISION`.
4. You want traceable FYI context (milestone, caveat, pointer): send `INFO`.
5. You receive `HANDOFF`/`BLOCKED` and have taken responsibility: run `read` then `ack`.
6. You receive actionable mail before claiming a bead: process inbox first, then claim.
7. You are stuck after retries: poll inbox, send/refresh `BLOCKED`, keep state `stuck` until unblocked.

## Inbox Polling Protocol

Minimum checkpoints:
- session start
- immediately before claiming a bead
- before closing a bead
- whenever local execution becomes stuck

Recommended during active execution:
- poll every 60-120 seconds

Commands:

```bash
bb agent inbox --agent <agent-id> --state unread --limit 25
bb agent read --agent <agent-id> --message <message-id>
bb agent ack --agent <agent-id> --message <message-id>
```

## Worked BLOCKED Flow (End-to-End)

1. Agent hits a blocker and notifies coordinator/peer.

```bash
bb agent send \
  --from amber-otter \
  --to lead-orchestrator \
  --bead beadboard-maf.8 \
  --category BLOCKED \
  --subject "Cannot run mail contract test" \
  --body "bd mail delegate missing in this repo; need delegate config or approval to run preflight patch"
```

2. Agent marks itself stuck for BeadBoard liveness/Witness surface.

```bash
bd agent state amber-otter stuck
```

3. User sees the blocked signal in BeadBoard UI and intervenes (provides input, clears dependency, or updates config).

4. Agent checks inbox and reads response.

```bash
bb agent inbox --agent amber-otter --state unread
bb agent read --agent amber-otter --message <message-id>
```

5. If the response resolved the blocker, agent acknowledges and resumes.

```bash
bb agent ack --agent amber-otter --message <message-id>
bd agent state amber-otter running
```

6. Agent resumes bead execution and continues heartbeat + evidence updates.

## `bd mail` Delegate Path (Alternative Invocation)

`bd mail` should delegate to the BeadBoard mail shim:

```bash
bd config set mail.delegate "node <abs-path>/skills/beadboard-driver/scripts/bb-mail-shim.mjs"
export BB_AGENT=<agent-id>
```

Delegate mapping:
- `bd mail send ...` -> `bb agent send --from <BB_AGENT> ...`
- `bd mail inbox ...` -> `bb agent inbox --agent <BB_AGENT> ...`
- `bd mail read <id>` -> `bb agent read --agent <BB_AGENT> --message <id>`
- `bd mail ack <id>` -> `bb agent ack --agent <BB_AGENT> --message <id>`

If delegate is missing or invalid, run:

```bash
node skills/beadboard-driver/scripts/ensure-bb-mail-configured.mjs
```

## Reservation Conflict Protocol

Use reservations before editing contested scope:

```bash
bb agent reserve --agent <agent-id> --scope <path-or-surface> --bead <bead-id>
```

Conflict handling:
- Active reservation conflict: stop and coordinate through mail.
- Stale reservation warning: retry with `--takeover-stale` only after explicit coordination.

Release when done:

```bash
bb agent release --agent <agent-id> --scope <path-or-surface>
```
