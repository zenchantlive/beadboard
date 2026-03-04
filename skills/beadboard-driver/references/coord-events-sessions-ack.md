# Coordination Events, Sessions, and Acknowledgment

## Purpose

Define how agents communicate status, blockers, incursions, and handoffs in a machine-readable way that BeadBoard can render and users can act on.

## Operating Model

- Agent works in a target repository.
- User watches and orchestrates from BeadBoard UI.
- Agent communication must flow through coordination events and inbox state transitions, not ad-hoc notes.

## Event Categories

Use explicit categories with clear intent:

- `HANDOFF`: transfer ownership or next action.
- `BLOCKED`: explicit dependency or missing input.
- `RESUME`: adoption/resumption event.
- `INFO`: milestone or important context.
- `INCURSION`: overlap/collision signal for reserved scope.

## Session Stream Expectations

Session feeds should be audit-friendly:

- Every coordination event has sender, recipient/system target, bead id, and timestamp.
- `INCURSION` and `RESUME` are first-class timeline rows, not hidden diagnostics.
- Events should be understandable by humans without reading implementation code.

## Message Lifecycle

Inbox state machine:

1. `unread` when message is delivered.
2. `read` when recipient opens/reads message.
3. `acked` when recipient explicitly acknowledges.

Required behavior:

- Only recipient may ack.
- Acks are explicit, not implied by read.
- Blocker and handoff flows should request ack when coordination certainty is required.

## Recommended Command Patterns

Send structured coordination event:

```bash
bb agent send \
  --from <agent-id> \
  --to <peer-agent-id> \
  --bead <bead-id> \
  --category <HANDOFF|BLOCKED|RESUME|INFO|INCURSION> \
  --subject "<short summary>" \
  --body "<actionable details>"
```

Read inbox for current bead/session work:

```bash
bb agent inbox --agent <agent-id> --state unread --bead <bead-id>
bb agent read --agent <agent-id> --message <message-id>
bb agent ack --agent <agent-id> --message <message-id>
```

## Coordination Contracts

### Handoff

A `HANDOFF` should include:

- what is done,
- what remains,
- concrete next action,
- whether ack is required.

### Blocked

A `BLOCKED` should include:

- blocker description,
- requested action,
- urgency,
- ack requirement.

### Incursion

An `INCURSION` should include:

- overlap kind (`exact` or `partial`),
- owner identity,
- incoming identity,
- owner liveness,
- resolution hint.

### Resume

A `RESUME` should include:

- resume reason,
- prior session identity,
- adopted identity,
- evidence summary for safe adoption.

## UX Alignment

Session UI should map event semantics to plain-language actions:

- Handoff label: "Passed to"
- Blocked label: "Needs input"
- Read action: "Seen"
- Ack action: "Accepted"

## Anti-Patterns

- Using comments instead of coordination events for handoffs.
- Silent reservation collisions with no `INCURSION`/`INFO` signal.
- Treating read as ack.
- Sending vague events with no actionable payload.
- Closing a blocked bead without tracking unblock communication.
