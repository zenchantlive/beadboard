# Missions and Realtime

## Purpose

Define how work assignments (missions) and realtime updates should behave so users can orchestrate external-repo execution from BeadBoard with confidence.

## Mission Model

A mission is an execution assignment bound to clear ownership and expected outputs.

Mission essentials:

- bead/epic scope,
- assigned owner,
- expected deliverable,
- dependency awareness,
- handoff path.

## Assignment Rules

- One active owner per bead-level mission.
- Multi-agent support is achieved through parallel missions, not shared ambiguous ownership.
- Mission assignment must be visible in BeadBoard and reflected in bead assignee/status fields.

## Mission Topology

Missions should align with dependency graph semantics:

- dependencies model execution order,
- independent missions can run in parallel,
- blocked missions must not be represented as ready work.

When topology changes, update bead dependency links first, then assignment communication.

## Realtime Contract

Realtime is the user visibility layer.

Expected sources:

- bead status updates,
- coordination events,
- reservation/lease changes,
- watcher/SSE refresh signals.

Expected outcomes:

- UI updates without manual refresh,
- consistent state across social/graph/session surfaces,
- event timeline continuity for audits.

## SSE/Event Behavior

Realtime streams should provide:

- monotonic event ids where supported,
- heartbeat behavior for long-lived connections,
- resilience to brief write bursts and file-watch jitter,
- eventual consistency with bead source of truth.

If stale-state is suspected, triage in this order:

1. Source-of-truth parity.
2. Read-path validation.
3. Watcher input coverage.
4. Event emission/subscription path.

## Agent Responsibilities

Agents must:

- emit meaningful coordination events during mission lifecycle,
- keep bead status and assignee current,
- provide verification evidence before close,
- avoid implicit/unlogged handoffs.

Agents must not:

- change BeadBoard UI project scope,
- rely on local assumptions not visible in event/state outputs.

## User Responsibilities

Users orchestrate control-plane actions in BeadBoard UI:

- scope selection,
- priority/assignment changes,
- intervention on blocked missions,
- monitoring mission and realtime health.

## Anti-Patterns

- Mission start without bead claim/assignee update.
- Hidden handoffs outside coordination events.
- Treating stale UI as resolved without parity checks.
- Closing missions without verification evidence.
