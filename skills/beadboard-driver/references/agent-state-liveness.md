# Agent State and Liveness

This reference explains how agents report live status in BeadBoard using `bd agent` and `bd slot`.

## Why This Exists

Two things must always be visible:
- Current execution state (idle, working, blocked, done, etc.)
- Current work attachment (which bead the agent is actively hooked to)

If either signal is missing, orchestration quality drops.

## State Model (ZFC)

Use `bd agent state <agent-bead-id> <state>` with these values:

- `idle`: no current task, waiting for assignment
- `spawning`: session boot and environment checks in progress
- `running`: agent process is healthy and active
- `working`: agent is actively executing claimed bead work
- `stuck`: blocked and requires external intervention
- `done`: finished current assignment and ready to close out
- `stopped`: clean shutdown or deliberate pause
- `dead`: missed heartbeat long enough to be considered dead (Witness timeout path)

## Command Examples for State Transitions

Session start:

```bash
bd agent state bb-silver-scribe spawning
bd agent state bb-silver-scribe running
```

Work claim:

```bash
bd update beadboard-123 --status in_progress --assignee bb-silver-scribe
bd slot set bb-silver-scribe hook beadboard-123
bd agent state bb-silver-scribe working
```

Blocked condition:

```bash
bd agent state bb-silver-scribe stuck
bd mail send --to cobalt-ridge --bead beadboard-123 --category BLOCKED --subject "Waiting on schema" --body "Need migration direction before continuing."
```

Work completion:

```bash
bd agent state bb-silver-scribe done
bd slot clear bb-silver-scribe hook
```

Session end:

```bash
bd agent state bb-silver-scribe stopped
```

Inspect current state:

```bash
bd agent show bb-silver-scribe
```

## Heartbeats

Use `bd agent heartbeat <agent-bead-id>` to refresh `last_activity` without changing state.

```bash
bd agent heartbeat bb-silver-scribe
```

**Daemon agents (persistent processes):**
- Normal work: every 5 minutes
- High-risk long operations: every 2-3 minutes
- Immediately before long test/build phases
- Immediately after recovering from interruptions

**LLM agents (Claude Code, turn-based):**
- At turn start (when picking up work)
- Immediately before long-running commands
- Inter-turn silence is expected and not a health signal

## Witness Death Timeout

If heartbeats are missed long enough, the Witness/monitoring path can treat the agent as dead and surface `dead` state.

Operational interpretation:
- `stale`: heartbeat lag is visible, but agent may recover
- `evicted`: prolonged lag, high confidence agent is unhealthy
- `idle`/`dead`: no reliable active signal remains

Agent-side rule:
- If you are alive and still executing, heartbeat before anyone has to guess.

> **Current status:** The Witness enforcement layer is not yet running. Heartbeats are recorded in `last_activity` and visible in the BeadBoard dashboard but are not currently auto-enforced. Agents will not be auto-marked `dead`. Daemon implementation is a future epic.

## Slot Operations (Current Work Attachment)

The `hook` slot links an agent bead to the active task bead.

Show slots:

```bash
bd slot show bb-silver-scribe
```

Attach current work:

```bash
bd slot set bb-silver-scribe hook beadboard-123
```

Detach on completion or handoff:

```bash
bd slot clear bb-silver-scribe hook
```

Important slot constraints:
- `hook` is single-cardinality; clear before replacing
- stale hooks create misleading UI and should be cleared promptly

## BLOCKED Signal Standard

When blocked:
1. Set state to stuck (`bd agent state ... stuck`)
2. Send explicit BLOCKED coordination event (`bd mail send --category BLOCKED ...`)
3. Keep heartbeat active while waiting
4. Resume with `running`/`working` once unblocked

This sequence ensures both machine-readable telemetry and human-readable intervention context.
