# Native Memory System Implementation Plan

Goal: establish a durable, low-noise, bd-native memory system with explicit retrieval, lineage, and selective enforcement.

## Final Architecture (Phase 1)

Memory uses a layered model:

1. Domain Anchors (open epics)
- Purpose: stable index roots per domain
- Type: `epic`
- Labels: `memory,memory-anchor,<domain>`
- Link style: `bd dep relate <anchor> <memory-node>`

2. Canonical Memory Nodes (closed decisions)
- Purpose: immutable ratified rules/patterns
- Type: `decision`
- Labels: `memory,mem-canonical,mem-hard|mem-soft,<domain>`
- Lifecycle: create -> ratify -> close; evolve with `bd supersede`

3. Execution Contracts (future phase)
- Purpose: temporary blockers for hard constraints only
- Type: `task|decision`
- Labels: `memory-contract,mem-hard`
- Link style: contract blocks active work; contract relates to canonical memory

## Query Model

Domain retrieval:
```bash
bd query "label=memory AND label=mem-canonical AND label=<domain> AND status=closed"
```

Hard constraints only:
```bash
bd query "label=memory AND label=mem-canonical AND label=mem-hard AND status=closed"
```

Attach context to active work:
```bash
bd dep relate <active-id> <memory-id>
```

## Data Contract for Canonical Memory

Title:
- `[MEMORY][<DOMAIN>][HARD|SOFT] <atomic rule sentence>`

Description fields:
- Scope
- Out of Scope
- Rule
- Rationale
- Failure Mode

Acceptance:
- Given/When/Then invariant + concrete verification commands

Metadata JSON:
```json
{
  "memory_version": 1,
  "memory_strength": "hard|soft",
  "domain": "memory-...",
  "effective_date": "YYYY-MM-DD",
  "owner": "team",
  "supersedes": null,
  "superseded_by": null
}
```

## Phase 1 Execution Evidence (2026-03-02)

Tracking bead:
- `beadboard-yz6`

Anchors created:
- `beadboard-76p` `[MEMORY-ANCHOR] Architecture`
- `beadboard-fld` `[MEMORY-ANCHOR] UI/UX`
- `beadboard-nq9` `[MEMORY-ANCHOR] Workflow Protocol`
- `beadboard-5r1` `[MEMORY-ANCHOR] Agent Operations`
- `beadboard-8st` `[MEMORY-ANCHOR] Reliability and Errors`

Canonical memories created and closed:
- `beadboard-116` `[MEMORY][WORKFLOW][HARD] Evidence before completion claims`
- `beadboard-dvp` `[MEMORY][AGENT][SOFT] Parallelize independent work with clear ownership`
- `beadboard-60a` `[MEMORY][ARCH][HARD] Dependencies model execution order, not visual order`
- `beadboard-zas` `[MEMORY][ARCH][HARD] Shared logic for cross-view behavior`
- `beadboard-duo` `[MEMORY][UX][SOFT] User-facing copy must stay simple and explicit`
- `beadboard-6fv` `[MEMORY][RELIABILITY][HARD] Triage stale-state bugs via parity and watcher checks`
- `beadboard-fga` `[MEMORY][RELIABILITY][SOFT] Workarounds require trigger rollback and owner`

Connectivity verified via `bd dep list` on each anchor and `bd query` for canonical closed memory labels.

## Next Phase

1. Add task-start routine in agent protocol:
- query by domain
- relate top relevant memories
- elevate only hard constraints into contract blockers

2. Add lint/guardrail checks:
- active task in a domain must have at least one memory relation
- applicable hard memories must have a contract blocker before completion

3. Add pruning policy:
- promote repeated incidents into canonical decisions
- supersede stale workaround memory nodes
